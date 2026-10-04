const fs = require("fs");
const path = require("path");
const { default: Image, generateHTML } = require("@11ty/eleventy-img");

// Responsive Bilder: Alle <img src="/images/..."> und og:image-Tags im fertigen
// HTML werden beim Build durch verkleinerte WebP-Versionen mit srcset ersetzt.
// Die Originale bleiben unverändert in public/images (Decap/App laden dorthin hoch).
const IMG_WIDTHS = [480, 960, 1600];
const IMG_EXT = /\.(jpe?g|png|webp)$/i;

function sourcePath(src) {
  if (!src.startsWith("/images/")) return null;
  const file = path.join(__dirname, "public", decodeURIComponent(src));
  return IMG_EXT.test(file) && fs.existsSync(file) ? file : null;
}

// generateHTML escapt die Attribute selbst, daher vorher zurückwandeln
function decodeEntities(str) {
  return str
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) {
    if (m[1].toLowerCase() === "img") continue;
    attrs[m[1]] = m[2] === undefined ? "" : decodeEntities(m[2]);
  }
  return attrs;
}

async function responsiveImg(tag) {
  const attrs = parseAttrs(tag);
  const file = attrs.src && sourcePath(attrs.src);
  if (!file) return tag;
  const meta = await Image(file, {
    widths: IMG_WIDTHS,
    formats: ["webp"],
    outputDir: path.join(__dirname, "_site/img/"),
    urlPath: "/img/",
    sharpWebpOptions: { quality: 78 },
  });
  const eager = "data-eager" in attrs;
  delete attrs.src;
  delete attrs["data-eager"];
  const html = generateHTML(meta, {
    alt: "",
    sizes: "100vw",
    loading: eager ? "eager" : "lazy",
    decoding: "async",
    ...(eager ? { fetchpriority: "high" } : {}),
    ...attrs,
  });
  return html;
}

async function ogImage(src) {
  const file = sourcePath(src);
  if (!file) return src;
  const meta = await Image(file, {
    widths: [1200],
    formats: ["jpeg"],
    outputDir: path.join(__dirname, "_site/img/"),
    urlPath: "/img/",
  });
  return meta.jpeg[0].url;
}

async function replaceAsync(str, regex, fn) {
  const parts = [];
  let last = 0;
  for (const m of str.matchAll(regex)) {
    parts.push(str.slice(last, m.index), await fn(...m));
    last = m.index + m[0].length;
  }
  parts.push(str.slice(last));
  return parts.join("");
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "public/css": "css" });
  eleventyConfig.addPassthroughCopy({ "public/images": "images" });
  eleventyConfig.addPassthroughCopy({ "public/admin": "admin" });
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  eleventyConfig.addTransform("responsive-images", async function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    content = await replaceAsync(content, /<img\b[^>]*>/g, (tag) => responsiveImg(tag));
    content = await replaceAsync(
      content,
      /(<meta (?:property|name)="(?:og|twitter):image" content=")https:\/\/cali-diaries\.ch(\/images\/[^"]+)(")/g,
      async (all, pre, src, post) => pre + "https://cali-diaries.ch" + (await ogImage(src)) + post
    );
    return content;
  });

  // Datumsformate für Sitemap, RSS und strukturierte Daten
  const toDate = (v) => (v instanceof Date ? v : new Date(v));
  eleventyConfig.addFilter("isoDate", (v) => (v ? toDate(v).toISOString().slice(0, 10) : ""));
  eleventyConfig.addFilter("rfc822", (v) => (v ? toDate(v).toUTCString() : ""));
  eleventyConfig.addFilter("setAttr", (obj, key, value) => ({ ...obj, [key]: value }));
  eleventyConfig.addFilter("absoluteUrl", (url, base) => encodeURI(base + url));

  // Betrag im Schweizer Format, z.B. 1234.5 -> 1'234.50
  eleventyConfig.addFilter("chf", (value) =>
    new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))
  );

  // -------------------- Zweisprachigkeit (DE/EN) --------------------
  // Deutsche Beiträge liegen in src/posts/, ihre Übersetzungen unter gleichem Dateinamen in
  // src/en/posts/. Eine englische Datei ohne deutsches Original wird ignoriert.
  const byDatumDesc = (a, b) => b.data.datum_sort - a.data.datum_sort;
  const hasGermanOriginal = (item) =>
    fs.existsSync(path.join(__dirname, "src/posts", path.basename(item.inputPath)));

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/posts/*.md").sort(byDatumDesc)
  );

  eleventyConfig.addCollection("posts_en", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/en/posts/*.md").filter(hasGermanOriginal).sort(byDatumDesc)
  );

  // Gegenstück einer Seite in der anderen Sprache. Feste Seiten sind hier zugeordnet,
  // Beiträge über den Pfad (/posts/x/ <-> /en/posts/x/). Fehlt die Übersetzung, gibt
  // der Filter null zurück; der Sprachumschalter verlinkt dann auf die Startseite.
  const STATIC_PAGES = {
    "/": "/en/",
    "/karte/": "/en/map/",
    "/kontakt/": "/en/contact/",
    "/datenschutz/": "/en/privacy/",
  };
  const STATIC_PAGES_REVERSE = Object.fromEntries(Object.entries(STATIC_PAGES).map(([de, en]) => [en, de]));

  eleventyConfig.addFilter("translationUrl", (url, targetLang, allPages) => {
    if (!url) return null;
    let candidate;
    if (targetLang === "en") {
      candidate = STATIC_PAGES[url] || (url.startsWith("/posts/") ? "/en" + url : null);
    } else {
      candidate = STATIC_PAGES_REVERSE[url] || (url.startsWith("/en/posts/") ? url.slice(3) : null);
    }
    if (!candidate) return null;
    return (allPages || []).some((p) => p.url === candidate) ? candidate : null;
  });

  // Monatskürzel im Anzeigedatum an die Sprache anpassen (z.B. 12-Okt-2026 <-> 12-Oct-2026)
  const MONTHS_DE_EN = { Mär: "Mar", Mai: "May", Okt: "Oct", Dez: "Dec" };
  const MONTHS_EN_DE = { Mar: "Mär", May: "Mai", Oct: "Okt", Dec: "Dez" };
  const datumLang = (datum, lang) => {
    if (!datum) return datum;
    const map = lang === "en" ? MONTHS_DE_EN : MONTHS_EN_DE;
    return String(datum).replace(/-([A-Za-zä]{3})-/, (all, m) => `-${map[m] || m}-`);
  };
  eleventyConfig.addFilter("datumLang", datumLang);

  // Platzhalter-Ort "Daheim" übersetzen, echte Ortsnamen bleiben unverändert
  eleventyConfig.addFilter("ortLang", (ort, lang) =>
    lang === "en" && /^daheim$/i.test(String(ort || "").trim()) ? "At home" : ort
  );

  // Kartendaten: Geokodierung über Nominatim mit persistentem Cache, je Sprache eine Collection
  async function buildOrte(collectionApi, glob, lang) {
    const cachePath = path.join(__dirname, "src/_data/geocache.json");
    let cache = {};
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch (e) {
      cache = {};
    }

    let posts = collectionApi.getFilteredByGlob(glob);
    if (lang === "en") posts = posts.filter(hasGermanOriginal);
    const orte = [];
    let cacheChanged = false;

    for (const post of posts) {
      const ortName = post.data.ort;
      // Beiträge ohne echten Stellplatz (z.B. "Daheim") nicht auf die Karte setzen;
      // einzelne Beiträge lassen sich zusätzlich mit "karte: false" ausblenden.
      if (!ortName || post.data.karte === false || /^daheim$/i.test(ortName.trim())) continue;

      let coords = cache[ortName];

      if (!coords) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(ortName)}`,
            { headers: { "User-Agent": "cali-diaries.ch (Kontakt: info@cali-diaries.ch)" } }
          );
          const json = await res.json();
          if (json[0]) {
            coords = { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
            cache[ortName] = coords;
            cacheChanged = true;
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (e) {
          console.warn(`Geokoding fehlgeschlagen für "${ortName}":`, e.message);
        }
      }

      if (coords) {
        orte.push({
          titel: post.data.title,
          url: post.url,
          ort: ortName,
          datum: datumLang(post.data.datum, lang),
          lat: coords.lat,
          lon: coords.lon,
        });
      }
    }

    if (cacheChanged) {
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    }

    return orte;
  }

  eleventyConfig.addCollection("orte", (collectionApi) => buildOrte(collectionApi, "src/posts/*.md", "de"));
  eleventyConfig.addCollection("orte_en", (collectionApi) => buildOrte(collectionApi, "src/en/posts/*.md", "en"));

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
};
