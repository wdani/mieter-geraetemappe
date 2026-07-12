# Konzept: Änderungsverlauf

## Ziele

- nachvollziehen, wann und warum Informationen geändert wurden
- versehentliche Änderungen rückgängig machen
- alte Werte einsehen
- Aktualität von Angaben beurteilen

## Ereignistypen

- Eintrag erstellt
- Eintrag geändert
- Eintrag archiviert
- Eintrag gelöscht
- Eintrag wiederhergestellt
- Excel-Import
- JSON-Import
- manuelle Prüfung bestätigt

## Daten pro Ereignis

- Ereignis-ID
- Zeitstempel
- Eintrags-ID
- Aktion
- Quelle
- optionaler Bearbeiter
- geänderte Felder
- Alter Wert
- Neuer Wert
- optionale Import- oder Backup-ID

## Zeitfelder am Eintrag

- `createdAt`: automatisch beim Erstellen
- `updatedAt`: automatisch bei jeder Änderung
- `reviewedAt`: bewusst durch die Verwaltung gesetzt

`updatedAt` und `reviewedAt` dürfen nicht gleichgesetzt werden. Eine technische Änderung bedeutet nicht automatisch, dass der Inhalt fachlich geprüft wurde.

## Wiederherstellung

- einzelne frühere Version wiederherstellen
- gelöschten Eintrag wiederherstellen
- vollständigen Import zurücksetzen
- vor Ausführung eine Vorschau der Auswirkungen zeigen
