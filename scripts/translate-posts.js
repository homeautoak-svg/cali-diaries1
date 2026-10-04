#!/usr/bin/env node
// Übersetzt deutsche Beiträge (src/posts/*.md) per Claude API ins Englische
// (src/en/posts/<gleicher Dateiname>.md). Läuft als GitHub Action nach jedem Push,
// lässt sich aber auch lokal ausführen:  ANTHROPIC_API_KEY=... node scripts/translate-posts.js
//
// Regeln pro deutschem Beitrag:
//  - Englische Fassung fehlt                              -> übersetzen
//  - Englische Fassung von Hand bearbeitet                -> nie anfassen
//  - Englische Fassung automatisch, Original unverändert  -> nichts tun
//  - Englische Fassung automatisch, Original geändert     -> neu übersetzen
//
// Erkannt wird das über zwei Prüfsummen im Frontmatter der englischen Datei:
// source_hash (Stand des deutschen Originals) und translation_hash (Stand der
// automatischen Übersetzung). Weicht translation_hash vom aktuellen Inhalt ab, wurde
// die Datei von Hand bearbeitet. Dieselbe Logik verwendet die Camping-App beim Publish.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const DE_DIR = path.join(ROOT, "src/posts");
const EN_DIR = path.join(ROOT, "src/en/posts");
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Prüfsumme über die übersetzbaren Felder. Muss mit contentHash() in der App
// (camping-diary-backend/server.js) übereinstimmen.
function contentHash({ title, excerpt, tags, body }) {
  const normalized = JSON.stringify([
    String(title || "").trim(),
    String(excerpt || "").trim(),
    (Array.isArray(tags) ? tags : []).map((t) => String(t).trim()),
    String(body || "").trim(),
  ]);
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function readPost(file) {
  const parsed = matter(fs.readFileSync(file, "utf8"));
  return {
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    tags: parsed.data.tags,
    body: parsed.content,
    data: parsed.data,
  };
}

// Schreibt die englische Datei. Strings werden JSON-quotiert, das ist gültiges YAML.
function buildEnglishFile(t, sourceHash) {
  const lines = ["---"];
  lines.push(`title: ${JSON.stringify(t.title)}`);
  lines.push(`excerpt: ${JSON.stringify(t.excerpt || "")}`);
  if (Array.isArray(t.tags) && t.tags.length > 0) {
    lines.push("tags:");
    for (const tag of t.tags) lines.push(`  - ${JSON.stringify(tag)}`);
  }
  lines.push(`source_hash: ${JSON.stringify(sourceHash)}`);
  lines.push(`translation_hash: ${JSON.stringify(contentHash(t))}`);
  lines.push("---", "", String(t.body || "").trim(), "");
  return lines.join("\n");
}

const TRANSLATION_PROMPT = `Translate the following German blog post from our personal camping blog into natural British English. The blog is written by Andy and Sarah, a family from Switzerland, about trips with their VW T7 California campervan ("Cali").

Guidelines:
- Keep the relaxed, personal "we" tone. Write as a native speaker would, not word for word.
- Do not translate names of campsites, places, shops or people (e.g. "TCS Camping Disentis", "Coop", "Lago Maggiore"). Well-known English names may be used (Lake Constance, Zurich).
- Keep all amounts, dates and numbers unchanged; write dates like "7 August 2026" and keep "CHF" and "francs".
- Keep the Markdown structure (paragraphs, headings, links) exactly as it is.
- Do not use em dashes or en dashes.
- Tags are short labels for campsite amenities; translate each one, capitalise the first letter.
- Do not add or omit any information.`;

const TOOL = {
  name: "save_translation",
  description: "Saves the English translation of the blog post.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      excerpt: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      body: { type: "string", description: "Markdown body" },
    },
    required: ["title", "excerpt", "tags", "body"],
  },
};

async function translate(post) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ist nicht gesetzt.");
  const source = JSON.stringify(
    { title: post.title || "", excerpt: post.excerpt || "", tags: post.tags || [], body: String(post.body || "").trim() },
    null,
    2
  );
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 6000,
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: `${TRANSLATION_PROMPT}\n\nGerman post as JSON:\n${source}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const block = (data.content || []).find((b) => b.type === "tool_use");
  if (!block || !block.input || !block.input.title || !block.input.body) {
    throw new Error(`Unvollständige Antwort (stop_reason: ${data.stop_reason})`);
  }
  return block.input;
}

// Entscheidet, ob ein Beitrag (neu) übersetzt werden muss. Rückgabe: Grund oder null.
function translationNeeded(deFile, enFile) {
  if (!fs.existsSync(enFile)) return "fehlt";
  const en = readPost(enFile);
  const { source_hash, translation_hash } = en.data;
  if (!translation_hash || contentHash(en) !== translation_hash) return null; // von Hand bearbeitet
  if (source_hash === contentHash(readPost(deFile))) return null; // aktuell
  return "Original geändert";
}

async function main() {
  fs.mkdirSync(EN_DIR, { recursive: true });
  const files = fs.readdirSync(DE_DIR).filter((f) => f.endsWith(".md"));
  let failed = 0;
  for (const name of files) {
    const deFile = path.join(DE_DIR, name);
    const enFile = path.join(EN_DIR, name);
    const reason = translationNeeded(deFile, enFile);
    if (!reason) continue;
    try {
      const de = readPost(deFile);
      const t = await translate(de);
      fs.writeFileSync(enFile, buildEnglishFile(t, contentHash(de)));
      console.log(`übersetzt (${reason}): ${name}`);
    } catch (e) {
      failed++;
      console.error(`FEHLER bei ${name}: ${e.message}`);
    }
  }
  if (failed) process.exitCode = 1;
}

module.exports = { contentHash, readPost, buildEnglishFile, translationNeeded };

if (require.main === module) main();
