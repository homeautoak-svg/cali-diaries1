// Englische Beiträge: Eine Datei hier ist die Übersetzung der gleichnamigen Datei in
// src/posts/. Sie enthält nur die übersetzbaren Felder (title, excerpt, tags, Text).
// Alle sprachunabhängigen Felder (Fotos, Datum, Ort, Kosten ...) werden zur Build-Zeit
// aus dem deutschen Original übernommen, damit sie nur an einer Stelle gepflegt werden.
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const SHARED_FIELDS = [
  "campingplatz",
  "ort",
  "datum",
  "datum_sort",
  "naechte",
  "kosten_gesamt",
  "hero_bild",
  "fotos",
  "karte",
];

const cache = new Map();

function germanData(data) {
  const file = path.join(__dirname, "..", "..", "posts", path.basename(data.page.inputPath));
  if (!fs.existsSync(file)) return {};
  // Schlüssel mit Änderungszeit, damit "npm run dev" Änderungen am Original sofort übernimmt
  const key = `${file}:${fs.statSync(file).mtimeMs}`;
  if (!cache.has(key)) cache.set(key, matter(fs.readFileSync(file, "utf8")).data);
  return cache.get(key);
}

module.exports = {
  layout: "post.njk",
  eleventyComputed: Object.fromEntries(
    // Bewusst immer aus dem Original: Eleventy liefert für ein berechnetes Feld beim
    // Selbstbezug (data[key]) nur einen leeren Platzhalter, nicht den Frontmatter-Wert.
    SHARED_FIELDS.map((key) => [key, (data) => germanData(data)[key]])
  ),
};
