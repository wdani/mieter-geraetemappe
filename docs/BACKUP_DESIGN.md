# Konzept: Datensicherungen

## In Version 1.4 umgesetzt

Über den Verwaltungsmodus kann ein vollständiges Backup als JSON-Datei heruntergeladen und später wieder importiert werden.

Die Sicherung enthält:

- alle Einträge
- mehrere beschriftete Links pro Eintrag
- Kategorien
- Wohnungen und Bereiche
- stabile Eintrags-IDs für QR-Codes
- Schema-Version
- App-Version
- Erstellungszeitpunkt

Vor jedem Backup-Import speichert die Serverfunktion den bisherigen Datenstand automatisch als Sicherheitskopie unter `backups/latest-before-import`. Erst danach werden die importierten Daten übernommen.

Beim Import werden die Einträge validiert. Ungültige IDs, fehlende Pflichtangaben, unsichere Links oder unvollständige Zuordnungen werden abgelehnt. Labels werden nach erfolgreichem Import aus den tatsächlich verwendeten Einträgen neu abgeleitet.

## Noch geplant

- zeitgesteuerte automatische Sicherungen
- Sicherung vor grösseren Lösch- oder Archivierungsaktionen
- Liste mehrerer verfügbarer Sicherungsstände
- Wiederherstellung mit Vergleichsvorschau
- Änderungsverlauf für Wiederherstellungen

## Aufbewahrungsvorschlag

- 30 tägliche Stände
- 12 monatliche Stände
- Import-Sicherungen mindestens 90 Tage

## Spätere Wiederherstellung mit Vorschau

1. Sicherungsstand auswählen.
2. Unterschiede zum aktuellen Stand anzeigen.
3. Den aktuellen Stand zusätzlich sichern.
4. Wiederherstellung bestätigen.
5. Ergebnis im Änderungsverlauf protokollieren.
