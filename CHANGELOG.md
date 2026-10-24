# Changelog

## 1.6.1 – 24-Oct-2026

### Fehlerbehebungen
- Galerie: Fotos in der Grossansicht werden nicht mehr verzerrt (Breite und Höhe aus dem Bild-Build wurden zusammen mit der Maximalgrösse angewendet).
- Galerie: Die Karte „Lage und Anfahrt“ liegt nicht mehr über der geöffneten Grossansicht. Die Karte hat einen eigenen Stapelkontext, die Grossansicht liegt zuoberst.
- Galerie: Zähler „1 / 6“ bricht auf dem Handy nicht mehr um.

## 1.6.0 – 24-Oct-2026

### Beiträge
- Steckbrief ersetzt die bisherige Faktenbox: Campingplatz mit Ort, Bewertung (Sterne), Preis pro Nacht, Dauer, Kosten total, Monat des Besuchs, Stellplatz, Strom, Hunde und Saison. Leere Felder werden ausgeblendet.
- Beträge zusätzlich in EUR zum EZB-Referenzkurs vom Reisedatum (Frankfurter-API, zwischengespeichert in `src/_data/fxcache.json`).
- Neue Galerie: Raster mit grossem Erstbild, Ansicht zum Blättern mit Pfeilen, Pfeiltasten und Wischen, Zähler und Vorschaubildern. Ersetzt den Fotostreifen.
- Karte „Lage und Anfahrt“ mit Kartenausschnitt, Fahrdistanz und Fahrzeit ab Zürich (OSRM, zwischengespeichert in `src/_data/routecache.json`) und Land.
- Ausstattung verlinkt auf die neuen Merkmal-Seiten.
- Kasten „Hinter dem Blog“ mit Links zu „Willkommen“, RSS und den besuchten Campingplätzen.
- Lesefortschritt als dünne Linie am oberen Rand.
- Strukturierte Daten um die Koordinaten des Campingplatzes ergänzt.

### Startseite
- Kennzahlen im Header (Trips, Nächte, Länder, Campingplätze), automatisch berechnet und beim Laden einmal hochgezählt.
- Rubriken „Reiseberichte“ und „Rund um den Blog“; der neueste Reisebericht steht als grosse Karte oben.
- Beitragskarten blenden beim Laden leicht versetzt ein (abgeschaltet bei „Bewegung reduzieren“).

### Neue Seiten
- „Besuchte Campingplätze“ (`/campingplaetze/`, `/en/campsites/`) mit Filter nach Land und Merkmal, in der Navigation verlinkt.
- Merkmal-Seiten (`/merkmal/…/`, `/en/feature/…/`), z.B. „Kinderfreundliche Campingplätze“.

### Daten und CMS
- Merkmale werden über `src/_data/merkmale.json` vereinheitlicht („ruhig“ und „Ruhig“, „WIFI“ und „WiFi“), ohne die Beitragsdateien zu ändern, damit keine neue Übersetzung ausgelöst wird.
- Neue Felder `land`, `rubrik`, `preis_nacht`, `bewertung`, `stellplatz`, `strom`, `hunde`, `saison_von`, `saison_bis`; im CMS als Auswahlfelder, auf Englisch automatisch übernommen.
- Bestehende Beiträge ergänzt: Land, Preis pro Nacht aus dem Beitragstext, Campingplatz bei Sempach und Lindau, Ort bei Allensbach, Rubrik bei den drei Beiträgen rund um Blog und App.

## 1.5.2 – 11-Oct-2026

### Beiträge
- „App Camping Diary 2.0“ (DE/EN) um einen Nachtrag zum Update vom 11.10.2026 ergänzt: Saisonplaner, Trip-Status, Schul- und Feiertage, Laptop-Ansicht, Fahrzeugmasse und Einführung, mit neuen Screenshots (Beispieldaten).

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
