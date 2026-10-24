// Gezeichnete Lagekarte (seit 1.7.0): Ausschnitt, Dateinamen und SVG-Renderer.
// Die Kartendaten kommen aus OpenStreetMap (scripts/fetch-osm.js -> src/_data/osm/),
// als Ersatz aus einem kleinen Natural-Earth-Auszug (lib/karte-ersatz.json).
const fs = require("fs");
const path = require("path");
const pc = require("polygon-clipping");
const polylabel = require("polylabel").default;

// Darstellung 800 x 480, Ausschnitt 26 km breit (Ersatzkarte 70 km, weil die Daten grob sind)
const VIEW = { W: 800, H: 480, spanKm: 26, spanKmErsatz: 70 };

const kmPerDegLon = (lat) => 111.32 * Math.cos((lat * Math.PI) / 180);
const KM_PER_DEG_LAT = 110.57;

// [West, Süd, Ost, Nord] des Ausschnitts; factor > 1 vergrössert ihn (zum Holen der Daten)
function viewBox(lat, lon, factor = 1, spanKm = VIEW.spanKm) {
  const halfW = (spanKm / 2) * factor;
  const halfH = ((spanKm / 2) * VIEW.H) / VIEW.W * factor;
  const r = (v) => Math.round(v * 1e4) / 1e4;
  return [r(lon - halfW / kmPerDegLon(lat)), r(lat - halfH / KM_PER_DEG_LAT), r(lon + halfW / kmPerDegLon(lat)), r(lat + halfH / KM_PER_DEG_LAT)];
}

const osmFile = (lat, lon) => `${lat}_${lon}.json`;

// Koordinaten aus dem Feld "koordinaten" ("47.6461, 9.19842", z.B. aus Google Maps kopiert)
function parseKoordinaten(v) {
  const m = String(v || "").match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]), lon = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

// Position des Campingplatzes (seit 1.7.1), in dieser Reihenfolge:
// 1. Feld "koordinaten" bzw. "lat"/"lon" im Beitrag (von Hand im CMS oder aus der App)
// 2. in OpenStreetMap gefundener Platz (src/_data/campsites.json, scripts/find-campsites.js)
// 3. geokodierter Ort (src/_data/geocache.json)
function resolveCoords(key, data, geocache, campsites) {
  const own = parseKoordinaten(data.koordinaten) ||
    (data.lat != null && data.lon != null ? parseKoordinaten(`${data.lat},${data.lon}`) : null);
  if (own) return { ...own, quelle: "feld" };
  const found = data.campingplatz && campsites && campsites[key];
  if (found) return { lat: found.lat, lon: found.lon, quelle: "osm" };
  const g = data.ort && geocache && geocache[data.ort];
  return g ? { lat: g.lat, lon: g.lon, quelle: "ort" } : null;
}

// ---------- Geometrie-Hilfen (alles in Pixeln) ----------

// Douglas-Peucker: Punkte ausduennen, solange die Abweichung unter tol Pixel bleibt
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const f1 = (v) => (Math.round(v * 10) / 10).toString();

// Weiche Linie durch die Punkte (Catmull-Rom als kubische Bezierkurven)
function smoothPath(pts, closed) {
  const n = pts.length;
  if (n < 3) return n ? "M" + pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L") + (closed ? "Z" : "") : "";
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + (closed ? "Z" : "");
}

function ringArea(r) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return a / 2;
}

// Wege einer Multipolygon-Relation zu geschlossenen Ringen zusammensetzen
function assembleRings(ways) {
  const pool = ways.filter((w) => w.length > 1).map((w) => w.slice());
  const rings = [];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  while (pool.length) {
    let ring = pool.shift();
    let grown = true;
    while (!same(ring[0], ring[ring.length - 1]) && grown) {
      grown = false;
      for (let i = 0; i < pool.length; i++) {
        const w = pool[i];
        const end = ring[ring.length - 1];
        if (same(end, w[0])) ring = ring.concat(w.slice(1));
        else if (same(end, w[w.length - 1])) ring = ring.concat(w.slice(0, -1).reverse());
        else continue;
        pool.splice(i, 1);
        grown = true;
        break;
      }
    }
    if (ring.length >= 4 && same(ring[0], ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

// Linie auf ein Rechteck zuschneiden (Teilstücke ausserhalb weglassen)
function clipLine(pts, x0, y0, x1, y1) {
  const out = [];
  let cur = [];
  const inside = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (inside(p) || (i > 0 && inside(pts[i - 1])) || (i < pts.length - 1 && inside(pts[i + 1]))) cur.push(p);
    else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Grobe Textbreite für Kollisionsprüfung der Beschriftungen
const textWidth = (s, size) => s.length * size * 0.56;
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

let ersatzCache = null;
function ersatz() {
  if (!ersatzCache) ersatzCache = JSON.parse(fs.readFileSync(path.join(__dirname, "karte-ersatz.json"), "utf8"));
  return ersatzCache;
}

// ---------- Renderer ----------
// opts: { lat, lon, name, place, osm (Daten aus src/_data/osm oder null), start: { name, lat, lon }, km, labels: { lake, osmLink } }
function renderMap(opts) {
  const { lat, lon, name, place, osm, start, km } = opts;
  const { W, H } = VIEW;
  const spanKm = osm ? VIEW.spanKm : VIEW.spanKmErsatz;
  const [w, s, e, n] = viewBox(lat, lon, 1, spanKm);
  const P = ([x, y]) => [((x - w) / (e - w)) * W, (1 - (y - s) / (n - s)) * H];
  const pad = 12;
  const frame = [[[-pad, -pad], [W + pad, -pad], [W + pad, H + pad], [-pad, H + pad], [-pad, -pad]]];
  const minArea = osm ? 40 : 250; // kleine Gewässer weglassen (Pixel²)

  // --- Wasserflächen ---
  const outers = [], inners = [], named = [];
  const addPoly = (outerRings, innerRings, label) => {
    const o = outerRings.map((r) => r.map(P)).filter((r) => Math.abs(ringArea(r)) > minArea);
    if (!o.length) return;
    outers.push(...o.map((r) => [r]));
    inners.push(...innerRings.map((r) => [r.map(P)]));
    if (label) named.push({ label, rings: o });
  };
  if (osm) {
    for (const el of osm.elements) {
      const t = el.tags || {};
      const isWater = t.natural === "water" || t.waterway === "riverbank" || t.landuse === "reservoir";
      if (!isWater) continue;
      if (el.type === "way" && el.geometry.length > 3) {
        const g = el.geometry;
        if (g[0][0] === g[g.length - 1][0] && g[0][1] === g[g.length - 1][1]) addPoly([g], [], t.name);
      } else if (el.type === "relation") {
        const outerWays = el.members.filter((m) => m.role !== "inner").map((m) => m.geometry);
        const innerWays = el.members.filter((m) => m.role === "inner").map((m) => m.geometry);
        addPoly(assembleRings(outerWays), assembleRings(innerWays), t.name);
      }
    }
  } else {
    // nur Seen, die den Ausschnitt berühren
    const mx = (e - w) * 0.1, my = (n - s) * 0.1;
    for (const poly of ersatz().seen) {
      if (poly[0].some(([x, y]) => x > w - mx && x < e + mx && y > s - my && y < n + my)) addPoly([poly[0]], poly.slice(1), null);
    }
  }
  let water = [];
  try {
    const all = outers.length ? pc.union(...outers) : [];
    const holes = inners.length ? pc.union(...inners) : [];
    water = pc.intersection(holes.length ? pc.difference(all, holes) : all, frame);
  } catch (err) {
    console.warn("Lagekarte: Wasserflächen konnten nicht verarbeitet werden:", err.message);
    water = [];
  }
  const tol = osm ? 0.9 : 1.2;
  const waterPath = water
    .map((poly) => poly.map((ring) => smoothPath(simplify(ring.slice(0, -1), tol), true)).join(""))
    .join("");

  // --- Linien: Flüsse und Strassen ---
  const lines = { river: [], major: [], minor: [] };
  const places = [];
  if (osm) {
    for (const el of osm.elements) {
      const t = el.tags || {};
      if (el.type === "node" && t.place && t.name) {
        const [x, y] = P([el.lon, el.lat]);
        if (x > 10 && x < W - 10 && y > 10 && y < H - 10) places.push({ x, y, name: t.name, town: t.place === "town" });
        continue;
      }
      if (el.type !== "way") continue;
      let kind = null;
      if (t.waterway === "river") kind = "river";
      else if (t.highway === "motorway" || t.highway === "trunk" || t.highway === "primary") kind = "major";
      else if (t.highway === "secondary") kind = "minor";
      if (!kind) continue;
      for (const seg of clipLine(el.geometry.map(P), -pad, -pad, W + pad, H + pad)) {
        const simple = simplify(seg, kind === "minor" ? 1.6 : 1.1);
        if (simple.length > 1) lines[kind].push(smoothPath(simple, false));
      }
    }
  }
  const borders = [];
  for (const line of ersatz().grenzen) {
    for (const seg of clipLine(line.map(P), -pad, -pad, W + pad, H + pad)) borders.push(smoothPath(simplify(seg, 1), false));
  }

  // --- Beschriftungen ---
  const [cx, cy] = P([lon, lat]);
  const taken = [];
  const nameSize = 17, placeSize = 13.5;
  const labelW = Math.max(textWidth(name, nameSize), textWidth(place || "", placeSize));
  const labelLeft = cx + 22 + labelW > W - 20;
  const lx = labelLeft ? cx - 22 - labelW : cx + 22;
  taken.push({ x: lx - 4, y: cy - 46, w: labelW + 8, h: 50 }, { x: cx - 18, y: cy - 48, w: 36, h: 52 });

  // Richtung zum Startort (Zürich) am Kartenrand
  let arrow = "";
  if (start && km) {
    const dx = (start.lon - lon) * kmPerDegLon(lat), dy = (start.lat - lat) * KM_PER_DEG_LAT;
    const ang = Math.atan2(-dy, dx);
    const tx = (W / 2 - 70) / Math.abs(Math.cos(ang) || 1e-9), ty = (H / 2 - 44) / Math.abs(Math.sin(ang) || 1e-9);
    const t = Math.min(tx, ty);
    const ax = cx + Math.cos(ang) * t, ay = cy + Math.sin(ang) * t;
    const text = `${start.name} · ${km} km`;
    const bw = textWidth(text, 13) + 26;
    // im mittleren Bereich halten: auf dem Handy wird die Karte links und rechts beschnitten
    const safe = 140;
    const bx = Math.max(safe, Math.min(W - bw - safe, ax - bw / 2)), by = Math.max(10, Math.min(H - 76, ay - 15)); // unten Platz für den Massstab
    taken.push({ x: bx, y: by, w: bw, h: 30 });
    const mx = (cx + ax) / 2 + Math.sin(ang) * 30, my = (cy + ay) / 2 - Math.cos(ang) * 30;
    arrow = `<path class="lk-route" d="M${f1(cx)} ${f1(cy - 30)} Q ${f1(mx)} ${f1(my)} ${f1(bx + bw / 2)} ${f1(by + 15)}"/>
<g><rect x="${f1(bx)}" y="${f1(by)}" width="${f1(bw)}" height="30" rx="15" class="lk-pill"/><text x="${f1(bx + bw / 2)}" y="${f1(by + 20)}" text-anchor="middle" class="lk-pilltext">${esc(text)}</text></g>`;
  }
  taken.push({ x: W - 110, y: 20, w: 90, h: 80 }, { x: 14, y: H - 50, w: 180, h: 40 }); // Nordpfeil, Massstab

  // Seenamen: beste freie Stelle in der grössten benannten Fläche, entlang der Seeachse gedreht
  const lakeLabels = [];
  const seenNames = new Set();
  const inner = [[[20, 20], [W - 20, 20], [W - 20, H - 20], [20, H - 20], [20, 20]]];
  const rectPoly = (b, m) => [[[b.x - m, b.y - m], [b.x + b.w + m, b.y - m], [b.x + b.w + m, b.y + b.h + m], [b.x - m, b.y + b.h + m], [b.x - m, b.y - m]]];
  named
    .map((nm) => ({ ...nm, area: nm.rings.reduce((a, r) => a + Math.abs(ringArea(r)), 0) }))
    .sort((a, b) => b.area - a.area)
    .forEach((nm) => {
      if (seenNames.has(nm.label) || lakeLabels.length >= 2) return;
      let free;
      try {
        const clipped = pc.intersection(nm.rings.map((r) => [r]), inner);
        free = taken.length ? pc.difference(clipped, ...taken.map((b) => rectPoly(b, 6))) : clipped;
      } catch { return; }
      if (!free.length) return;
      const biggest = free.sort((a, b) => Math.abs(ringArea(b[0])) - Math.abs(ringArea(a[0])))[0];
      const pt = polylabel(biggest, 1);
      if (pt.distance < 9) return;
      // Hauptachse des freien Teils (Kovarianz der Randpunkte), Winkel auf ±60° begrenzt
      const pts = biggest[0];
      const mx = pts.reduce((a, q) => a + q[0], 0) / pts.length, my = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      let sxx = 0, syy = 0, sxy = 0;
      for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
      let deg = (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
      if (deg > 90) deg -= 180;
      if (deg < -90) deg += 180;
      const elongated = Math.hypot(sxx - syy, 2 * sxy) > 0.35 * (sxx + syy); // deutlich länger als breit
      deg = elongated ? Math.max(-60, Math.min(60, deg)) : 0;
      const size = 18, tw = textWidth(nm.label, size);
      const rad = (deg * Math.PI) / 180;
      const bw = Math.abs(tw * Math.cos(rad)) + Math.abs(size * Math.sin(rad));
      const bh = Math.abs(tw * Math.sin(rad)) + Math.abs(size * Math.cos(rad));
      const box = { x: pt[0] - bw / 2, y: pt[1] - bh / 2, w: bw, h: bh };
      if (box.x < 8 || box.x + bw > W - 8 || box.y < 8 || box.y + bh > H - 8) return;
      if (taken.some((b) => overlaps(b, box))) return;
      taken.push(box);
      seenNames.add(nm.label);
      lakeLabels.push(`<text x="${f1(pt[0])}" y="${f1(pt[1] + 6)}" text-anchor="middle" class="lk-lake" transform="rotate(${f1(deg)} ${f1(pt[0])} ${f1(pt[1])})">${esc(nm.label)}</text>`);
    });

  // Ortschaften: Städte zuerst, ohne Überschneidungen, höchstens acht
  const placeLabels = [];
  places
    .sort((a, b) => (b.town - a.town))
    .forEach((p) => {
      if (placeLabels.length >= 8) return;
      const size = p.town ? 13 : 11.5;
      const tw = textWidth(p.name, size);
      const box = { x: p.x + 6, y: p.y - size + 2, w: tw + 4, h: size + 4 };
      const dot = { x: p.x - 4, y: p.y - 4, w: 8, h: 8 };
      if (box.x + box.w > W - 6 || taken.some((b) => overlaps(b, box) || overlaps(b, dot))) return;
      taken.push(box, dot);
      placeLabels.push(`<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="${p.town ? 3 : 2.2}" class="lk-dot"/><text x="${f1(p.x + 7)}" y="${f1(p.y + 4)}" class="${p.town ? "lk-town" : "lk-village"}">${esc(p.name)}</text>`);
    });

  const scaleKm = spanKm > 40 ? 20 : 5;
  const scalePx = (scaleKm / spanKm) * W;
  const contours = [0.14, 0.31, 0.5, 0.69, 0.86]
    .map((k, i) => `<path d="M-20 ${f1(H * k)} C ${f1(W * 0.25)} ${f1(H * k - 40 + i * 8)}, ${f1(W * 0.6)} ${f1(H * k + 36 - i * 6)}, ${W + 20} ${f1(H * k - 10)}"/>`)
    .join("");

  return `<svg class="lagekarte" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(opts.ariaLabel || name)}">
<defs>
<filter id="lk-wob" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="${osm ? 3.5 : 5}"/></filter>
<filter id="lk-paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0.29 0 0 0 0 0.26 0 0 0 0 0.22 0 0 0 0.06 0"/></filter>
<pattern id="lk-waves" width="34" height="14" patternUnits="userSpaceOnUse"><path d="M3 9q5-4 10 0t10 0" fill="none" stroke="#7fa3b3" stroke-width="1.1" stroke-linecap="round" opacity="0.5"/></pattern>
<style>
.lagekarte text{font-family:'Source Sans 3',sans-serif}
.lk-contour{fill:none;stroke:#e3d8c3;stroke-width:1}
.lk-border{fill:none;stroke:#8a7f6e;stroke-width:1.4;stroke-dasharray:2 6;stroke-linecap:round;opacity:.75}
.lk-major{fill:none;stroke:#d6c8ae;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.lk-minor{fill:none;stroke:#ddd1bb;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round}
.lk-river{fill:none;stroke:#8fb0bd;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.lk-water{fill:#c4d6dc;stroke:#6f95a6;stroke-width:1.8;stroke-linejoin:round}
.lk-shore{fill:none;stroke:#6f95a6;stroke-width:.8;opacity:.45}
.lk-lake{font-family:Fraunces,Georgia,serif!important;font-style:italic;font-size:18px;fill:#4f7486;letter-spacing:.5px}
.lk-dot{fill:#8a7f6e}
.lk-town{font-size:13px;fill:#4a4237;font-weight:600;paint-order:stroke;stroke:#f4ecdd;stroke-width:4px}
.lk-village{font-size:11.5px;fill:#6b6152;paint-order:stroke;stroke:#f4ecdd;stroke-width:4px}
.lk-route{fill:none;stroke:#1f3a2e;stroke-width:2.2;stroke-dasharray:7 7;stroke-linecap:round;opacity:.7}
.lk-pill{fill:#fff;stroke:#d9d2c1}
.lk-pilltext{font-size:13px;font-weight:600;fill:#1f3a2e}
.lk-name{font-size:17px;font-weight:600;fill:#1f3a2e;paint-order:stroke;stroke:#f4ecdd;stroke-width:5px}
.lk-place{font-size:13.5px;fill:#4a6b52;paint-order:stroke;stroke:#f4ecdd;stroke-width:5px}
.lk-scale{font-size:12px;fill:#4a6b52}
</style>
</defs>
<rect width="${W}" height="${H}" fill="#f4ecdd"/>
<g class="lk-contour">${contours}</g>
<g filter="url(#lk-wob)">
${borders.length ? `<path class="lk-border" d="${borders.join("")}"/>` : ""}
${lines.minor.length ? `<path class="lk-minor" d="${lines.minor.join("")}"/>` : ""}
${lines.major.length ? `<path class="lk-major" d="${lines.major.join("")}"/>` : ""}
${lines.river.length ? `<path class="lk-river" d="${lines.river.join("")}"/>` : ""}
${waterPath ? `<path class="lk-water" fill-rule="evenodd" d="${waterPath}"/><path fill="url(#lk-waves)" fill-rule="evenodd" d="${waterPath}"/><path class="lk-shore" d="${waterPath}" transform="translate(3 2)"/>` : ""}
</g>
${lakeLabels.join("")}
${placeLabels.join("")}
${arrow}
<g transform="translate(${f1(cx)} ${f1(cy)})"><ellipse cy="2" rx="9" ry="3" fill="#000" opacity=".15"/><path d="M0 0c-11-16-15-22-15-30a15 15 0 0 1 30 0c0 8-4 14-15 30z" fill="#c98a3b" stroke="#8f5a1c" stroke-width="1.8"/><circle cy="-30" r="5.5" fill="#fff"/></g>
<text x="${f1(lx)}" y="${f1(cy - 24)}" class="lk-name">${esc(name)}</text>
${place ? `<text x="${f1(lx)}" y="${f1(cy - 5)}" class="lk-place">${esc(place)}</text>` : ""}
<g transform="translate(${W - 64} 58)" fill="none" stroke="#4a6b52" stroke-width="1.4"><circle r="22" stroke="#d9d2c1"/><path d="M0-26L5 0L0 26L-5 0Z" fill="#f4ecdd"/><path d="M0-26L5 0L-5 0Z" fill="#4a6b52"/><text y="-31" text-anchor="middle" class="lk-scale" stroke="none" font-weight="600">N</text></g>
<g transform="translate(24 ${H - 24})"><path d="M0 0h${f1(scalePx)}M0-5v10M${f1(scalePx)}-5v10" stroke="#4a6b52" stroke-width="1.6" fill="none"/><text x="${f1(scalePx / 2)}" y="-9" text-anchor="middle" class="lk-scale">${scaleKm} km</text></g>
<rect width="${W}" height="${H}" filter="url(#lk-paper)"/>
</svg>`;
}

module.exports = { VIEW, viewBox, osmFile, parseKoordinaten, resolveCoords, kmPerDegLon, KM_PER_DEG_LAT, renderMap };
