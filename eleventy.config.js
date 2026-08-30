const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "public/css": "css" });
  eleventyConfig.addPassthroughCopy({ "public/images": "images" });
  eleventyConfig.addPassthroughCopy({ "public/admin": "admin" });
  eleventyConfig.addPassthroughCopy("src/favicon.svg");

  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return b.data.datum_sort - a.data.datum_sort;
    });
  });

  eleventyConfig.addCollection("orte", async function (collectionApi) {
    const cachePath = path.join(__dirname, "src/_data/geocache.json");
    let cache = {};
    try {
      cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch (e) {
      cache = {};
    }

    const posts = collectionApi.getFilteredByGlob("src/posts/*.md");
    const orte = [];
    let cacheChanged = false;

    for (const post of posts) {
      const ortName = post.data.ort;
      if (!ortName) continue;

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
          datum: post.data.datum,
          lat: coords.lat,
          lon: coords.lon,
        });
      }
    }

    if (cacheChanged) {
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    }

    return orte;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
  };
};
