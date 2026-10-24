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
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
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
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function main() {
  const geocache = JSON.parse(fs.readFileSync(GEOCACHE, "utf8"));
  let found = {};
  try { found = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) { found = {}; }
  let changed = false;

  for (const file of fs.readdirSync(POSTS).filter((f) => f.endsWith(".md"))) {
    const key = path.basename(file, ".md");
    const data = matter(fs.readFileSync(path.join(POSTS, file), "utf8")).data;
    if (!data.campingplatz || !data.ort || data.koordinaten || found[key]) continue;
    const c = geocache[data.ort];
    if (!c) { console.warn(`Keine Koordinaten für "${data.ort}" (${file})`); continue; }

    console.log(`Suche "${data.campingplatz}" um ${data.ort}`);
    let json;
    for (let attempt = 1; attempt <= 3 && !json; attempt++) {
      try {
        json = await overpass(`[out:json][timeout:40];nwr["tourism"="camp_site"](around:${RADIUS_M},${c.lat},${c.lon});out center tags;`);
      } catch (e) {
        console.warn(`  Versuch ${attempt} fehlgeschlagen: ${e.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 15000 * attempt));
      }
    }
    if (!json) continue;

    const candidates = json.elements
      .map((el) => {
        const pos = el.type === "node" ? { lat: el.lat, lon: el.lon } : el.center;
        if (!pos) return null;
        const name = (el.tags && el.tags.name) || "";
        return {
          name,
          lat: Math.round(pos.lat * 1e5) / 1e5,
          lon: Math.round(pos.lon * 1e5) / 1e5,
          osm: `${el.type}/${el.id}`,
          km: Math.round(distanceKm(c, pos) * 10) / 10,
          score: Math.round(similarity(data.campingplatz, name) * 100) / 100,
        };
      })
      .filter(Boolean);

    // Bester Namenstreffer; ohne brauchbaren Namen der nächstgelegene Platz (als unsicher markiert)
    const byName = candidates.filter((x) => x.score >= 0.5).sort((a, b) => b.score - a.score || a.km - b.km);
    const nearest = candidates.slice().sort((a, b) => a.km - b.km);
    const pick = byName[0] || nearest[0];
    if (!pick) { console.warn("  Kein Campingplatz gefunden"); continue; }
    found[key] = {
      lat: pick.lat,
      lon: pick.lon,
      osmName: pick.name,
      osm: pick.osm,
      kmVomOrt: pick.km,
      treffer: byName[0] ? "name" : "naechster",
      alternativen: nearest.filter((x) => x.osm !== pick.osm).slice(0, 3).map((x) => `${x.name || "(ohne Namen)"} (${x.km} km)`),
    };
    changed = true;
    console.log(`  -> ${pick.name || "(ohne Namen)"}, ${pick.km} km vom Ort, Treffer: ${found[key].treffer}`);
    await new Promise((r) => setTimeout(r, 6000));
  }
  if (changed) fs.writeFileSync(OUT, JSON.stringify(found, null, 2) + "\n");
}

main().catch((e) => {
  console.error("Campingplatz-Suche fehlgeschlagen:", e.message);
  process.exit(0);
});
