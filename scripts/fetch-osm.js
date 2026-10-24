// Holt pro Campingplatz die Kartendaten für die gezeichnete Lagekarte aus OpenStreetMap
// (Overpass API) und legt sie in src/_data/osm/ ab. Läuft in der GitHub Action nach neuen
// Beiträgen, damit der Cloudflare-Build nicht auf Overpass angewiesen ist. Bestehende Dateien
// werden nicht neu geholt.
//
// Aufruf: node scripts/fetch-osm.js
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { viewBox, osmFile } = require("../lib/lagekarte");

const ROOT = path.join(__dirname, "..");
const POSTS = path.join(ROOT, "src/posts");
const GEOCACHE = path.join(ROOT, "src/_data/geocache.json");
const OUT = path.join(ROOT, "src/_data/osm");
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const UA = "cali-diaries.ch (Kontakt: info@cali-diaries.ch)";

const round = (v) => Math.round(v * 1e5) / 1e5;
const geom = (g) => (g || []).map((p) => [round(p.lon), round(p.lat)]);

function query([w, s, e, n]) {
  const b = `${s},${w},${n},${e}`;
  return `[out:json][timeout:60];
(
  way["natural"="water"](${b});
  relation["natural"="water"](${b});
  way["waterway"="riverbank"](${b});
  way["landuse"="reservoir"](${b});
  way["waterway"="river"](${b});
  way["highway"~"^(motorway|trunk|primary|secondary)$"](${b});
  node["place"~"^(town|village)$"](${b});
);
out geom qt;`;
}

async function overpass(q) {
  let lastError;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: "data=" + encodeURIComponent(q),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// Nur die Felder speichern, die der Renderer braucht
function compact(el) {
  const t = el.tags || {};
  const tags = {};
  for (const k of ["name", "natural", "water", "waterway", "landuse", "highway", "place"]) if (t[k]) tags[k] = t[k];
  if (el.type === "node") return { type: "node", tags, lon: round(el.lon), lat: round(el.lat) };
  if (el.type === "way") return { type: "way", tags, geometry: geom(el.geometry) };
  return {
    type: "relation",
    tags,
    members: (el.members || []).filter((m) => m.type === "way" && m.geometry).map((m) => ({ role: m.role, geometry: geom(m.geometry) })),
  };
}

async function main() {
  const geocache = JSON.parse(fs.readFileSync(GEOCACHE, "utf8"));
  fs.mkdirSync(OUT, { recursive: true });
  let fetched = 0;
  for (const file of fs.readdirSync(POSTS).filter((f) => f.endsWith(".md"))) {
    const data = matter(fs.readFileSync(path.join(POSTS, file), "utf8")).data;
    if (!data.campingplatz || !data.ort || data.karte === false) continue;
    const c = geocache[data.ort];
    if (!c) { console.warn(`Keine Koordinaten für "${data.ort}" (${file})`); continue; }
    const target = path.join(OUT, osmFile(c.lat, c.lon));
    if (fs.existsSync(target)) continue;
    const bbox = viewBox(c.lat, c.lon, 1.25);
    console.log(`Hole OSM-Daten für ${data.campingplatz} (${data.ort})`);
    // Bis zu drei Versuche mit wachsender Pause (Overpass begrenzt die Anfragen pro Minute)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const json = await overpass(query(bbox));
        const out = { fetched: new Date().toISOString().slice(0, 10), bbox, elements: json.elements.map(compact) };
        fs.writeFileSync(target, JSON.stringify(out));
        console.log(`  ${out.elements.length} Elemente, ${(fs.statSync(target).size / 1024).toFixed(0)} KB`);
        fetched++;
        break;
      } catch (e) {
        console.warn(`  Versuch ${attempt} fehlgeschlagen: ${e.message}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 20000 * attempt));
      }
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
  console.log(`Fertig, ${fetched} Orte neu geholt.`);
}

main().catch((e) => {
  console.error("OSM-Daten konnten nicht geholt werden:", e.message);
  process.exit(0); // kein Abbruch der Action, die Karte nutzt dann die Ersatzdaten
});
