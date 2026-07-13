# Changelog

## 1.5.0

- Jede einzelne Wohnung beziehungsweise jeder Bereich erhält eine dauerhaft identifizierte Übersichtsseite unter `/wohnung/<ID>`.
- Wohnungsseiten zeigen zugeordnete sowie allgemeine Einträge und bieten eine eigene Suche und Kategorienfilterung.
- Im Verwaltungsmodus können Wohnungslinks geöffnet, kopiert und als QR-Code heruntergeladen werden.
- QR-Codes von Einträgen und Wohnungsseiten können ausgewählt und als A4-PDF mit zehn beschrifteten Etiketten pro Seite exportiert werden.
- Eine tägliche geplante Sicherung speichert den vollständigen Datenbestand; am ersten Tag eines Monats wird zusätzlich eine Monatssicherung erstellt.
- Es werden bis zu 30 tägliche und 12 monatliche Sicherungen aufbewahrt.
- Die Verwaltung enthält eine Backup-Übersicht mit manueller Sicherung, Download und Wiederherstellung.
- Vor Wiederherstellungen, Backup-Importen und grösseren Löschaktionen wird automatisch eine Sicherheitskopie erstellt.
- Wohnungs-IDs werden beim normalen Umbenennen eines Labels beibehalten, damit gedruckte QR-Codes gültig bleiben.
- PWA-Cache und Versionsanzeige auf 1.5.0 aktualisiert.

## 1.4.2

- X und „Abbrechen“ schliessen den Eintragsdialog wieder ohne die Pflichtfeldprüfung auszulösen.
- Derselbe Abbruchfehler im Verwaltungs-Login wurde ebenfalls behoben.
- Der automatisch erzeugte Projekt-Commit darf den verbundenen Netlify-Deploy auslösen.
- PWA-Cache für den Fix erneuert.

## 1.4.1

- Dropbox-Freigabelinks verwenden `raw=1`, damit unterstützte Dokumente direkt im Browser geöffnet werden und die Dropbox-Zwischenseite möglichst umgangen wird.
- Die geladene App-Version wird dauerhaft im Footer angezeigt.
- PWA-Cache für den Fix erneuert.

## 1.4.0

- Ein Eintrag kann mehrere beschriftete HTTPS-Links enthalten, beispielsweise Anleitung, technische Beschreibung, Herstellerseite oder Video.
- Ältere Einträge mit einem einzelnen `link`-Feld werden automatisch in das neue Link-Format überführt.
- Kategorie- und Wohnungs-/Bereichs-Labels können zentral umbenannt werden.
- Labels können kontrolliert gelöscht werden; bei notwendigen Zuordnungen wird ein Ersatz verlangt.
- Nicht mehr verwendete Labels werden automatisch entfernt und nicht mehr zur Auswahl angezeigt.
- Vollständige Backups können als JSON heruntergeladen und wieder importiert werden.
- Vor jedem Backup-Import wird serverseitig automatisch eine Sicherheitskopie des aktuellen Stands gespeichert.
- Der Excel-Export erzeugt für mehrere Links dynamische Spalten mit Bezeichnung und URL.
- Suche, Karten und Detailseiten unterstützen mehrere Links.

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
