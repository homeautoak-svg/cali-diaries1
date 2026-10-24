// Reisedaten pro Beitrag, zur Build-Zeit berechnet und in JSON-Dateien zwischengespeichert:
//  - EUR-Kurs (CHF -> EUR) zum Reisedatum, EZB-Referenzkurs über die Frankfurter-API
//  - Koordinaten des Orts (Nominatim, gleicher Cache wie die Karte)
//  - Fahrdistanz und Fahrzeit ab Zürich (OSRM)
// Schlüssel ist der Dateiname des deutschen Beitrags ohne ".md", damit die englische
// Fassung (gleicher Dateiname) dieselben Werte nutzt. Fällt ein Dienst aus, fehlt der
// Wert einfach und die Seite blendet die betroffene Angabe aus.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { renderMap, osmFile, resolveCoords } = require("../../lib/lagekarte");

const DATA = __dirname;
const POSTS = path.join(__dirname, "..", "posts");
const START = { name: "Zürich", lat: 47.3769, lon: 8.5417 };
const UA = { "User-Agent": "cali-diaries.ch (Kontakt: info@cali-diaries.ch)" };

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
  } catch (e) {
    return {};
  }
}

async function getJson(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const isoDate = (v) => (v instanceof Date ? v : new Date(v)).toISOString().slice(0, 10);

module.exports = async function () {
  const geo = readJson("geocache.json");
  const fx = readJson("fxcache.json");
  const routes = readJson("routecache.json");
  const campsites = readJson("campsites.json");
  const changed = new Set();
  const result = {};

  for (const file of fs.readdirSync(POSTS).filter((f) => f.endsWith(".md"))) {
    const data = matter(fs.readFileSync(path.join(POSTS, file), "utf8")).data;
    const entry = {};

    if (data.datum_sort && (data.preis_nacht || data.kosten_gesamt)) {
      const day = isoDate(data.datum_sort);
      if (!fx[day]) {
        try {
          const json = await getJson(`https://api.frankfurter.dev/v1/${day}?from=CHF&to=EUR`);
          if (json.rates && json.rates.EUR) {
            fx[day] = { rate: json.rates.EUR, date: json.date };
            changed.add("fxcache.json");
          }
        } catch (e) {
          console.warn(`Wechselkurs für ${day} nicht verfügbar:`, e.message);
        }
      }
      if (fx[day]) entry.fx = fx[day];
    }

    const ort = data.ort;
    if (ort && data.karte !== false && !/^daheim$/i.test(String(ort).trim())) {
      if (!geo[ort]) {
        try {
          const json = await getJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(ort)}`);
          if (json[0]) {
            geo[ort] = { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
            changed.add("geocache.json");
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (e) {
          console.warn(`Geokoding fehlgeschlagen für "${ort}":`, e.message);
        }
      }
      const c = geo[ort];
      // Pin, Distanz und Karte beziehen sich auf den Campingplatz selbst, falls bekannt
      const pos = resolveCoords(path.basename(file, ".md"), data, geo, campsites);
      if (c && pos) {
        entry.lat = pos.lat;
        entry.lon = pos.lon;
        entry.posQuelle = pos.quelle;
        const key = `${pos.lat},${pos.lon}`;
        if (!routes[key]) {
          try {
            const json = await getJson(
              `https://router.project-osrm.org/route/v1/driving/${START.lon},${START.lat};${pos.lon},${pos.lat}?overview=false`
            );
            if (json.routes && json.routes[0]) {
              routes[key] = { km: Math.round(json.routes[0].distance / 1000), min: Math.round(json.routes[0].duration / 60) };
              changed.add("routecache.json");
            }
          } catch (e) {
            console.warn(`Route nach "${ort}" nicht verfügbar:`, e.message);
          }
        }
        // Ohne Route zum Platz die Route zum Ort verwenden (wenige km Unterschied)
        const route = routes[key] || routes[`${c.lat},${c.lon}`];
        if (route) Object.assign(entry, route, { start: START.name });

        // Gezeichnete Lagekarte (seit 1.7.0): OSM-Daten aus src/_data/osm/ (zuerst um den Platz,
        // sonst um den Ort; der Ausschnitt ist grösser als die Karte), sonst Ersatzkarte
        if (data.campingplatz) {
          let osm = null;
          for (const f of [osmFile(pos.lat, pos.lon), osmFile(c.lat, c.lon)]) {
            try { osm = JSON.parse(fs.readFileSync(path.join(DATA, "osm", f), "utf8")); break; } catch (e) { osm = null; }
          }
          const km = entry.km ? (entry.km < 100 ? Math.round(entry.km / 5) * 5 : Math.round(entry.km / 10) * 10) : null;
          try {
            entry.karte = renderMap({
              lat: pos.lat, lon: pos.lon, name: data.campingplatz, place: ort, osm, km,
              start: { name: START.name, lat: START.lat, lon: START.lon },
              ariaLabel: `${data.campingplatz}, ${ort}`,
            });
            entry.karteQuelle = osm ? "osm" : "ersatz";
          } catch (e) {
            console.warn(`Lagekarte für "${ort}" fehlgeschlagen:`, e.message);
          }
        }
      }
    }

    result[path.basename(file, ".md")] = entry;
  }

  const files = { "geocache.json": geo, "fxcache.json": fx, "routecache.json": routes };
  for (const f of changed) fs.writeFileSync(path.join(DATA, f), JSON.stringify(files[f], null, 2) + "\n");
  return result;
};
