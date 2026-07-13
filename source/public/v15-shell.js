(() => {
  document.querySelector('.app-version').textContent = 'Version 1.5.0';

  const tools = document.querySelector('.admin-tools');
  const anchor = document.querySelector('#labelManagerButton');
  for (const [id, label] of [
    ['apartmentPagesButton', 'Wohnungsseiten'],
    ['qrSheetButton', 'QR-Druckbogen'],
    ['backupManagerButton', 'Backups verwalten']
  ]) {
    if (document.querySelector(`#${id}`)) continue;
    const button = document.createElement('button');
    button.id = id;
    button.className = 'button button-secondary';
    button.type = 'button';
    button.textContent = label;
    tools.insertBefore(button, anchor);
  }

  document.body.insertAdjacentHTML('beforeend', `
    <dialog id="apartmentPagesDialog" class="wide-dialog">
      <header><div><p class="eyebrow">QR-Übersichten</p><h2>Wohnungsseiten</h2></div><button id="closeApartmentPagesButton" class="icon-button" type="button" aria-label="Schliessen">×</button></header>
      <div class="dialog-content"><p class="manager-note">Jede Wohnung erhält eine dauerhafte Übersichtsseite. Darauf erscheinen die zugeordneten Einträge sowie allgemeine Informationen.</p><div id="apartmentPagesList" class="managed-list"></div></div>
    </dialog>

    <dialog id="qrSheetDialog" class="wide-dialog">
      <header><div><p class="eyebrow">A4-PDF</p><h2>QR-Druckbogen erstellen</h2></div><button id="closeQrSheetButton" class="icon-button" type="button" aria-label="Schliessen">×</button></header>
      <div class="dialog-content">
        <div class="sheet-toolbar">
          <select id="qrSheetApartmentFilter" aria-label="Wohnung"><option value="">Alle Wohnungen/Bereiche</option></select>
          <select id="qrSheetCategoryFilter" aria-label="Kategorie"><option value="">Alle Kategorien</option></select>
          <button id="selectVisibleQrButton" class="button button-secondary" type="button">Gefilterte Einträge auswählen</button>
          <button id="clearQrSelectionButton" class="button button-secondary" type="button">Auswahl löschen</button>
        </div>
        <section><h3>Wohnungsübersichten</h3><div id="qrApartmentChoices" class="choice-list"></div></section>
        <section><h3>Einzelne Einträge</h3><div id="qrDocumentChoices" class="choice-list"></div></section>
        <footer class="sticky-dialog-footer"><span id="qrSelectionCount">0 QR-Codes ausgewählt</span><button id="generateQrSheetButton" class="button button-primary" type="button">PDF erstellen</button></footer>
      </div>
    </dialog>

    <dialog id="backupManagerDialog" class="wide-dialog">
      <header><div><p class="eyebrow">Datensicherung</p><h2>Backups verwalten</h2></div><button id="closeBackupManagerButton" class="icon-button" type="button" aria-label="Schliessen">×</button></header>
      <div class="dialog-content"><div class="manager-toolbar"><div><strong>Automatisch:</strong> 30 tägliche und 12 monatliche Sicherungen</div><button id="createBackupButton" class="button button-primary" type="button">Jetzt sichern</button></div><div id="backupList" class="managed-list"></div></div>
    </dialog>
  `);
})();
