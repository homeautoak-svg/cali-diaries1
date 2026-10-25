# Changelog

## 1.8.0 – 25-Oct-2026

### Karte
- Die Seite „Karte“ (`/karte/`, `/en/map/`) zeigt statt Leaflet eine gemalte Übersichtskarte im Stil der Lagekarten: Seen, Landesgrenzen, Ländernamen, nummerierte Pins in zeitlicher Reihenfolge und gestrichelte Linien ab Zürich. Der Ausschnitt passt sich automatisch an alle Trips an.
- Unter der Karte eine nummerierte Liste mit Campingplatz, Ort und Monat. Pins und Einträge verlinken zum Bericht und heben sich gegenseitig hervor; auf dem Handy sind die Pins grösser.
- Grosse Seen, an denen wir waren (z.B. Bodensee, Lago Maggiore), in der genaueren Form aus den OpenStreetMap-Daten der Beiträge; übrige Seen und Grenzen aus Natural Earth.
- Leaflet wird im Blog nicht mehr geladen. Hineinzoomen ist auf der Übersicht nicht mehr möglich.
- Renderer in `lib/uebersichtskarte.js`.

## 1.7.4 – 24-Oct-2026

### Beiträge
- Galerie: Ein Klick auf das linke Drittel des Fotos zeigt das vorherige, auf das rechte Drittel das nächste Foto. Am Laptop zeigt der Mauszeiger die Richtung an.

## 1.7.3 – 24-Oct-2026

### Beiträge
- Quellenhinweis zu OpenStreetMap als kleine Zeile in der unteren rechten Ecke der Karte statt als eigene Zeile darunter (von der Lizenz der Kartendaten verlangt).

## 1.7.2 – 24-Oct-2026

### Beiträge
- Lage und Anfahrt: „Auf OpenStreetMap öffnen“ ist der einzige sichtbare Link, ohne Pfeil. Der Link zur grossen Karte entfällt hier (sie bleibt über die Navigation erreichbar), der Quellenhinweis ist reiner Text.

## 1.7.1 – 24-Oct-2026

### Beiträge und Karten
- Pins stehen auf dem Campingplatz selbst statt auf der Ortsmitte, in der Lagekarte und auf der grossen Karte. Distanz und Fahrzeit beziehen sich ebenfalls auf den Platz.
- Reihenfolge der Quellen: Feld „Koordinaten“ im Beitrag (von Hand oder künftig aus der App), dann der in OpenStreetMap gefundene Platz, dann wie bisher der Ort.
- Kreuzlingen: Campingplatz als „Camping Fischerhaus“ eingetragen.

### Daten und CMS
- Neues Skript `scripts/find-campsites.js` sucht Plätze (tourism=camp_site) im Umkreis von 15 km um den Ort, bevorzugt nach Namen, und legt sie in `src/_data/campsites.json` ab. Läuft in der GitHub Action vor dem Holen der Kartendaten; die Kartendaten werden künftig um den Platz geholt.
- Overpass-Anfragen mit weiteren Servern und als eine gemeinsame Anfrage, damit die Action nicht minutenlang wartet.
- CMS: optionales Feld „Koordinaten des Platzes“ (z.B. aus Google Maps kopiert), wird auf Englisch übernommen.

## 1.7.0 – 24-Oct-2026

### Beiträge
- Gezeichnete Lagekarte statt der Leaflet-Karte bei „Lage und Anfahrt“: Seen mit Wellenmuster und weichen Ufern, Flüsse, grössere Strassen, Ortschaften und Seenamen auf Papierton, dazu Pin, Richtung und Distanz nach Zürich, Nordpfeil und Massstab. Ausschnitt 26 km breit, auf dem Handy auf die Mitte um den Campingplatz zugeschnitten.
- Ein Klick auf die Karte (oder „Auf OpenStreetMap öffnen“) öffnet OpenStreetMap beim Campingplatz. Quellenhinweis „© OpenStreetMap-Mitwirkende“ gemäss Lizenz unter der Karte.
- Die Kartenbibliothek Leaflet wird in Beiträgen nicht mehr geladen; die Seiten laden schneller.

### Daten
- Kartendaten aus OpenStreetMap (Overpass) liegen pro Ort in `src/_data/osm/`. Die GitHub Action „Beiträge übersetzen“ holt sie für neue Campingplätze automatisch (`scripts/fetch-osm.js`), geokodiert neue Orte und committet beides. Der Cloudflare-Build braucht dafür keine Verbindung zu OpenStreetMap.
- Fehlen die Daten noch (z.B. direkt nach dem Veröffentlichen), erscheint eine gröbere Ersatzkarte aus einem Natural-Earth-Auszug (`lib/karte-ersatz.json`), bis die Action die Daten nachgeliefert hat.
- Renderer in `lib/lagekarte.js`; neue Abhängigkeiten `polygon-clipping` und `polylabel`.

## 1.6.4 – 24-Oct-2026

### Startseite
- Die grosse Karte oben zeigt wieder den neuesten Beitrag, auch wenn er keinen Campingplatz hat (z.B. Werkstatt- oder Saisonbeiträge). Bisher stand dort der neueste Beitrag mit Campingplatz. Ausgenommen bleibt die Rubrik „Rund um den Blog“.

## 1.6.3 – 24-Oct-2026

### Beiträge
- Neuer Beitrag „Kratzer, leere Batterie und eine klemmende Tür: Was wir aus einer Woche Werkstatt gelernt haben“ mit Foto der Kratzer.

### Design
- Aufzählungen im Beitragstext haben denselben Zeilenabstand wie die Absätze und etwas Luft zwischen den Punkten.

## 1.6.2 – 24-Oct-2026

### Beiträge
- Galerie: Ein Klick neben das Foto schliesst die Grossansicht, nicht nur das X. Klicks auf Foto, Pfeile und Vorschaubilder lassen sie offen.
- Galerie: Das vorherige und das nächste Foto werden vorab geladen, damit Blättern ohne Wartezeit geht.
- Steckbrief: Hinweis zum EZB-Kurs unter den Beträgen entfernt.
- Lage und Anfahrt: Hinweis „Strecke laut OpenStreetMap, ohne Verkehr“ entfernt.

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
