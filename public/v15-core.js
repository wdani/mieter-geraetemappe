const APARTMENT_PAGES_URL_V15 = '/api/apartment-pages';
let apartmentPagesV15 = [];
let activeQrV15 = null;

function isGlobalApartmentLabelV15(label) {
  return ['alle wohnungen', 'alle', 'allgemein', 'gesamte liegenschaft', 'ganze liegenschaft']
    .includes(String(label || '').trim().toLocaleLowerCase('de'));
}

function apartmentUrlV15(id) {
  return new URL(`/wohnung/${encodeURIComponent(id)}`, location.origin).toString();
}

function requestedRouteV15() {
  const apartment = location.pathname.match(/^\/wohnung\/([^/]+)\/?$/);
  if (apartment) return { type: 'apartment', id: decodeURIComponent(apartment[1]) };
  const documentMatch = location.pathname.match(/^\/d\/([^/]+)\/?$/);
  if (documentMatch) return { type: 'document', id: decodeURIComponent(documentMatch[1]) };
  return null;
}

async function loadApartmentPagesV15() {
  try {
    const response = await fetch(APARTMENT_PAGES_URL_V15, { cache: 'no-store' });
    const payload = response.ok ? await response.json() : {};
    apartmentPagesV15 = Array.isArray(payload.apartmentPages) ? payload.apartmentPages : [];
  } catch (error) {
    console.error('Wohnungsseiten konnten nicht geladen werden:', error);
  }
}

saveDocuments = async function saveDocumentsV15(nextDocuments, apartmentRenames = []) {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ documents: nextDocuments, apartmentRenames })
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  if (response.status === 401) {
    sessionStorage.removeItem('geraetemappeAdminPassword');
    adminPassword = '';
    setAdminMode(false);
    throw new Error('Das Verwaltungspasswort ist nicht korrekt.');
  }
  if (!response.ok) throw new Error(payload.error || `Speichern fehlgeschlagen (${response.status})`);
  documents = Array.isArray(payload.documents) ? payload.documents : nextDocuments;
  labels = payload.labels || {
    categories: unique(documents.map((entry) => entry.category)),
    apartments: unique(documents.flatMap(getApartments))
  };
  apartmentPagesV15 = Array.isArray(payload.apartmentPages) ? payload.apartmentPages : apartmentPagesV15;
};

function documentsForApartmentV15(label) {
  return documents.filter((entry) => getApartments(entry).some((value) => sameLabel(value, label) || isGlobalApartmentLabelV15(value)));
}

function renderApartmentEntriesV15(page, query = '', category = '') {
  const target = document.querySelector('#apartmentEntryGrid');
  if (!target) return;
  const normalized = query.trim().toLocaleLowerCase('de');
  const list = documentsForApartmentV15(page.label).filter((entry) => {
    const text = [entry.title, entry.category, entry.note, ...getLinks(entry).flatMap((link) => [link.label, link.url])].join(' ').toLocaleLowerCase('de');
    return (!normalized || text.includes(normalized)) && (!category || entry.category === category);
  });
  document.querySelector('#apartmentResultCount').textContent = `${list.length} ${list.length === 1 ? 'Eintrag' : 'Einträge'}`;
  target.innerHTML = list.length ? list.map((entry) => `
    <article class="entry-card">
      <header><div class="tags"><span class="tag">${escapeHtml(entry.category)}</span></div></header>
      <h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(noteFor(entry))}</p>
      <footer>${cardPrimaryAction(entry)}</footer>
    </article>`).join('') : '<div class="empty"><h3>Keine passenden Einträge</h3></div>';
  target.querySelectorAll('[data-detail]').forEach((button) => button.addEventListener('click', () => navigateToV15('document', button.dataset.detail)));
}

const renderDetailBeforeV15 = renderDetail;
renderDetail = function renderDetailV15() {
  const route = requestedRouteV15();
  if (!route || route.type === 'document') {
    renderDetailBeforeV15();
    return;
  }
  overviewView.hidden = true;
  detailView.hidden = false;
  const page = apartmentPagesV15.find((item) => item.id === route.id);
  if (!page) {
    document.querySelector('#detailCard').innerHTML = '<h1>Wohnungsseite nicht gefunden</h1><p>Der QR-Link ist ungültig oder die Wohnung wurde entfernt.</p>';
    return;
  }
  const entries = documentsForApartmentV15(page.label);
  const categories = unique(entries.map((entry) => entry.category));
  document.title = `${page.label} · Gerätemappe`;
  document.querySelector('#detailCard').innerHTML = `
    <div class="tags"><span class="tag">Wohnungsübersicht</span></div>
    <h1>${escapeHtml(page.label)}</h1>
    <p>Alle Geräte, Dokumente und allgemeinen Informationen für diesen Bereich.</p>
    <div class="apartment-page-toolbar"><input id="apartmentPageSearch" type="search" placeholder="In dieser Wohnung suchen …"><select id="apartmentPageCategory"><option value="">Alle Kategorien</option>${categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></div>
    <p id="apartmentResultCount"></p><section id="apartmentEntryGrid" class="apartment-entry-grid"></section>
    <div class="detail-actions"><button class="button button-secondary admin-only" type="button" data-apartment-qr>QR-Code anzeigen</button></div>`;
  renderApartmentEntriesV15(page);
  document.querySelector('#apartmentPageSearch').addEventListener('input', (event) => renderApartmentEntriesV15(page, event.target.value, document.querySelector('#apartmentPageCategory').value));
  document.querySelector('#apartmentPageCategory').addEventListener('change', (event) => renderApartmentEntriesV15(page, document.querySelector('#apartmentPageSearch').value, event.target.value));
  document.querySelector('[data-apartment-qr]')?.addEventListener('click', () => openQrDialog('apartment', page.id));
};

function navigateToV15(type, id) {
  const path = type === 'apartment' ? `/wohnung/${encodeURIComponent(id)}` : `/d/${encodeURIComponent(id)}`;
  history.pushState({}, '', path);
  renderDetail();
  scrollTo({ top: 0, behavior: 'smooth' });
}

const renameLabelBeforeV15 = renameLabel;
renameLabel = async function renameLabelV15(type, oldLabel) {
  if (type !== 'apartment') return renameLabelBeforeV15(type, oldLabel);
  const newLabel = prompt(`„${oldLabel}“ umbenennen in:`, oldLabel)?.trim();
  if (!newLabel || newLabel === oldLabel || newLabel.length > 100) return;
  const existing = allApartmentLabels().find((value) => sameLabel(value, newLabel) && !sameLabel(value, oldLabel));
  if (existing && !confirm(`Das Label „${existing}“ existiert bereits. Beide Labels zusammenführen?`)) return;
  const target = existing || newLabel;
  const next = documents.map((entry) => ({ ...entry, apartments: unique(getApartments(entry).map((value) => sameLabel(value, oldLabel) ? target : value)) }));
  try {
    await saveDocuments(next, [{ from: oldLabel, to: target }]);
    render(); renderLabelManager(); setStatus(`Label „${oldLabel}“ wurde in „${target}“ umbenannt.`);
  } catch (error) { alert(error.message); }
};

openQrDialog = function openQrDialogV15(typeOrId, maybeId) {
  if (!isAdmin) return;
  const type = maybeId ? typeOrId : 'document';
  const id = maybeId || typeOrId;
  const target = type === 'apartment' ? apartmentPagesV15.find((item) => item.id === id) : documents.find((item) => item.id === id);
  if (!target) return;
  const url = type === 'apartment' ? apartmentUrlV15(id) : entryUrl(id);
  activeQrV15 = { type, id, url };
  document.querySelector('#qrTitle').textContent = `QR-Code · ${target.label || target.title}`;
  document.querySelector('#qrUrl').textContent = url;
  document.querySelector('#qrImage').src = `${QR_URL}?type=${type}&id=${encodeURIComponent(id)}&v=${Date.now()}`;
  document.querySelector('#downloadQrButton').href = `${QR_URL}?type=${type}&id=${encodeURIComponent(id)}&download=1`;
  qrDialog.showModal();
};

copyQrLink = async function copyQrLinkV15() {
  const value = activeQrV15?.url;
  if (!value) return;
  try { await navigator.clipboard.writeText(value); setStatus('QR-Link kopiert.'); }
  catch { prompt('Link kopieren:', value); }
};

loadApartmentPagesV15().then(render);
