// Gezeichnete Lagekarte (seit 1.7.0): Ausschnitt, Dateinamen und SVG-Renderer.
// Die Kartendaten kommen aus OpenStreetMap (scripts/fetch-osm.js -> src/_data/osm/),
// als Ersatz aus einem kleinen Natural-Earth-Auszug (src/_data/karte-ersatz.json).

// Darstellung 800 x 480, Ausschnitt 26 km breit
const VIEW = { W: 800, H: 480, spanKm: 26 };

const kmPerDegLon = (lat) => 111.32 * Math.cos((lat * Math.PI) / 180);
const KM_PER_DEG_LAT = 110.57;

// [West, Süd, Ost, Nord] des Ausschnitts; factor > 1 vergrössert ihn (zum Holen der Daten)
function viewBox(lat, lon, factor = 1) {
  const halfW = (VIEW.spanKm / 2) * factor;
  const halfH = ((VIEW.spanKm / 2) * VIEW.H / VIEW.W) * factor;
  const r = (v) => Math.round(v * 1e4) / 1e4;
  return [r(lon - halfW / kmPerDegLon(lat)), r(lat - halfH / KM_PER_DEG_LAT), r(lon + halfW / kmPerDegLon(lat)), r(lat + halfH / KM_PER_DEG_LAT)];
}

const osmFile = (lat, lon) => `${lat}_${lon}.json`;

module.exports = { VIEW, viewBox, osmFile, kmPerDegLon, KM_PER_DEG_LAT };
