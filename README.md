**Unterwegs mit dem California**

Statischer Blog (Eleventy), Content-Verwaltung über Decap CMS (/admin). Auth via GitHub OAuth, implementiert als zwei Cloudflare Pages Functions.

**Struktur**
src/
  _includes/base.njk               Grundlayout
  _includes/post.njk               Beitragslayout
  posts/*.md                       Content
  index.njk                        Startseite (Auto-Listing aus posts/)
public/css/styles.css              Design-Tokens & Styles
public/admin/                      Decap CMS (index.html, config.yml)
functions/api/auth.js              OAuth-Start
functions/api/auth/callback.js     OAuth-Callback

Neue Beiträge werden automatisch gelistet, kein manuelles Update von index.njk nötig.

**Development**
npm install
npm run dev   # localhost:8080

/admin funktioniert nur auf der deployten Domain.

**Build**
npm run build   # -> _site

**Zwei Stellen anpassen:**

public/admin/config.yml → base_url
GitHub OAuth App → Homepage/Callback URL
Publishing
