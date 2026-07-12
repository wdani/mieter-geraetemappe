# Roadmap

## Version 1.3

### Eintragstypen

- Dokument
- Information
- Gerät
- Kontakt
- Hinweis

### Mehrere Links pro Eintrag

Ein Eintrag kann mehrere beschriftete Links enthalten. Reine Informationseinträge bleiben ohne Link möglich.

### Zuordnung und Wohnungsseiten

Einträge können allen, einer oder mehreren Wohnungen sowie allgemeinen Liegenschaftsinformationen zugeordnet werden. Geplant sind Übersichtsseiten wie `/wohnung/2a`.

### QR-System

- lesbarer Kurzcode pro Eintrag
- Auswahl nach Wohnung, Kategorie oder Eintrag
- druckbarer QR-Bogen
- Beschriftung mit Titel, Wohnung und Kurzcode

### Excel-Import

- Importvorlage entspricht dem Exportformat
- Vorschau vor der Übernahme
- Status: neu, geändert, unverändert, Fehler, Konflikt
- Modi: ergänzen/aktualisieren, nur neu, vollständiger Abgleich
- automatische Sicherung vor jedem Import
- vollständiger Import kann rückgängig gemacht werden

### Änderungsverlauf

- erstellt am
- zuletzt geändert am
- zuletzt inhaltlich geprüft am
- geänderte Felder mit Alt- und Neuwert
- Quelle der Änderung
- Wiederherstellung früherer Versionen
- Rückgängig für Importe und Löschungen

### Automatische Backups

- tägliche automatische Sicherung
- Sicherung vor Importen und grösseren Löschaktionen
- Aufbewahrungsregeln
- Wiederherstellung mit Vorschau

## Nicht Teil von 1.3

- Mieter-Benutzerkonten
- Ticket- oder Schadensmeldesystem
- Push-Benachrichtigungen
- komplexe Rollenverwaltung
