# Changelog

## 1.3.0

- Kategorien und Wohnungen/Bereiche können als wiederverwendbare Labels angelegt werden.
- Ein Eintrag kann mehreren Wohnungen oder Bereichen zugeordnet werden.
- Ältere Einträge mit dem Feld `apartment` werden automatisch in das neue Datenmodell überführt.
- Einträge können im Verwaltungsmodus dupliziert werden.
- Filter, Karten, Detailseiten und Excel-Export unterstützen Mehrfachzuordnungen.
- JSON-Sicherungen enthalten neben den Einträgen nun auch die Label-Listen.
- Versionsangaben wurden auf 1.3.0 vereinheitlicht.
- PWA-Cache wurde für das Update erneuert.

## 1.2.0

- Dokument-Link ist optional.
- Notiz- und Informationseinträge ohne externe Datei sind möglich.
- Mindestens eine Notiz oder ein Dokument-Link ist erforderlich.
- QR-Detailseiten funktionieren auch für reine Informationseinträge.
- Excel-Export lässt das Linkfeld bei Informationseinträgen leer.

## 1.1.0

- stabile Detailseiten unter `/d/<ID>`
- QR-Code-Vorschau und PNG-Download
- Excel-Export als `.xlsx`
- JSON-Sicherung und JSON-Import
- installierbare PWA

## 1.0.0

- zentrale Eintragsverwaltung
- Verwaltungsmodus
- Suche, Filter sowie Hinzufügen, Bearbeiten und Löschen
