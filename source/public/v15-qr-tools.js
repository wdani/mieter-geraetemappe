const QR_SHEET_URL_V15 = '/api/qr-sheet';
const selectedQrItemsV15 = new Set();

function qrSelectionKeyV15(type, id) { return `${type}:${id}`; }
function updateQrSelectionCountV15() {
  document.querySelector('#qrSelectionCount').textContent = `${selectedQrItemsV15.size} QR-Codes ausgewählt`;
  document.querySelector('#generateQrSheetButton').disabled = selectedQrItemsV15.size === 0;
}

function renderApartmentPagesManagerV15() {
  const container = document.querySelector('#apartmentPagesList');
  container.innerHTML = apartmentPagesV15.length ? apartmentPagesV15.map((page) => `
    <div class="managed-row"><div><strong>${escapeHtml(page.label)}</strong><small>${page.entryCount ?? documentsForApartmentV15(page.label).length} Einträge · Code ${escapeHtml(page.id.slice(-8).toUpperCase())}</small></div>
      <div class="managed-actions">
        <button class="button button-secondary" type="button" data-open-apartment="${escapeHtml(page.id)}">Öffnen</button>
        <button class="button button-secondary" type="button" data-copy-apartment="${escapeHtml(page.id)}">Link kopieren</button>
        <button class="button button-primary" type="button" data-qr-apartment="${escapeHtml(page.id)}">QR-Code</button>
      </div></div>`).join('') : '<p class="picker-empty">Noch keine einzelnen Wohnungen oder Bereiche vorhanden.</p>';
  container.querySelectorAll('[data-open-apartment]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#apartmentPagesDialog').close(); navigateToV15('apartment', button.dataset.openApartment); }));
  container.querySelectorAll('[data-copy-apartment]').forEach((button) => button.addEventListener('click', async () => {
    const value = apartmentUrlV15(button.dataset.copyApartment);
    try { await navigator.clipboard.writeText(value); setStatus('Wohnungslink kopiert.'); } catch { prompt('Link kopieren:', value); }
  }));
  container.querySelectorAll('[data-qr-apartment]').forEach((button) => button.addEventListener('click', () => openQrDialog('apartment', button.dataset.qrApartment)));
}

async function openApartmentPagesManagerV15() {
  await loadApartmentPagesV15();
  renderApartmentPagesManagerV15();
  document.querySelector('#apartmentPagesDialog').showModal();
}

function renderQrSheetFiltersV15() {
  document.querySelector('#qrSheetApartmentFilter').innerHTML = '<option value="">Alle Wohnungen/Bereiche</option>' + unique(documents.flatMap(getApartments)).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  document.querySelector('#qrSheetCategoryFilter').innerHTML = '<option value="">Alle Kategorien</option>' + unique(documents.map((entry) => entry.category)).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
}

function qrSheetVisibleDocumentsV15() {
  const apartment = document.querySelector('#qrSheetApartmentFilter').value;
  const category = document.querySelector('#qrSheetCategoryFilter').value;
  return documents.filter((entry) => (!apartment || getApartments(entry).includes(apartment)) && (!category || entry.category === category));
}

function bindChoiceListV15(container) {
  container.querySelectorAll('input[data-qr-choice]').forEach((input) => input.addEventListener('change', () => {
    if (input.checked) selectedQrItemsV15.add(input.dataset.qrChoice); else selectedQrItemsV15.delete(input.dataset.qrChoice);
    updateQrSelectionCountV15();
  }));
}

function renderQrSheetChoicesV15() {
  const apartmentContainer = document.querySelector('#qrApartmentChoices');
  apartmentContainer.innerHTML = apartmentPagesV15.length ? apartmentPagesV15.map((page) => {
    const key = qrSelectionKeyV15('apartment', page.id);
    return `<label class="choice-row"><input type="checkbox" data-qr-choice="${key}" ${selectedQrItemsV15.has(key) ? 'checked' : ''}><span><strong>${escapeHtml(page.label)}</strong><small>Wohnungsübersicht</small></span></label>`;
  }).join('') : '<p class="picker-empty">Keine Wohnungsseiten vorhanden.</p>';
  const documentContainer = document.querySelector('#qrDocumentChoices');
  const list = qrSheetVisibleDocumentsV15();
  documentContainer.innerHTML = list.length ? list.map((entry) => {
    const key = qrSelectionKeyV15('document', entry.id);
    return `<label class="choice-row"><input type="checkbox" data-qr-choice="${key}" ${selectedQrItemsV15.has(key) ? 'checked' : ''}><span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.category)} · ${escapeHtml(getApartments(entry).join(', '))}</small></span></label>`;
  }).join('') : '<p class="picker-empty">Keine passenden Einträge.</p>';
  bindChoiceListV15(apartmentContainer); bindChoiceListV15(documentContainer); updateQrSelectionCountV15();
}

async function openQrSheetManagerV15() {
  await loadApartmentPagesV15();
  selectedQrItemsV15.clear(); renderQrSheetFiltersV15(); renderQrSheetChoicesV15();
  document.querySelector('#qrSheetDialog').showModal();
}

function selectVisibleQrEntriesV15() {
  qrSheetVisibleDocumentsV15().forEach((entry) => selectedQrItemsV15.add(qrSelectionKeyV15('document', entry.id)));
  renderQrSheetChoicesV15();
}

async function generateQrSheetV15() {
  const items = [...selectedQrItemsV15].map((value) => { const [type, id] = value.split(':'); return { type, id }; });
  const response = await fetch(QR_SHEET_URL_V15, { method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify({ items }) });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const error = contentType.includes('json') ? await response.json() : {};
    throw new Error(error.error || 'QR-Druckbogen konnte nicht erstellt werden.');
  }
  downloadBlob(await response.blob(), `Geraetemappe-QR-Druckbogen-${new Date().toISOString().slice(0, 10)}.pdf`);
  setStatus('QR-Druckbogen wurde erstellt.');
}

document.querySelector('#apartmentPagesButton').addEventListener('click', openApartmentPagesManagerV15);
document.querySelector('#closeApartmentPagesButton').addEventListener('click', () => document.querySelector('#apartmentPagesDialog').close());
document.querySelector('#qrSheetButton').addEventListener('click', openQrSheetManagerV15);
document.querySelector('#closeQrSheetButton').addEventListener('click', () => document.querySelector('#qrSheetDialog').close());
document.querySelector('#qrSheetApartmentFilter').addEventListener('change', renderQrSheetChoicesV15);
document.querySelector('#qrSheetCategoryFilter').addEventListener('change', renderQrSheetChoicesV15);
document.querySelector('#selectVisibleQrButton').addEventListener('click', selectVisibleQrEntriesV15);
document.querySelector('#clearQrSelectionButton').addEventListener('click', () => { selectedQrItemsV15.clear(); renderQrSheetChoicesV15(); });
document.querySelector('#generateQrSheetButton').addEventListener('click', () => generateQrSheetV15().catch((error) => alert(error.message)));
