// Gemalte Übersichtskarte aller Trips für /karte/ und /en/map/ (seit 1.8.0), im Stil der
// Lagekarten. Seen und Grenzen aus dem Natural-Earth-Auszug; grosse Seen, an denen wir waren,
// in der genaueren Form aus den OpenStreetMap-Daten der Beiträge (src/_data/osm/).
const fs = require("fs");
const path = require("path");
const pc = require("polygon-clipping");
const { simplify, smoothPath, ringArea, assembleRings, clipLine, ersatz, esc } = require("./lagekarte");

const W = 1000, H = 640;
const OSM_DIR = path.join(__dirname, "..", "src/_data/osm");

// Ländernamen: mehrere mögliche Stellen je Land (alle innerhalb des Landes); gezeichnet wird
// die erste, die ganz im Ausschnitt liegt und keinen Pin verdeckt
const LAENDER = [
  { de: "SCHWEIZ", en: "SWITZERLAND", spots: [[8.05, 46.8], [7.6, 46.95], [8.6, 46.65]] },
  { de: "DEUTSCHLAND", en: "GERMANY", spots: [[9.6, 48.15], [9.15, 47.88], [8.55, 47.85], [10.3, 47.75]] },
  { de: "ITALIEN", en: "ITALY", spots: [[9.35, 45.65], [9.2, 45.88], [8.75, 45.82], [8.3, 45.75]] },
  { de: "ÖSTERREICH", en: "AUSTRIA", spots: [[10.9, 47.25], [10.0, 47.25], [9.85, 47.05]] },
  { de: "FRANKREICH", en: "FRANCE", spots: [[6.3, 47.4], [6.6, 46.2], [6.9, 47.75]] },
  { de: "LIECHTENSTEIN", en: "LIECHTENSTEIN", spots: [] },
];

// Grosse benannte Seen aus allen vorhandenen OSM-Dateien (Ringe in Längen-/Breitengraden)
let osmLakesCache = null;
function osmLakes() {
  if (osmLakesCache) return osmLakesCache;
  const seen = new Map();
  let files = [];
  try { files = fs.readdirSync(OSM_DIR).filter((f) => f.endsWith(".json")); } catch (e) { files = []; }
  for (const f of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(OSM_DIR, f), "utf8")); } catch (e) { continue; }
    for (const el of data.elements) {
      const t = el.tags || {};
      if (el.type !== "relation" || t.natural !== "water" || !t.name || seen.has(t.name)) continue;
      const outer = assembleRings(el.members.filter((m) => m.role !== "inner").map((m) => m.geometry));
      const inner = assembleRings(el.members.filter((m) => m.role === "inner").map((m) => m.geometry));
      if (outer.length) seen.set(t.name, { outer, inner });
    }
  }
  osmLakesCache = [...seen.values()];
  return osmLakesCache;
}

// trips: [{ nr, name, datum, lat, lon, url }], start: { name, lat, lon }
function renderOverview({ trips, start, lang = "de", ariaLabel }) {
  const pts = [...trips, start];
  let w = Math.min(...pts.map((p) => p.lon)), e = Math.max(...pts.map((p) => p.lon));
  let s = Math.min(...pts.map((p) => p.lat)), n = Math.max(...pts.map((p) => p.lat));
  const k = Math.cos((((s + n) / 2) * Math.PI) / 180);
  let spanX = Math.max((e - w) * k, 0.6) * 1.35, spanY = Math.max(n - s, 0.4) * 1.35;
  if (spanX / spanY < W / H) spanX = (spanY * W) / H; else spanY = (spanX * H) / W;
  const cx = (w + e) / 2, cy = (s + n) / 2;
  w = cx - spanX / k / 2; e = cx + spanX / k / 2; s = cy - spanY / 2; n = cy + spanY / 2;
  const P = ([x, y]) => [((x - w) / (e - w)) * W, (1 - (y - s) / (n - s)) * H];
  const f1 = (v) => Math.round(v * 10) / 10;
  const frame = [[[-10, -10], [W + 10, -10], [W + 10, H + 10], [-10, H + 10], [-10, -10]]];
  const inView = (ring) => ring.some(([x, y]) => x > w && x < e && y > s && y < n);

  // Seen: Natural Earth plus genauere OSM-Seen; kleine Flächen weglassen
  const polys = [];
  for (const poly of ersatz().seen) {
    if (!inView(poly[0])) continue;
    const r = poly[0].map(P);
    if (Math.abs(ringArea(r)) > 40) polys.push([r]);
  }
  const holes = [];
  for (const lake of osmLakes()) {
    for (const r of lake.outer) if (inView(r)) polys.push([r.map(P)]);
    for (const r of lake.inner) if (inView(r)) holes.push([r.map(P)]);
  }
  let water = [];
  try {
    const u = polys.length ? pc.union(...polys) : [];
    water = pc.intersection(holes.length ? pc.difference(u, ...holes) : u, frame);
  } catch (err) {
    console.warn("Übersichtskarte: Seen konnten nicht verarbeitet werden:", err.message);
  }
  const waterPath = water
    .map((poly) => poly.filter((r) => Math.abs(ringArea(r)) > 12).map((r) => smoothPath(simplify(r.slice(0, -1), 0.8), true)).join(""))
    .join("");

  const borders = [];
  for (const line of ersatz().grenzen) {
    for (const seg of clipLine(line.map(P), -20, -20, W + 20, H + 20)) borders.push(smoothPath(simplify(seg, 0.8), false));
  }

  // Ländernamen (siehe LAENDER), Pins und Startpunkt freihalten
  const pinBoxes = trips.map((t) => { const [x, y] = P([t.lon, t.lat]); return { x: x - 16, y: y - 36, w: 32, h: 40 }; });
  const [sx, sy] = P([start.lon, start.lat]);
  pinBoxes.push({ x: sx - 10, y: sy - 10, w: 80, h: 34 });
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const laender = LAENDER.map((l) => {
    const name = lang === "en" ? l.en : l.de;
    const half = name.length * 8 + 10; // halbe Textbreite bei 22px mit Sperrung
    for (const spot of l.spots) {
      const [x, y] = P(spot);
      const box = { x: x - half, y: y - 22, w: half * 2, h: 28 };
      if (box.x < 10 || box.x + box.w > W - 10 || box.y < 10 || box.y + box.h > H - 16) continue;
      if (pinBoxes.some((b) => hit(b, box))) continue;
      return `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" class="ov-land">${name}</text>`;
    }
    return "";
  }).join("");

  const [hx, hy] = P([start.lon, start.lat]);
  const routes = trips.map((t) => {
    const [x, y] = P([t.lon, t.lat]);
    const mx = (hx + x) / 2 + (y - hy) * 0.15, my = (hy + y) / 2 - (x - hx) * 0.15;
    return `<path d="M${f1(hx)} ${f1(hy)}Q${f1(mx)} ${f1(my)} ${f1(x)} ${f1(y - 14)}" class="ov-route"/>`;
  }).join("");

  // Pins: nummeriert, verlinkt; ältere zuerst, damit neuere oben liegen
  const pins = trips.map((t) => {
    const [x, y] = P([t.lon, t.lat]);
    return `<a href="${esc(t.url)}" class="ov-pin" data-nr="${t.nr}" aria-label="${t.nr}. ${esc(t.name)}, ${esc(t.datum)}"><g transform="translate(${f1(x)} ${f1(y)})"><g class="ov-pin-body"><ellipse cy="2" rx="8" ry="2.6" fill="#000" opacity=".15"/><path d="M0 0c-10-14-13-19-13-26a13 13 0 0 1 26 0c0 7-3 12-13 26z" class="ov-drop"/><text y="-21.5" text-anchor="middle" class="ov-num">${t.nr}</text></g></g></a>`;
  }).join("");

  return `<svg class="uebersichtskarte" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel || "")}">
<defs>
<filter id="ov-wob"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="4"/></filter>
<filter id="ov-paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.29 0 0 0 0 0.26 0 0 0 0 0.22 0 0 0 0.06 0"/></filter>
<pattern id="ov-waves" width="30" height="12" patternUnits="userSpaceOnUse"><path d="M3 8q4-3.5 8.5 0t8.5 0" fill="none" stroke="#7fa3b3" stroke-width="1" stroke-linecap="round" opacity=".5"/></pattern>
<style>
.uebersichtskarte text{font-family:'Source Sans 3',sans-serif}
.ov-land{font-family:Fraunces,Georgia,serif!important;font-style:italic;font-size:22px;fill:#a89c86;letter-spacing:3px;paint-order:stroke;stroke:#f4ecdd;stroke-width:6px}
.ov-route{fill:none;stroke:#1f3a2e;stroke-width:1.6;stroke-dasharray:5 6;stroke-linecap:round;opacity:.4}
.ov-drop{fill:#c98a3b;stroke:#8f5a1c;stroke-width:1.6;transition:fill .15s}
.ov-num{font-size:11px;font-weight:700;fill:#fff;pointer-events:none}
.ov-start{font-size:14px;font-weight:600;fill:#1f3a2e;paint-order:stroke;stroke:#f4ecdd;stroke-width:4px}
.ov-pin-body{transform-box:fill-box;transform-origin:50% 100%;transition:transform .15s}
.ov-pin:hover .ov-pin-body,.ov-pin.hl .ov-pin-body,.ov-pin:focus-visible .ov-pin-body{transform:scale(1.25)}
.ov-pin:hover .ov-drop,.ov-pin.hl .ov-drop,.ov-pin:focus-visible .ov-drop{fill:#1f3a2e;stroke:#1f3a2e}
.ov-pin:focus{outline:none}
@media (max-width:40rem){.ov-pin-body{transform:scale(1.9)}.ov-pin:hover .ov-pin-body,.ov-pin.hl .ov-pin-body{transform:scale(2.2)}.ov-land{font-size:30px}.ov-start{font-size:24px}}
</style>
</defs>
<rect width="${W}" height="${H}" fill="#f4ecdd"/>
<g fill="none" stroke="#e3d8c3">${[0.12, 0.28, 0.45, 0.62, 0.8, 0.94].map((q, i) => `<path d="M-20 ${f1(H * q)}C${f1(W * 0.25)} ${f1(H * q - 50 + i * 9)} ${f1(W * 0.6)} ${f1(H * q + 40 - i * 7)} ${W + 20} ${f1(H * q - 12)}"/>`).join("")}</g>
<g filter="url(#ov-wob)">
${borders.length ? `<path d="${borders.join("")}" fill="none" stroke="#8a7f6e" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round" opacity=".8"/>` : ""}
${waterPath ? `<path d="${waterPath}" fill="#c4d6dc" stroke="#6f95a6" stroke-width="1.6" fill-rule="evenodd"/><path d="${waterPath}" fill="url(#ov-waves)" fill-rule="evenodd"/>` : ""}
</g>
${laender}
${routes}
<g transform="translate(${f1(hx)} ${f1(hy)})"><circle r="6" fill="#1f3a2e"/><circle r="2.4" fill="#f4ecdd"/></g>
<text x="${f1(hx + 10)}" y="${f1(hy + 20)}" class="ov-start">${esc(start.name)}</text>
${pins}
<g transform="translate(${W - 64} 62)" fill="none" stroke="#4a6b52" stroke-width="1.4"><circle r="22" stroke="#d9d2c1"/><path d="M0-26L5 0L0 26L-5 0Z" fill="#f4ecdd"/><path d="M0-26L5 0L-5 0Z" fill="#4a6b52"/><text y="-31" text-anchor="middle" font-size="12" font-weight="600" fill="#4a6b52" stroke="none">N</text></g>
<rect width="${W}" height="${H}" filter="url(#ov-paper)" pointer-events="none"/>
<text x="${W - 10}" y="${H - 9}" text-anchor="end" style="font-size:10px;fill:#8a7f6e;paint-order:stroke;stroke:#f4ecdd;stroke-width:3px">© OpenStreetMap, Natural Earth</text>
</svg>`;
}

module.exports = { renderOverview };
