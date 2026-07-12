# Konzept: Excel-Import

## Ziel

Mehrere Einträge sollen komfortabel in Excel vorbereitet, geprüft und gesammelt übernommen werden können, ohne bestehende QR-Verknüpfungen zu beschädigen.

## Vorgeschlagene Spalten

| Spalte | Pflicht | Bedeutung |
|---|---:|---|
| ID | bei Updates | stabile technische ID und QR-Zuordnung |
| Typ | ja | Dokument, Information, Gerät, Kontakt oder Hinweis |
| Titel | ja | sichtbarer Name |
| Kategorie | ja | fachliche Gruppierung |
| Wohnung/Bereich | ja | Zuordnung |
| Notiz | bedingt | erforderlich, wenn kein Link vorhanden ist |
| Link 1 Bezeichnung | nein | beispielsweise Bedienungsanleitung |
| Link 1 URL | nein | HTTPS-Link |
| Link 2 Bezeichnung | nein | optionaler weiterer Link |
| Link 2 URL | nein | optionaler weiterer Link |
| Status | nein | aktiv, Entwurf oder archiviert |
| Kurzcode | automatisch | lesbarer QR-Kurzcode |

## Importablauf

1. Datei auswählen.
2. Arbeitsmappe und Spalten prüfen.
3. Zeilen validieren.
4. Vorschau anzeigen.
5. Automatisches Backup erstellen.
6. Import bestätigen.
7. Ergebnisbericht speichern.

## Vorschau-Status

- **Neu:** ID ist noch unbekannt.
- **Geändert:** ID ist bekannt und mindestens ein Wert wurde geändert.
- **Unverändert:** ID und Inhalt stimmen überein.
- **Fehler:** Pflichtfeld oder Format ist ungültig.
- **Konflikt:** ID, Kurzcode oder Zuordnung ist widersprüchlich.

## Importmodi

### Ergänzen und aktualisieren

Standardmodus. Neue IDs werden erstellt, bekannte IDs aktualisiert, nicht aufgeführte Einträge bleiben unverändert.

### Nur neue Einträge

Bestehende IDs werden ignoriert. Nur neue Einträge werden übernommen.

### Vollständiger Abgleich

Die Excel-Datei gilt als vollständiger Sollbestand. Nicht vorhandene Einträge werden bevorzugt archiviert, nicht sofort endgültig gelöscht.

## Validierungen

- Titel vorhanden
- gültiger Eintragstyp
- bekannte oder neu freigegebene Kategorie
- gültige Wohnungszuordnung
- mindestens Notiz oder ein Link
- Links leer oder HTTPS
- keine doppelten IDs
- keine doppelten Kurzcodes
- zulässige Textlängen

## Rückgängig

Jeder Import erhält eine Import-ID. Alle Änderungen dieses Imports werden gemeinsam protokolliert und können als Einheit zurückgesetzt werden.
