# Unterwegs mit dem California — Blog

Statischer Blog (Eleventy), Inhalte als Markdown, Bearbeitung über Decap CMS
unter `/admin`. Login läuft über GitHub, vermittelt durch zwei kleine
Cloudflare Pages Functions (kein externer Cloud-Dienst nötig).

## Struktur

```
src/
  _includes/base.njk      Grundlayout (Header)
  _includes/post.njk      Layout für einzelne Beitragsseiten
  posts/*.md               Ein Beitrag = eine Markdown-Datei
  index.njk                 Startseite, listet alle Beiträge automatisch auf
public/css/styles.css       Design-Tokens und Stylesheet
public/admin/                Decap-CMS-Oberfläche (index.html, config.yml)
functions/api/auth.js        Startet den GitHub-Login
functions/api/auth/callback.js  Verarbeitet die GitHub-Antwort
```

Ein neuer Beitrag braucht **keine** manuelle Änderung an der Startseite,
`index.njk` zieht sich automatisch alle Dateien aus `src/posts/`.

## Lokal testen (Design, ohne Login)

```
npm install
npm run dev
```

Öffnet die Seite unter `http://localhost:8080`. Der `/admin`-Login
funktioniert lokal nicht (GitHub OAuth braucht die echte, live gehostete
Domain als Callback-Ziel), das lässt sich nur nach dem Deployment auf
Cloudflare Pages testen.

## Einmaliges Setup: GitHub OAuth App

1. Auf GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. **Application name**: z.B. "Camping Blog Admin".
3. **Homepage URL**: eure Cloudflare-Pages-URL, z.B.
   `https://cali-diaries1.pages.dev`.
4. **Authorization callback URL**:
   `https://cali-diaries1.pages.dev/api/auth/callback`.
5. Erstellen, dann **Client ID** kopieren und einen **Client Secret**
   generieren und kopieren (nur einmal sichtbar).

## Umgebungsvariablen bei Cloudflare Pages

Im Cloudflare-Projekt unter **Settings → Environment variables**:

| Name | Wert |
|---|---|
| `GITHUB_CLIENT_ID` | aus der OAuth App |
| `GITHUB_CLIENT_SECRET` | aus der OAuth App |

Danach einen neuen Build auslösen (z.B. `git commit --allow-empty -m "trigger" && git push`).

## Cloudflare Pages Build-Einstellungen

```
Build command:     npm run build
Build output dir:  _site
```

Der Ordner `functions/` im Projekt-Root wird von Cloudflare automatisch als
Pages Functions erkannt, unabhängig vom Build-Output-Ordner, dafür ist keine
zusätzliche Einstellung nötig.

## Wenn später die eigene Domain dazukommt

Zwei Stellen müssen angepasst werden:

1. `public/admin/config.yml` → `base_url` auf die neue Domain ändern.
2. GitHub OAuth App → **Homepage URL** und **Authorization callback URL**
   auf die neue Domain aktualisieren.

## Neuen Beitrag veröffentlichen

1. `<domain>/admin` öffnen, mit GitHub einloggen.
2. **Beiträge → Neuer Beitrag**.
3. Titel, Ort, Datum, Nächte, Kurztext, Text ausfüllen, Fotos hochladen.
4. **Publish**.

Decap committet automatisch ins Repo, Cloudflare baut automatisch neu, der
Beitrag ist nach kurzer Zeit live und erscheint automatisch als Karte auf der
Startseite.

Alternativ weiterhin von Hand möglich: eine neue `.md`-Datei nach dem Muster
der bestehenden in `src/posts/` anlegen, committen, pushen.
