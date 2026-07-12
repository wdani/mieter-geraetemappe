# Mieter-Gerätemappe

Digitale Informationsmappe für Mietwohnungen und Liegenschaften. Sie verwaltet datenschutzfreundliche Inhalte wie Geräteanleitungen, Farb- und Materialangaben, Pflegehinweise, technische Informationen und allgemeine Kontakte.

## Aktueller Stand: Version 1.2.0

- zentrale Eintragsliste über Netlify Blobs
- geschützte Verwaltung über `ADMIN_PASSWORD`
- installierbare Progressive Web App
- dauerhafte Detailseiten unter `/d/<ID>`
- QR-Code-Vorschau und PNG-Download pro Eintrag
- Excel-Export als `.xlsx`
- JSON-Export und JSON-Import
- Dokument-Link optional
- reine Notiz- und Informationseinträge möglich

## Datenprinzip

GitHub enthält ausschliesslich den Programmcode. Produktive Einträge, Passwörter und andere Laufzeitdaten werden nicht im Repository gespeichert.

Ein Eintrag kann beispielsweise enthalten:

- Titel
- Kategorie
- Wohnung oder Bereich
- Notiz beziehungsweise Information
- optionalen Dokument-Link
- stabile ID für QR-Codes

## Lokale Entwicklung

Voraussetzungen:

- Node.js
- npm
- Netlify CLI

```bash
npm install
npm run build
npm run dev
```

Die Icons werden beim Build aus `assets/app-icon.svg` erzeugt. Die lokale Entwicklung verwendet eine getrennte Netlify-Blobs-Umgebung.

## Prüfung

```bash
npm run check
```

## Deployment

Das Projekt ist für Netlify vorbereitet:

- Build-Befehl: `npm run build`
- Publish-Verzeichnis: `public`
- Functions-Verzeichnis: `netlify/functions`
- benötigte Environment-Variable: `ADMIN_PASSWORD`

Für automatische Deploys kann das Repository direkt mit dem bestehenden Netlify-Projekt verbunden werden.

## QR-Prinzip

Neue QR-Codes verlinken nicht direkt auf einen externen Dokumentenspeicher, sondern auf eine stabile Detailseite der Gerätemappe:

```text
/d/<ID>
```

Der externe Dokument-Link kann später geändert werden, ohne den gedruckten QR-Code ersetzen zu müssen. Reine Informationseinträge funktionieren ebenfalls ohne externen Link.

## Roadmap

Die geplanten Funktionen für Version 1.3 stehen in [ROADMAP.md](ROADMAP.md). Detaillierte Konzepte befinden sich unter [`docs/`](docs/).
