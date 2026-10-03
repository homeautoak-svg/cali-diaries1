# Changelog

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
