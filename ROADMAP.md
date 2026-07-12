# Roadmap

## Version 1.3.0 – umgesetzt

- verwaltbare Kategorie-Labels
- verwaltbare Wohnungs- und Bereichs-Labels
- Mehrfachzuordnung eines Eintrags zu Wohnungen oder Bereichen
- automatische Migration älterer Einträge
- Einträge duplizieren
- Excel-Export mit Mehrfachzuordnungen
- JSON-Sicherungen inklusive Label-Listen

## Nächste Ausbaustufe

### Eintragstypen

- Dokument
- Information
- Gerät
- Kontakt
- Hinweis

### Mehrere Links pro Eintrag

Ein Eintrag kann mehrere beschriftete Links enthalten. Reine Informationseinträge bleiben ohne Link möglich.

### Wohnungsseiten

Geplant sind eigene Übersichtsseiten wie `/wohnung/2a`, die nur die zugeordneten Einträge anzeigen. Ein allgemeiner QR-Code kann dadurch auf die gesamte Informationsmappe einer Wohnung führen.

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

### Automatische Sicherungen

- regelmässige automatische Sicherung
- Sicherung vor Importen und grösseren Löschaktionen
- Aufbewahrungsregeln
- Wiederherstellung mit Vorschau

## Vorläufig nicht geplant

- Mieter-Benutzerkonten
- Ticket- oder Schadensmeldesystem
- Push-Benachrichtigungen
- komplexe Rollenverwaltung
