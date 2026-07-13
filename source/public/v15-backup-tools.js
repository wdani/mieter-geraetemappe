const BACKUPS_URL_V15 = '/api/backups';

function formatBackupTypeV15(type) {
  return ({ daily: 'Täglich', monthly: 'Monatlich', manual: 'Manuell', safety: 'Sicherheitskopie' })[type] || type;
}
function formatDateV15(value) {
  try { return new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return value; }
}

async function loadBackupListV15() {
  const response = await fetch(BACKUPS_URL_V15, { headers: { 'x-admin-password': adminPassword }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Backups konnten nicht geladen werden.');
  return Array.isArray(payload.backups) ? payload.backups : [];
}

function renderBackupListV15(backups) {
  const container = document.querySelector('#backupList');
  container.innerHTML = backups.length ? backups.map((backup) => `
    <div class="managed-row"><div><strong>${escapeHtml(formatBackupTypeV15(backup.type))}</strong><small>${escapeHtml(formatDateV15(backup.createdAt))} · ${backup.documentCount} Einträge · ${backup.apartmentCount} Wohnungsseiten${backup.reason ? ` · ${escapeHtml(backup.reason)}` : ''}</small></div>
      <div class="managed-actions"><button class="button button-secondary" type="button" data-download-backup="${encodeURIComponent(backup.key)}">Herunterladen</button><button class="button button-primary" type="button" data-restore-backup="${encodeURIComponent(backup.key)}">Wiederherstellen</button></div></div>`).join('') : '<p class="picker-empty">Noch keine gespeicherten Backups vorhanden.</p>';
  container.querySelectorAll('[data-download-backup]').forEach((button) => button.addEventListener('click', () => downloadStoredBackupV15(decodeURIComponent(button.dataset.downloadBackup))));
  container.querySelectorAll('[data-restore-backup]').forEach((button) => button.addEventListener('click', () => restoreStoredBackupV15(decodeURIComponent(button.dataset.restoreBackup))));
}

async function openBackupManagerV15() {
  document.querySelector('#backupList').innerHTML = '<p class="picker-empty">Backups werden geladen …</p>';
  document.querySelector('#backupManagerDialog').showModal();
  try { renderBackupListV15(await loadBackupListV15()); } catch (error) { document.querySelector('#backupList').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`; }
}

async function createStoredBackupV15() {
  const button = document.querySelector('#createBackupButton');
  button.disabled = true;
  try {
    const response = await fetch(BACKUPS_URL_V15, { method: 'POST', headers: { 'x-admin-password': adminPassword } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Backup konnte nicht erstellt werden.');
    renderBackupListV15(payload.backups || []); setStatus('Manuelles Backup wurde gespeichert.');
  } catch (error) { alert(error.message); } finally { button.disabled = false; }
}

async function downloadStoredBackupV15(key) {
  const response = await fetch(`${BACKUPS_URL_V15}?download=${encodeURIComponent(key)}`, { headers: { 'x-admin-password': adminPassword }, cache: 'no-store' });
  if (!response.ok) throw new Error('Backup konnte nicht heruntergeladen werden.');
  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'Geraetemappe-Backup.json';
  downloadBlob(await response.blob(), filename);
}

async function restoreStoredBackupV15(key) {
  if (!confirm('Diesen Sicherungsstand wiederherstellen?\n\nDer aktuelle Stand wird vorher automatisch gesichert.')) return;
  const response = await fetch(BACKUPS_URL_V15, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ key }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return alert(payload.error || 'Wiederherstellung fehlgeschlagen.');
  documents = payload.documents || documents; labels = payload.labels || labels; apartmentPagesV15 = payload.apartmentPages || apartmentPagesV15;
  render(); renderBackupListV15(payload.backups || []); setStatus('Sicherungsstand wurde wiederhergestellt.');
}

document.querySelector('#backupManagerButton').addEventListener('click', openBackupManagerV15);
document.querySelector('#closeBackupManagerButton').addEventListener('click', () => document.querySelector('#backupManagerDialog').close());
document.querySelector('#createBackupButton').addEventListener('click', createStoredBackupV15);
