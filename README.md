# Mieter-Gerätemappe

Digitale Informationsmappe für Mietwohnungen und Liegenschaften. Sie verwaltet datenschutzfreundliche Inhalte wie Geräteanleitungen, Farb- und Materialangaben, Pflegehinweise, technische Informationen und allgemeine Kontakte.

## Aktueller Stand: Version 1.5.0

- zentrale Eintragsliste über Netlify Blobs
- geschützte Verwaltung über `ADMIN_PASSWORD`
- installierbare Progressive Web App
- dauerhafte Detailseiten unter `/d/<ID>`
- QR-Code-Vorschau und PNG-Download pro Eintrag
- Excel-Export als `.xlsx`
- vollständiger Backup-Download und Backup-Import als JSON
- reine Notiz- und Informationseinträge ohne externen Link
- mehrere beschriftete Links pro Eintrag, etwa Anleitung, technische Beschreibung oder Video
- verwaltbare Kategorie- und Wohnungs-/Bereichs-Labels
- Zuordnung eines Eintrags zu mehreren Wohnungen oder Bereichen
- Einträge können im Verwaltungsmodus dupliziert werden
- eigene Übersichtsseite mit dauerhaftem QR-Code pro Wohnung oder Bereich
- QR-Druckbogen als A4-PDF mit zehn beschrifteten Etiketten pro Seite
- tägliche automatische Sicherung mit 30 aufbewahrten Tagesständen
- zusätzliche monatliche Sicherung mit 12 aufbewahrten Monatsständen
- Backup-Übersicht mit Download und Wiederherstellung
- automatische Sicherheitskopien vor Importen, Wiederherstellungen und grösseren Löschaktionen

## Datenprinzip

GitHub enthält ausschliesslich den Programmcode. Produktive Einträge, Passwörter und andere Laufzeitdaten werden nicht im Repository gespeichert.

Ein Eintrag kann beispielsweise enthalten:

- Titel
- Kategorie
- eine oder mehrere Wohnungen beziehungsweise Bereiche
- Notiz oder Information
- optional mehrere beschriftete HTTPS-Links
- stabile ID für QR-Codes

Labels werden nicht dauerhaft als ungenutzte Auswahlliste geführt. Die Anwendung leitet die verfügbaren Kategorien und Wohnungen/Bereiche aus den tatsächlich gespeicherten Einträgen ab. Wird ein Label nirgends mehr verwendet, wird es beim nächsten Speichern automatisch entfernt.

## Wohnungsseiten

Jede verwendete Wohnung beziehungsweise jeder Bereich erhält eine stabile interne ID und eine eigene Adresse:

```text
/wohnung/<ID>
```

Die Seite enthält alle direkt zugeordneten Einträge sowie allgemeine Inhalte. Eine normale Umbenennung des Wohnungs-Labels behält die ID bei, damit bereits gedruckte QR-Codes gültig bleiben.

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

Einzelne Einträge verwenden stabile Detailseiten:

```text
/d/<ID>
```

Wohnungsübersichten verwenden:

```text
/wohnung/<ID>
```

Die hinterlegten Dokument-Links können später geändert oder erweitert werden, ohne den gedruckten QR-Code ersetzen zu müssen. Reine Informationseinträge funktionieren ebenfalls ohne externen Link.

## Weiterentwicklung

Weitere mögliche Ausbauschritte stehen in [ROADMAP.md](ROADMAP.md). Detaillierte Konzepte für Excel-Import, Änderungsverlauf und Sicherungen befinden sich unter [`docs/`](docs/).
