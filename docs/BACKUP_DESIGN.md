# Konzept: Datensicherungen

## Inhalt einer Sicherung

- Einträge
- Kategorien
- Wohnungen und Bereiche
- Eintragstypen
- stabile IDs und QR-Kurzcodes
- Änderungsverlauf
- Schema-Version
- Erstellungszeitpunkt

## Geplante Auslöser

- regelmässige Sicherung
- vor Excel- oder JSON-Importen
- vor einem vollständigen Abgleich
- vor grösseren Lösch- oder Archivierungsaktionen
- manuell über die Verwaltung

## Aufbewahrungsvorschlag

- 30 tägliche Stände
- 12 monatliche Stände
- Import-Sicherungen mindestens 90 Tage

## Wiederherstellung

1. Sicherungsstand auswählen.
2. Unterschiede zum aktuellen Stand anzeigen.
3. Den aktuellen Stand zusätzlich sichern.
4. Wiederherstellung bestätigen.
5. Ergebnis im Änderungsverlauf protokollieren.
