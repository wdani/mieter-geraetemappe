# Mieter-Gerätemappe

Digitale Informationsmappe für Mietwohnungen und Liegenschaften. Sie verwaltet datenschutzfreundliche Inhalte wie Geräteanleitungen, Farb- und Materialangaben, Pflegehinweise, technische Informationen und allgemeine Kontakte.

## Aktueller Stand: Version 1.3.0

- zentrale Eintragsliste über Netlify Blobs
- geschützte Verwaltung über `ADMIN_PASSWORD`
- installierbare Progressive Web App
- dauerhafte Detailseiten unter `/d/<ID>`
- QR-Code-Vorschau und PNG-Download pro Eintrag
- Excel-Export als `.xlsx`
- JSON-Export und JSON-Import
- Dokument-Link optional
- reine Notiz- und Informationseinträge möglich
- verwaltbare Kategorie- und Wohnungs-/Bereichs-Labels
- Zuordnung eines Eintrags zu mehreren Wohnungen oder Bereichen
- automatische Übernahme älterer Einträge mit einem einzelnen `apartment`-Feld
- Einträge können im Verwaltungsmodus dupliziert werden

## Datenprinzip

GitHub enthält ausschliesslich den Programmcode. Produktive Einträge, Passwörter und andere Laufzeitdaten werden nicht im Repository gespeichert.

Ein Eintrag kann beispielsweise enthalten:

- Titel
- Kategorie
- eine oder mehrere Wohnungen beziehungsweise Bereiche
- Notiz oder Information
- optionalen Dokument-Link
- stabile ID für QR-Codes

## Projektstruktur

Der bearbeitbare Ausgangsstand liegt unter `source/`. `bootstrap.mjs` erzeugt daraus die für Entwicklung und Deployment benötigten Stammdateien und Ordner:

- `package.json`
- `netlify.toml`
- `tsconfig.json`
- `public/`
- `netlify/`

Nach einem Merge mit Änderungen unter `source/` oder `templates/` aktualisiert der GitHub-Workflow die direkt deploybaren Stammdateien automatisch.

## Lokale Entwicklung

Voraussetzungen:

- Node.js
- npm
- Netlify CLI

```bash
node bootstrap.mjs
npm install
npm run build
npm run check
npm run dev
```

Die Icons werden beim Build aus `assets/app-icon.svg` erzeugt. Die lokale Entwicklung verwendet eine von der produktiven Umgebung getrennte Laufzeitumgebung.

## Deployment

Das Projekt ist für automatisierte Deployments vorbereitet:

- Build-Befehl: `npm run build`
- Publish-Verzeichnis: `public`
- Functions-Verzeichnis: `netlify/functions`
- benötigte Environment-Variable: `ADMIN_PASSWORD`

Produktive Einträge bleiben im Laufzeitspeicher und werden nicht Teil des Git-Repositorys.

## QR-Prinzip

Neue QR-Codes verlinken nicht direkt auf einen externen Dokumentenspeicher, sondern auf eine stabile Detailseite der Gerätemappe:

```text
/d/<ID>
```

Der externe Dokument-Link kann später geändert werden, ohne den gedruckten QR-Code ersetzen zu müssen. Reine Informationseinträge funktionieren ebenfalls ohne externen Link.

## Weiterentwicklung

Die nächsten geplanten Ausbauschritte stehen in [ROADMAP.md](ROADMAP.md). Detaillierte Konzepte für Excel-Import, Änderungsverlauf und Sicherungen befinden sich unter [`docs/`](docs/).
