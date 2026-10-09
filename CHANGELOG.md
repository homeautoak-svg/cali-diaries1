# Changelog

## 1.5.1 – 09-Oct-2026

### Design
- „Beitrag lesen“ sitzt auf der Startseite jetzt immer am unteren Rand der Beitragskarte, unabhängig von der Länge des Kurztexts. Gilt auch für die breite Karte des neuesten Beitrags.

## 1.5.0 – 06-Oct-2026

### Design
- Kleine Seitenansicht unseres VW T7 California unten links im Footer aller Seiten (DE und EN), freigestellt als PNG mit transparentem Hintergrund.
- Alt-Text pro Sprache in `src/_data/i18n.json` (`vanAlt`).

## 1.4.0 – 06-Oct-2026

### Beiträge
- Bilder im Beitragstext (Markdown `![]()`) werden auf Textbreite skaliert, mit abgerundeten Ecken.
- Neuer Beitrag „App Camping Diary 2.0“ (DE/EN) mit Screenshots der App (Beispieldaten).

## 1.3.0 – 04-Oct-2026

### Auffindbarkeit
- `sitemap.xml` mit allen Seiten beider Sprachen inklusive hreflang-Verweisen.
- `robots.txt` mit Verweis auf die Sitemap, `/admin/` ausgeschlossen.
- RSS-Feeds `/feed.xml` (Deutsch) und `/en/feed.xml` (Englisch), im Seitenkopf verlinkt.
- Strukturierte Daten (schema.org `BlogPosting` mit Campingplatz als Ort) in jedem Beitrag.

## 1.2.0 – 04-Oct-2026

### Zweisprachigkeit
- Englischer Bereich unter `/en/` mit Startseite, Karte (`/en/map/`), Kontakt und Datenschutz.
- Sprachumschalter mit Flaggen oben rechts im Header; springt zum Gegenstück der aktuellen Seite.
- Feste Texte in `src/_data/i18n.json`, hreflang-Tags und `og:locale` pro Sprache.
- Englische Beiträge in `src/en/posts/` unter gleichem Dateinamen; Fotos, Datum, Ort und Kosten kommen automatisch aus dem deutschen Original.
- Alle bestehenden Beiträge übersetzt.
- GitHub Action `translate.yml` übersetzt neue oder geänderte deutsche Beiträge per Claude API (Secret `ANTHROPIC_API_KEY`). Von Hand bearbeitete englische Fassungen werden über Prüfsummen erkannt und nie überschrieben.
- Decap CMS: neue Collection „Beiträge (Englisch)“ zum Nachbearbeiten.
- Monatskürzel im Anzeigedatum werden pro Sprache vereinheitlicht (Okt/Oct).

## 1.1.0 – 03-Oct-2026

### Performance
- Bilder werden beim Build mit `@11ty/eleventy-img` in WebP (480/960/1600 px) umgerechnet und mit `srcset`, `sizes`, `width`/`height` und `loading="lazy"` ausgeliefert. Originale in `public/images` bleiben unverändert, der Upload über Decap und die App funktioniert wie bisher.
- Startseite lädt beim Öffnen rund 0,2 MB statt rund 30 MB.
- `og:image` verwendet eine 1200 px JPEG-Version des Titelbilds.
- Schriften per `<link>` mit `preconnect` statt `@import` im CSS.
- Geocache mit allen bisherigen Orten befüllt, damit der Build nicht bei jedem Deploy Nominatim abfragt.

### Design
- Kompakter Header auf allen Seiten ausser der Startseite, aktive Seite in der Navigation markiert.
- Neuester Beitrag als breite Karte auf der Startseite.
- Neue Farbtokens `--glut` und `--lagerfeuer-hell` für Akzenttext mit ausreichendem Kontrast (WCAG AA).
- Faktenbox (Campingplatz, Dauer, Kosten) im Beitrag, Beträge im Schweizer Format.
- Tags als „Ausstattung“-Liste statt klickbar wirkender Chips.
- Titelbild wird im Fotostreifen nicht mehr doppelt angezeigt. Fotos sind per Tastatur bedienbar, Lightbox schliesst mit Escape.
- Links zum älteren und neueren Beitrag am Ende jedes Beitrags.
- Karte: Marker in den Blogfarben, Ausschnitt passt sich allen Orten an, Titel in Fraunces.
- Hintergrundmuster dezenter, ohne `background-attachment: fixed`.

### Inhalt und Metadaten
- Meta-Description, Canonical, Open Graph und Twitter Card für alle Seiten.
- Beiträge mit Ort „Daheim“ (oder `karte: false`) erscheinen nicht mehr als falscher Pin auf der Karte.
- Umlaute im Beitrag „Herbstruhe am Lago Maggiore“ korrigiert.

## 1.0.0 – 04-Aug-2026

- Erste Version: Eleventy, Decap CMS, Cloudflare, Karte mit Geokodierung.
