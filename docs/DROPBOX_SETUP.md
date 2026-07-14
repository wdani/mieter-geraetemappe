# Dropbox-Zweitsicherung einrichten

Dropbox ist optional. Die normalen Sicherungen der Gerätemappe funktionieren auch ohne Dropbox.

## 1. Dropbox-App erstellen

Im Dropbox-Konto, das die Sicherungen erhalten soll, die Dropbox App Console öffnen und eine neue App erstellen.

Auswahl:

- API: **Scoped access**
- Zugriff: **App folder**
- App-Name: ein noch freier Name, beispielsweise `Geraetemappe-Backups-Wohlgemuth`

Mit **App folder** kann die Anwendung ausschliesslich auf ihren eigenen Ordner unter `Apps` zugreifen.

## 2. Berechtigungen setzen

Im Reiter **Permissions** aktivieren:

- `files.metadata.read`
- `files.content.write`

Danach die Änderungen speichern.

## 3. Redirect URI eintragen

Im Reiter **Settings** unter OAuth 2 folgende Redirect URI exakt eintragen:

```text
https://mieter-geraetemappe.netlify.app/api/dropbox-oauth?action=callback
```

Bei einer späteren eigenen Domain muss zusätzlich die entsprechende Adresse dieser Domain eingetragen werden.

## 4. App Key und App Secret übernehmen

Im Dropbox-App-Reiter **Settings** befinden sich:

- App key
- App secret

Diese Werte nicht in GitHub oder in öffentliche Nachrichten kopieren.

## 5. Variablen in Netlify anlegen

Im bestehenden Netlify-Projekt unter den Umgebungsvariablen anlegen:

```text
DROPBOX_APP_KEY=<App key>
DROPBOX_APP_SECRET=<App secret>
DROPBOX_BACKUP_PATH=/Geraetemappe-Backups
```

`DROPBOX_APP_SECRET` als geheimen Wert behandeln. Der Pfad kann normalerweise unverändert bleiben.

Nach dem Speichern den letzten Deploy erneut anstossen, damit die Functions die neuen Variablen erhalten.

## 6. Dropbox in der Gerätemappe verbinden

1. Gerätemappe öffnen.
2. Verwaltung starten.
3. **Backups verwalten** öffnen.
4. **Dropbox verbinden** wählen.
5. Im Dropbox-Fenster den Zugriff bestätigen.
6. Zur Gerätemappe zurückkehren.
7. **Jetzt sichern** oder **Verbindung testen** ausführen.

Der langfristige Refresh Token wird nach der Zustimmung nur serverseitig im privaten Laufzeitspeicher der Gerätemappe abgelegt. Er erscheint weder in GitHub noch im Browsercode.

## Ergebnis

Dropbox legt für die App einen eigenen Ordner an. Darin entsteht ungefähr folgende Struktur:

```text
Apps/
└── <Dropbox-App-Name>/
    └── Geraetemappe-Backups/
        ├── Daily/
        ├── Monthly/
        ├── Manual/
        └── Safety/
```

Die Gerätemappe behält automatisch:

- 30 tägliche Backups
- 12 monatliche Backups
- 20 manuelle Backups
- 50 Sicherheitskopien

Ältere Dateien werden von der Gerätemappe über die Dropbox-API entfernt. Bereits vorhandene Dropbox-Dateien bleiben beim Trennen der Verbindung erhalten.
