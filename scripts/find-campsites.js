// Sucht für jeden Reisebericht den Campingplatz in OpenStreetMap (tourism=camp_site) und legt
// dessen Koordinaten in src/_data/campsites.json ab. Gesucht wird im Umkreis von 15 km um den
// geokodierten Ort; bevorzugt wird der Platz, dessen Name am besten zum Feld "campingplatz"
// passt. Beiträge mit eigenem Feld "koordinaten" werden übersprungen. Bereits gefundene
// Plätze werden nicht neu gesucht. Aufruf: node scripts/find-campsites.js
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const POSTS = path.join(ROOT, "src/posts");
const GEOCACHE = path.join(ROOT, "src/_data/geocache.json");
const OUT = path.join(ROOT, "src/_data/campsites.json");
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const UA = "cali-diaries.ch (Kontakt: info@cali-diaries.ch)";
const RADIUS_M = 15000;

// Namen vergleichbar machen: Kleinbuchstaben, Umlaute, Füllwörter weg
const STOP = new Set(["camping", "campingplatz", "campeggio", "camp", "platz", "tcs", "de", "di", "d", "la", "le", "am", "im", "an", "der", "die", "das", "und"]);
function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}
function similarity(a, b) {
  const ta = new Set(tokens(a)), tb = new Set(tokens(b));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t) || [...tb].some((u) => u.length > 3 && (u.startsWith(t) || t.startsWith(u)))) common++;
  return common / Math.min(ta.size, tb.size);
}
function distanceKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function overpass(q) {
  let lastError;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: "data=" + encodeURIComponent(q),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
      if (process.env.GITHUB_ACTIONS) console.log(`::warning::Overpass ${new URL(url).host}: ${e.message}`);
    }
  }
  throw lastError;
}

async function main() {
  const geocache = JSON.parse(fs.readFileSync(GEOCACHE, "utf8"));
  let found = {};
  try { found = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) { found = {}; }

  // Alle noch offenen Beiträge sammeln und in einer einzigen Overpass-Anfrage suchen
  const todo = [];
  for (const file of fs.readdirSync(POSTS).filter((f) => f.endsWith(".md"))) {
    const key = path.basename(file, ".md");
    const data = matter(fs.readFileSync(path.join(POSTS, file), "utf8")).data;
    if (!data.campingplatz || !data.ort || data.koordinaten || found[key]) continue;
    const c = geocache[data.ort];
    if (!c) { console.warn(`Keine Koordinaten für "${data.ort}" (${file})`); continue; }
    todo.push({ key, data, c });
  }
  if (!todo.length) { console.log("Keine offenen Campingplätze."); return; }

  const parts = todo.map(({ c }) => `nwr["tourism"="camp_site"](around:${RADIUS_M},${c.lat},${c.lon});`).join("");
  console.log(`Suche ${todo.length} Campingplätze in einer Anfrage`);
  let json;
  for (let attempt = 1; attempt <= 3 && !json; attempt++) {
    try {
      json = await overpass(`[out:json][timeout:50];(${parts});out center tags;`);
    } catch (e) {
      console.warn(`  Versuch ${attempt} fehlgeschlagen: ${e.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 20000));
    }
  }
  if (!json) return;

  const all = json.elements
    .map((el) => {
      const pos = el.type === "node" ? { lat: el.lat, lon: el.lon } : el.center;
      return pos ? { name: (el.tags && el.tags.name) || "", lat: Math.round(pos.lat * 1e5) / 1e5, lon: Math.round(pos.lon * 1e5) / 1e5, osm: `${el.type}/${el.id}` } : null;
    })
    .filter(Boolean);

  for (const { key, data, c } of todo) {
    const candidates = all
      .map((x) => ({ ...x, km: Math.round(distanceKm(c, x) * 10) / 10, score: Math.round(similarity(data.campingplatz, x.name) * 100) / 100 }))
      .filter((x) => x.km <= RADIUS_M / 1000);
    // Bester Namenstreffer; ohne brauchbaren Namen der nächstgelegene Platz (als unsicher markiert)
    const byName = candidates.filter((x) => x.score >= 0.5).sort((a, b) => b.score - a.score || a.km - b.km);
    const nearest = candidates.slice().sort((a, b) => a.km - b.km);
    const pick = byName[0] || nearest[0];
    if (!pick) { console.warn(`  ${data.campingplatz}: kein Campingplatz gefunden`); continue; }
    found[key] = {
      lat: pick.lat,
      lon: pick.lon,
      osmName: pick.name,
      osm: pick.osm,
      kmVomOrt: pick.km,
      treffer: byName[0] ? "name" : "naechster",
      alternativen: nearest.filter((x) => x.osm !== pick.osm).slice(0, 3).map((x) => `${x.name || "(ohne Namen)"} (${x.km} km)`),
    };
    const msg = `${data.campingplatz} -> ${pick.name || "(ohne Namen)"}, ${pick.km} km vom Ort, Treffer: ${found[key].treffer}`;
    console.log(process.env.GITHUB_ACTIONS ? `::notice::${msg}` : `  ${msg}`);
  }
  fs.writeFileSync(OUT, JSON.stringify(found, null, 2) + "\n");
}

main().catch((e) => {
  console.error("Campingplatz-Suche fehlgeschlagen:", e.message);
  process.exit(0);
});
