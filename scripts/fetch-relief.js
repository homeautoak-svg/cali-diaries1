// Holt einmalig Höhendaten für die Übersichtskarte (seit 1.9.0) und legt Höhenstufen als
// Polygone in src/_data/relief.json ab. Quelle: Terrain Tiles auf AWS (Terrarium-Format,
// frei nutzbar), Zoomstufe 7 (rund 1 km pro Pixel). Läuft in der GitHub Action, weil der
// Build auf Cloudflare nicht auf den Dienst angewiesen sein soll. Ist die Datei schon da,
// passiert nichts; zum Neuberechnen die Datei löschen.
//
// Aufruf: node scripts/fetch-relief.js
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const OUT = path.join(__dirname, "..", "src/_data/relief.json");
const BBOX = [5.5, 43.8, 14.5, 48.6]; // wie der Natural-Earth-Auszug in lib/karte-ersatz.json
const Z = 7;
const STUFEN = [1000, 2000];
const URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const lon2x = (lon) => ((lon + 180) / 360) * 2 ** Z;
const lat2y = (lat) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** Z;
const x2lon = (x) => (x / 2 ** Z) * 360 - 180;
const y2lat = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** Z))) * 180) / Math.PI;

async function tile(x, y) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(URL(Z, x, y), { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return PNG.sync.read(Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

// Douglas-Peucker für einen geschlossenen Ring (erster Punkt bleibt fest)
function simplify(pts, tol) {
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const far = Math.floor(pts.length / 2);
  keep[far] = 1;
  const stack = [[0, far], [far, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const area = (r) => r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2;

async function main() {
  if (fs.existsSync(OUT)) { console.log("relief.json vorhanden, nichts zu tun."); return; }
  const { contours } = await import("d3-contour");
  const x0 = Math.floor(lon2x(BBOX[0])), x1 = Math.floor(lon2x(BBOX[2]));
  const y0 = Math.floor(lat2y(BBOX[3])), y1 = Math.floor(lat2y(BBOX[1]));
  const cols = (x1 - x0 + 1) * 256, rows = (y1 - y0 + 1) * 256;
  const full = new Float32Array(cols * rows);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const png = await tile(tx, ty);
      for (let py = 0; py < 256; py++) {
        for (let px = 0; px < 256; px++) {
          const i = (py * 256 + px) * 4;
          const h = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768;
          full[((ty - y0) * 256 + py) * cols + (tx - x0) * 256 + px] = Math.max(h, 0);
        }
      }
      console.log(`Kachel ${Z}/${tx}/${ty}`);
    }
  }
  // Auf halbe Auflösung mitteln und leicht weichzeichnen, damit die Ränder ruhig werden
  const f = 2, w = cols / f, h = rows / f;
  let grid = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) s += full[(y * f + dy) * cols + x * f + dx];
    grid[y * w + x] = s / (f * f);
  }
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) { s += grid[yy * w + xx]; n++; }
      }
      out[y * w + x] = s / n;
    }
    grid = out;
  }
  const toLonLat = ([gx, gy]) => [
    Math.round(x2lon(x0 + (gx * f) / 256) * 1000) / 1000,
    Math.round(y2lat(y0 + (gy * f) / 256) * 1000) / 1000,
  ];
  const result = { quelle: "Terrain Tiles (AWS Open Data, Terrarium), Zoom 7", bbox: BBOX, stufen: {} };
  for (const c of contours().size([w, h]).thresholds(STUFEN)(Array.from(grid))) {
    const polys = [];
    for (const poly of c.coordinates) {
      // erster Ring ist die Aussenkante, weitere sind Löcher (Täler unter der Höhenstufe)
      const rings = poly.map((ring) => simplify(ring.slice(0, -1), 0.6).map(toLonLat));
      const ok = (r) => r.length >= 4 && Math.abs(area(r)) > 0.0015;
      if (ok(rings[0])) polys.push([rings[0], ...rings.slice(1).filter(ok)]);
    }
    result.stufen[c.value] = polys;
    console.log(`${c.value} m: ${polys.length} Flächen`);
  }
  fs.writeFileSync(OUT, JSON.stringify(result));
  console.log(`relief.json geschrieben, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
}

main().catch((e) => {
  console.error("Höhendaten konnten nicht geholt werden:", e.message);
  process.exit(0); // die Karte erscheint dann ohne Höhenstufen
});
