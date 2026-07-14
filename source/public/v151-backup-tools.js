(() => {
  const BACKUPS_URL = '/api/backups';
  const BACKUP_IMPORT_URL = '/api/backup';
  const DROPBOX_OAUTH_URL = '/api/dropbox-oauth';

  function formatDate(value) {
    try { return new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
    catch { return value || ''; }
  }

  function backupType(type) {
    return ({ daily: 'Täglich', monthly: 'Monatlich', manual: 'Manuell', safety: 'Sicherheitskopie' })[type] || type;
  }

  function rebuildInterface() {
    document.querySelector('.app-version').textContent = 'Version 1.5.1';
    document.querySelector('#backupDownloadButton')?.remove();
    document.querySelector('#backupImportButton')?.remove();
    document.querySelector('#backupImportInput')?.remove();

    const oldButton = document.querySelector('#backupManagerButton');
    const newButton = oldButton.cloneNode(true);
    oldButton.replaceWith(newButton);

    document.querySelector('#backupManagerDialog')?.remove();
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="backupManagerDialog" class="wide-dialog">
        <header><div><p class="eyebrow">Datensicherung</p><h2>Backups verwalten</h2></div><button id="closeBackupManagerButton" class="icon-button" type="button" aria-label="Schliessen">×</button></header>
        <div class="dialog-content">
          <div class="manager-toolbar">
            <div><strong>Automatisch:</strong> 30 tägliche und 12 monatliche Sicherungen<small class="manager-subtext">Dropbox kann optional als zweite Kopie verwendet werden.</small></div>
            <div class="manager-toolbar-actions">
              <button id="backupManagerImportButton" class="button button-secondary" type="button">Backup importieren</button>
              <button id="createBackupButton" class="button button-primary" type="button">Jetzt sichern</button>
            </div>
            <input id="backupManagerImportInput" type="file" accept="application/json,.json" hidden>
          </div>
          <section id="dropboxStatusPanel" class="dropbox-status-panel" aria-live="polite">
            <div><strong>Dropbox-Zweitsicherung</strong><p id="dropboxStatusText">Status wird geladen …</p></div>
            <div class="managed-actions">
              <button id="dropboxConnectButton" class="button button-primary" type="button">Dropbox verbinden</button>
              <button id="dropboxTestButton" class="button button-secondary" type="button">Verbindung testen</button>
              <button id="dropboxDisconnectButton" class="button button-secondary" type="button">Trennen</button>
            </div>
          </section>
          <div id="backupList" class="managed-list"></div>
        </div>
      </dialog>`);

    document.querySelector('#backupManagerButton').addEventListener('click', openManager);
    document.querySelector('#closeBackupManagerButton').addEventListener('click', () => document.querySelector('#backupManagerDialog').close());
    document.querySelector('#createBackupButton').addEventListener('click', createBackup);
    document.querySelector('#backupManagerImportButton').addEventListener('click', () => document.querySelector('#backupManagerImportInput').click());
    document.querySelector('#backupManagerImportInput').addEventListener('change', (event) => importBackup(event.target.files?.[0]));
    document.querySelector('#dropboxConnectButton').addEventListener('click', () => connectDropbox().catch((error) => alert(error.message)));
    document.querySelector('#dropboxTestButton').addEventListener('click', () => testDropbox().catch((error) => alert(error.message)));
    document.querySelector('#dropboxDisconnectButton').addEventListener('click', () => disconnectDropbox().catch((error) => alert(error.message)));
  }

  async function loadOverview() {
    const response = await fetch(BACKUPS_URL, { headers: { 'x-admin-password': adminPassword }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Backups konnten nicht geladen werden.');
    return payload;
  }

  function renderDropbox(status = {}) {
    const text = document.querySelector('#dropboxStatusText');
    const panel = document.querySelector('#dropboxStatusPanel');
    const connect = document.querySelector('#dropboxConnectButton');
    const test = document.querySelector('#dropboxTestButton');
    const disconnect = document.querySelector('#dropboxDisconnectButton');

    panel.classList.toggle('dropbox-error', Boolean(status.lastError));
    panel.classList.toggle('dropbox-connected', Boolean(status.connected && !status.lastError));

    if (!status.available) {
      text.textContent = 'Noch nicht vorbereitet. App Key und App Secret müssen einmal bei Netlify hinterlegt werden.';
      connect.hidden = true; test.hidden = true; disconnect.hidden = true;
      return;
    }

    if (!status.connected) {
      text.textContent = `Dropbox-App ist vorbereitet, aber noch nicht verbunden. Ziel: App-Ordner${status.rootPath || '/Geraetemappe-Backups'}`;
      connect.hidden = false; test.hidden = true; disconnect.hidden = true;
      return;
    }

    const success = status.lastSuccessAt ? `Letzte erfolgreiche Verbindung: ${formatDate(status.lastSuccessAt)}.` : 'Verbunden, bisher noch keine Sicherung übertragen.';
    const error = status.lastError ? ` Letzter Fehler: ${status.lastError}` : '';
    const path = status.lastUploadedPath ? ` Letzte Datei: ${status.lastUploadedPath}` : '';
    text.textContent = `${success}${error}${path}`;
    connect.hidden = true; test.hidden = false; disconnect.hidden = false;
  }

  function renderBackups(backups = []) {
    const container = document.querySelector('#backupList');
    container.innerHTML = backups.length ? backups.map((backup) => `
      <div class="managed-row"><div><strong>${escapeHtml(backupType(backup.type))}</strong><small>${escapeHtml(formatDate(backup.createdAt))} · ${backup.documentCount} Einträge · ${backup.apartmentCount} Wohnungsseiten${backup.reason ? ` · ${escapeHtml(backup.reason)}` : ''}</small></div>
        <div class="managed-actions"><button class="button button-secondary" type="button" data-download-backup="${encodeURIComponent(backup.key)}">Herunterladen</button><button class="button button-primary" type="button" data-restore-backup="${encodeURIComponent(backup.key)}">Wiederherstellen</button></div></div>`).join('') : '<p class="picker-empty">Noch keine gespeicherten Backups vorhanden.</p>';
    container.querySelectorAll('[data-download-backup]').forEach((button) => button.addEventListener('click', () => downloadBackup(decodeURIComponent(button.dataset.downloadBackup))));
    container.querySelectorAll('[data-restore-backup]').forEach((button) => button.addEventListener('click', () => restoreBackup(decodeURIComponent(button.dataset.restoreBackup))));
  }

  function renderOverview(payload) {
    renderBackups(Array.isArray(payload.backups) ? payload.backups : []);
    renderDropbox(payload.dropbox || {});
  }

  async function refreshOverview() {
    renderOverview(await loadOverview());
  }

  async function openManager() {
    document.querySelector('#backupList').innerHTML = '<p class="picker-empty">Backups werden geladen …</p>';
    document.querySelector('#backupManagerDialog').showModal();
    try { await refreshOverview(); }
    catch (error) { document.querySelector('#backupList').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`; }
  }

  async function createBackup() {
    const button = document.querySelector('#createBackupButton');
    button.disabled = true;
    try {
      const response = await fetch(BACKUPS_URL, { method: 'POST', headers: { 'x-admin-password': adminPassword } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Backup konnte nicht erstellt werden.');
      renderOverview(payload);
      setStatus(payload.dropbox?.connected && !payload.dropbox?.lastError ? 'Backup lokal und in Dropbox gespeichert.' : 'Backup wurde lokal gespeichert.');
    } catch (error) { alert(error.message); }
    finally { button.disabled = false; }
  }

  async function downloadBackup(key) {
    const response = await fetch(`${BACKUPS_URL}?download=${encodeURIComponent(key)}`, { headers: { 'x-admin-password': adminPassword }, cache: 'no-store' });
    if (!response.ok) throw new Error('Backup konnte nicht heruntergeladen werden.');
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'Geraetemappe-Backup.json';
    downloadBlob(await response.blob(), filename);
  }

  async function restoreBackup(key) {
    if (!confirm('Diesen Sicherungsstand wiederherstellen?\n\nDer aktuelle Stand wird vorher automatisch gesichert.')) return;
    const response = await fetch(BACKUPS_URL, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ key }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return alert(payload.error || 'Wiederherstellung fehlgeschlagen.');
    documents = payload.documents || documents;
    labels = payload.labels || labels;
    apartmentPagesV15 = payload.apartmentPages || apartmentPagesV15;
    render(); renderOverview(payload); setStatus('Sicherungsstand wurde wiederhergestellt.');
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const imported = Array.isArray(payload) ? payload : payload.documents;
      if (!Array.isArray(imported)) throw new Error('Ungültige Backup-Datei.');
      if (!confirm(`${imported.length} Einträge importieren und den aktuellen Stand ersetzen?\n\nVorher wird automatisch eine Sicherheitskopie erstellt.`)) return;
      const response = await fetch(BACKUP_IMPORT_URL, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Backup konnte nicht importiert werden.');
      documents = result.documents || documents;
      labels = result.labels || labels;
      apartmentPagesV15 = result.apartmentPages || apartmentPagesV15;
      render(); await refreshOverview(); setStatus(`${result.imported || imported.length} Einträge wurden importiert.`);
    } catch (error) { alert(error.message); }
    finally { document.querySelector('#backupManagerImportInput').value = ''; }
  }

  async function connectDropbox() {
    const response = await fetch(`${DROPBOX_OAUTH_URL}?action=start`, { headers: { 'x-admin-password': adminPassword }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Dropbox-Verbindung konnte nicht gestartet werden.');
    const popup = window.open(payload.authorizationUrl, 'dropbox-connect', 'width=640,height=760');
    if (!popup) throw new Error('Das Dropbox-Fenster wurde blockiert. Bitte Pop-ups für diese Seite erlauben.');
  }

  async function testDropbox() {
    const response = await fetch(BACKUPS_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ action: 'test-dropbox' }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Dropbox-Test fehlgeschlagen.');
    renderOverview(payload);
    setStatus(payload.dropbox?.lastError ? 'Dropbox-Test meldet einen Fehler.' : 'Dropbox-Verbindung funktioniert.');
  }

  async function disconnectDropbox() {
    if (!confirm('Dropbox von der Gerätemappe trennen? Bereits gespeicherte Dateien in Dropbox bleiben erhalten.')) return;
    const response = await fetch(DROPBOX_OAUTH_URL, { method: 'DELETE', headers: { 'x-admin-password': adminPassword } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Dropbox konnte nicht getrennt werden.');
    renderDropbox(payload.dropbox || {});
    setStatus('Dropbox wurde getrennt.');
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.data?.type !== 'dropbox-connected') return;
    refreshOverview().then(() => setStatus('Dropbox wurde verbunden.')).catch(console.error);
  });

  function initialize() {
    rebuildInterface();
  }

  if (document.readyState === 'complete') initialize();
  else window.addEventListener('load', initialize, { once: true });
})();
