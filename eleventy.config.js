const fs = require("fs");
const path = require("path");
const { default: Image, generateHTML } = require("@11ty/eleventy-img");
const { resolveCoords } = require("./lib/lagekarte");

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

  // CHF-Betrag zum gespeicherten Kurs in EUR umrechnen (Kurs aus src/_data/reise.js)
  eleventyConfig.addFilter("eur", (value, rate) =>
    new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) * Number(rate))
  );

  // Dezimalzahl je Sprache (4.5 -> "4,5" auf Deutsch)
  eleventyConfig.addFilter("dezimal", (value, lang) => {
    const s = Number(value).toFixed(1);
    return lang === "en" ? s : s.replace(".", ",");
  });

  // Fotos für die Galerie: alle Fotos ausser dem Titelbild, nur die Pfade
  eleventyConfig.addFilter("galerieFotos", (fotos, hero) =>
    (fotos || []).map((f) => (typeof f === "string" ? f : f && f.foto)).filter((src) => src && src !== hero)
  );

  // ISO-Datum 2026-09-25 -> 25.09.2026
  eleventyConfig.addFilter("datumPunkt", (iso) => String(iso || "").split("-").reverse().join("."));

  // Dateiname eines Beitrags ohne Endung, Schlüssel für die Reisedaten
  eleventyConfig.addFilter("postKey", (inputPath) => path.basename(inputPath || "", ".md"));

  // Monatsname aus Datum (Date) oder Monatszahl 1-12
  const MONTHS = {
    de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  };
  eleventyConfig.addFilter("monat", (value, lang) => {
    const i =
      value instanceof Date ? value.getUTCMonth() : /^\d{1,2}$/.test(String(value)) ? Number(value) - 1 : new Date(value).getUTCMonth();
    return (MONTHS[lang] || MONTHS.de)[i] || "";
  });
  eleventyConfig.addFilter("jahr", (value) => (value instanceof Date ? value : new Date(value)).getUTCFullYear());

  // Fahrdistanz und -zeit gerundet, damit keine Scheingenauigkeit entsteht
  eleventyConfig.addFilter("rundeKm", (km) => (km < 100 ? Math.round(km / 5) * 5 : Math.round(km / 10) * 10));
  eleventyConfig.addFilter("fahrzeit", (min) => {
    const m = Math.max(15, Math.round(min / 15) * 15);
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return h ? `${h} h${rest ? " " + rest + " min" : ""}` : `${rest} min`;
  });

  // -------------------- Merkmale (Ausstattungs-Tags) --------------------
  // Tags werden über src/_data/merkmale.json vereinheitlicht ("ruhig", "Ruhig" und
  // "Quiet" sind dasselbe Merkmal). Unbekannte Tags bekommen eine eigene Seite mit
  // ihrem Namen. Die Beitragsdateien selbst bleiben unverändert.
  const MERKMALE = require("./src/_data/merkmale.json");
  const slugify = (s) =>
    String(s)
      .toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const MERKMAL_INDEX = new Map();
  for (const m of MERKMALE) {
    for (const name of [m.key, m.de, m.en, ...(m.aliases || [])]) MERKMAL_INDEX.set(String(name).toLowerCase().trim(), m);
  }
  const merkmal = (tag, lang) => {
    const m = MERKMAL_INDEX.get(String(tag).toLowerCase().trim());
    if (m) {
      const slug = lang === "en" ? m.slugEn : m.slugDe;
      return {
        key: m.key,
        slug,
        label: lang === "en" ? m.en : m.de,
        intro: lang === "en" ? m.introEn : m.introDe,
        title: lang === "en" ? m.titleEn : m.titleDe,
        url: lang === "en" ? `/en/feature/${slug}/` : `/merkmal/${slug}/`,
      };
    }
    const label = String(tag).trim();
    const slug = slugify(label);
    return {
      key: slug,
      slug,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      url: lang === "en" ? `/en/feature/${slug}/` : `/merkmal/${slug}/`,
    };
  };
  eleventyConfig.addFilter("merkmal", merkmal);

  // Reiseberichte: Beiträge mit Campingplatz
  const isTrip = (item) => !!item.data.campingplatz;
  eleventyConfig.addCollection("trips", (api) => api.getFilteredByGlob("src/posts/*.md").filter(isTrip).sort(byDatumDesc));
  eleventyConfig.addCollection("trips_en", (api) =>
    api.getFilteredByGlob("src/en/posts/*.md").filter(hasGermanOriginal).filter(isTrip).sort(byDatumDesc)
  );

  // Startseite: "blog" = Rubrik "Rund um den Blog", "trips" = alle übrigen ohne den Aufmacher
  eleventyConfig.addFilter("rubrik", (posts, which, featured) =>
    (posts || []).filter((p) =>
      which === "blog" ? p.data.rubrik === "blog" : p.data.rubrik !== "blog" && (!featured || p.url !== featured.url)
    )
  );

  // Länder der Reiseberichte in Reihenfolge des ersten Besuchs (neueste zuerst)
  eleventyConfig.addFilter("laender", (trips) => [...new Set((trips || []).map((p) => p.data.land).filter(Boolean))]);

  // Kennzahlen für die Startseite
  eleventyConfig.addFilter("tripStats", (trips) => {
    const list = trips || [];
    return {
      trips: list.length,
      nights: list.reduce((sum, p) => sum + (Number(p.data.naechte) || 0), 0),
      countries: new Set(list.map((p) => p.data.land).filter(Boolean)).size,
      campsites: new Set(list.map((p) => String(p.data.campingplatz).trim().toLowerCase())).size,
    };
  });

  // Merkmal-Seiten: ein Eintrag pro verwendetem Merkmal mit den passenden Reiseberichten
  function buildMerkmale(trips, lang) {
    const map = new Map();
    for (const post of trips) {
      for (const tag of post.data.tags || []) {
        const m = merkmal(tag, lang);
        if (!map.has(m.slug)) map.set(m.slug, { ...m, posts: [] });
        const entry = map.get(m.slug);
        if (!entry.posts.includes(post)) entry.posts.push(post);
      }
    }
    return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label));
  }
  eleventyConfig.addCollection("merkmale", (api) =>
    buildMerkmale(api.getFilteredByGlob("src/posts/*.md").filter(isTrip).sort(byDatumDesc), "de")
  );
  eleventyConfig.addCollection("merkmale_en", (api) =>
    buildMerkmale(api.getFilteredByGlob("src/en/posts/*.md").filter(hasGermanOriginal).filter(isTrip).sort(byDatumDesc), "en")
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
    "/campingplaetze/": "/en/campsites/",
  };
  for (const m of MERKMALE) STATIC_PAGES[`/merkmal/${m.slugDe}/`] = `/en/feature/${m.slugEn}/`;
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

      // Pin auf den Campingplatz selbst, falls bekannt (seit 1.7.1, siehe lib/lagekarte.js)
      if (coords) {
        let campsites = {};
        try { campsites = JSON.parse(fs.readFileSync(path.join(__dirname, "src/_data/campsites.json"), "utf8")); } catch (e) { campsites = {}; }
        const pos = resolveCoords(path.basename(post.inputPath, ".md"), post.data, cache, campsites);
        if (pos) coords = { lat: pos.lat, lon: pos.lon };
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
