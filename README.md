# Mieter-Gerätemappe

Digitale Informationsmappe für Mietwohnungen und Liegenschaften. Sie verwaltet datenschutzfreundliche Inhalte wie Geräteanleitungen, Farb- und Materialangaben, Pflegehinweise, technische Informationen und allgemeine Kontakte.

## Aktueller Stand: Version 1.5.1

- zentrale Eintragsliste über Netlify Blobs
- geschützte Verwaltung über `ADMIN_PASSWORD`
- installierbare Progressive Web App
- dauerhafte Detailseiten unter `/d/<ID>`
- QR-Code-Vorschau und PNG-Download pro Eintrag
- Excel-Export als `.xlsx`
- reine Notiz- und Informationseinträge ohne externen Link
- mehrere beschriftete Links pro Eintrag
- verwaltbare Kategorie- und Wohnungs-/Bereichs-Labels
- Zuordnung eines Eintrags zu mehreren Wohnungen oder Bereichen
- eigene Übersichtsseite mit dauerhaftem QR-Code pro Wohnung oder Bereich
- QR-Druckbogen als A4-PDF mit zehn beschrifteten Etiketten pro Seite
- tägliche automatische Sicherung mit 30 aufbewahrten Tagesständen
- zusätzliche monatliche Sicherung mit 12 aufbewahrten Monatsständen
- zentrale Backup-Verwaltung mit Import, Download und Wiederherstellung
- optionale Dropbox-Zweitsicherung mit automatischer Aufbewahrung
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

## Backups

Die Gerätemappe hält weiterhin ihre eigenen täglichen, monatlichen, manuellen und Sicherheitskopien vor. Dropbox ist nur ein optionaler zweiter Sicherungsort.

Ist Dropbox verbunden, werden neue Sicherungen zusätzlich in den eigenen Dropbox-App-Ordner kopiert. Die Gerätemappe löscht ältere Dropbox-Dateien selbstständig nach denselben Aufbewahrungsregeln:

- 30 tägliche Sicherungen
- 12 monatliche Sicherungen
- 20 manuelle Sicherungen
- 50 Sicherheitskopien

Ein Dropbox-Fehler verhindert niemals die lokale Sicherung. Einrichtung und Berechtigungen sind in [`docs/DROPBOX_SETUP.md`](docs/DROPBOX_SETUP.md) beschrieben.

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

## Deployment

Das Projekt ist für automatisierte Deployments vorbereitet:

- Build-Befehl: `npm run build`
- Publish-Verzeichnis: `public`
- Functions-Verzeichnis: `netlify/functions`
- benötigte Variable: `ADMIN_PASSWORD`
- optionale Dropbox-Variablen: `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_BACKUP_PATH`

Produktive Einträge und der nach der Dropbox-Anmeldung erhaltene Refresh Token bleiben im Laufzeitspeicher und werden nicht Teil des Git-Repositorys.

## QR-Prinzip

Einzelne Einträge verwenden stabile Detailseiten:

```text
/d/<ID>
```

Wohnungsübersichten verwenden:

```text
/wohnung/<ID>
```

Die hinterlegten Dokument-Links können später geändert oder erweitert werden, ohne den gedruckten QR-Code ersetzen zu müssen.

## Weiterentwicklung

Weitere mögliche Ausbauschritte stehen in [ROADMAP.md](ROADMAP.md). Detaillierte Konzepte befinden sich unter [`docs/`](docs/).
