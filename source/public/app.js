const API_URL = "/api/documents";
const LABELS_URL = "/api/labels";
const EXCEL_URL = "/api/export.xlsx";
const QR_URL = "/api/qr";
const BACKUP_URL = "/api/backup";
const MAX_LINKS = 12;

let documents = [];
let labels = { categories: [], apartments: [] };
let editingId = null;
let adminPassword = sessionStorage.getItem("geraetemappeAdminPassword") || "";
let isAdmin = false;
let activeQrId = null;
let selectedCategory = "";
let selectedApartments = new Set();
let draftCategoryLabels = new Set();
let draftApartmentLabels = new Set();

const $ = (selector) => document.querySelector(selector);
const entryGrid = $("#entryGrid");
const overviewView = $("#overviewView");
const detailView = $("#detailView");
const entryDialog = $("#entryDialog");
const loginDialog = $("#loginDialog");
const qrDialog = $("#qrDialog");
const labelDialog = $("#labelDialog");

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function unique(values) {
  const seen = new Map();
  for (const value of values.filter(Boolean)) {
    const text = String(value).trim();
    if (!text) continue;
    const key = text.toLocaleLowerCase("de");
    if (!seen.has(key)) seen.set(key, text);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "de"));
}

function sameLabel(left, right) {
  return String(left || "").trim().toLocaleLowerCase("de") === String(right || "").trim().toLocaleLowerCase("de");
}

function getApartments(entry) {
  if (Array.isArray(entry?.apartments)) return unique(entry.apartments);
  if (typeof entry?.apartment === "string" && entry.apartment.trim()) return [entry.apartment.trim()];
  return [];
}

function getLinks(entry) {
  if (Array.isArray(entry?.links)) {
    return entry.links
      .filter((link) => link && typeof link.url === "string" && link.url.trim())
      .map((link) => ({
        label: typeof link.label === "string" && link.label.trim() ? link.label.trim() : "Dokument",
        url: link.url.trim()
      }))
      .slice(0, MAX_LINKS);
  }
  if (typeof entry?.link === "string" && entry.link.trim()) {
    return [{ label: "Dokument", url: entry.link.trim() }];
  }
  return [];
}

function allCategoryLabels() {
  const dialogValues = entryDialog?.open ? [...draftCategoryLabels, selectedCategory] : [];
  return unique([
    ...(labels.categories || []),
    ...documents.map((entry) => entry.category),
    ...dialogValues
  ]);
}

function allApartmentLabels() {
  const dialogValues = entryDialog?.open ? [...draftApartmentLabels, ...selectedApartments] : [];
  return unique([
    ...(labels.apartments || []),
    ...documents.flatMap(getApartments),
    ...dialogValues
  ]);
}

function createId() {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function entryUrl(id) {
  return new URL(`/d/${encodeURIComponent(id)}`, window.location.origin).toString();
}

function requestedId() {
  const match = window.location.pathname.match(/^\/d\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function directLink(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.hostname.includes("dropbox.com")) {
      url.searchParams.delete("dl");
      url.searchParams.set("raw", "1");
    }
    return url.toString();
  } catch {
    return value;
  }
}

function noteFor(entry) {
  if (entry.note) return entry.note;
  const linkCount = getLinks(entry).length;
  if (linkCount === 1) return "Ein hinterlegter Link ist verfügbar.";
  if (linkCount > 1) return `${linkCount} hinterlegte Links sind verfügbar.`;
  return "Keine zusätzliche Information hinterlegt.";
}

function setStatus(message = "", error = false) {
  const target = $("#statusText");
  target.textContent = message;
  target.style.color = error ? "#b42318" : "";
}

function setAdminMode(enabled) {
  isAdmin = enabled;
  document.body.classList.toggle("admin-mode", enabled);
  $("#adminButton").textContent = enabled ? "Verwaltung beenden" : "Verwaltung";
  render();
}

async function loadLabels() {
  try {
    const response = await fetch(LABELS_URL, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    labels = {
      categories: Array.isArray(payload.categories) ? payload.categories : [],
      apartments: Array.isArray(payload.apartments) ? payload.apartments : []
    };
  } catch (error) {
    console.error("Labels konnten nicht geladen werden:", error);
  }
}

async function loadDocuments() {
  setStatus("Einträge werden geladen …");
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Laden fehlgeschlagen (${response.status})`);
    const payload = await response.json();
    documents = Array.isArray(payload.documents) ? payload.documents : [];
    if (payload.labels) {
      labels = {
        categories: Array.isArray(payload.labels.categories) ? payload.labels.categories : [],
        apartments: Array.isArray(payload.labels.apartments) ? payload.labels.apartments : []
      };
    } else {
      await loadLabels();
    }
    setStatus("");
  } catch (error) {
    console.error(error);
    documents = [];
    setStatus("Die Einträge konnten nicht geladen werden.", true);
  }
  render();
}

async function saveDocuments(nextDocuments) {
  const response = await fetch(API_URL, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify({ documents: nextDocuments })
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {}

  if (response.status === 401) {
    sessionStorage.removeItem("geraetemappeAdminPassword");
    adminPassword = "";
    setAdminMode(false);
    throw new Error("Das Verwaltungspasswort ist nicht korrekt.");
  }
  if (!response.ok) throw new Error(payload.error || `Speichern fehlgeschlagen (${response.status})`);

  documents = Array.isArray(payload.documents) ? payload.documents : nextDocuments;
  labels = payload.labels && typeof payload.labels === "object"
    ? {
        categories: Array.isArray(payload.labels.categories) ? payload.labels.categories : [],
        apartments: Array.isArray(payload.labels.apartments) ? payload.labels.apartments : []
      }
    : {
        categories: unique(documents.map((entry) => entry.category)),
        apartments: unique(documents.flatMap(getApartments))
      };
}

function renderFilters() {
  const apartmentFilter = $("#apartmentFilter");
  const categoryFilter = $("#categoryFilter");
  const apartmentValue = apartmentFilter.value;
  const categoryValue = categoryFilter.value;

  apartmentFilter.innerHTML = '<option value="">Alle Bereiche</option>' + unique(documents.flatMap(getApartments))
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  categoryFilter.innerHTML = '<option value="">Alle Kategorien</option>' + unique(documents.map((entry) => entry.category))
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");

  apartmentFilter.value = [...apartmentFilter.options].some((option) => option.value === apartmentValue) ? apartmentValue : "";
  categoryFilter.value = [...categoryFilter.options].some((option) => option.value === categoryValue) ? categoryValue : "";
}

function filteredDocuments() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("de");
  const apartment = $("#apartmentFilter").value;
  const category = $("#categoryFilter").value;

  return documents.filter((entry) => {
    const apartments = getApartments(entry);
    const links = getLinks(entry);
    const text = [
      entry.title,
      entry.category,
      ...apartments,
      entry.note,
      ...links.flatMap((link) => [link.label, link.url])
    ].join(" ").toLocaleLowerCase("de");

    return (!query || text.includes(query)) &&
      (!apartment || apartments.includes(apartment)) &&
      (!category || entry.category === category);
  });
}

function cardPrimaryAction(entry) {
  const links = getLinks(entry);
  if (links.length === 1) {
    const link = links[0];
    return `<a class="button button-primary" href="${escapeHtml(directLink(link.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
  }
  if (links.length > 1) {
    return `<button class="button button-primary" type="button" data-detail="${escapeHtml(entry.id)}">${links.length} Links anzeigen</button>`;
  }
  return `<button class="button button-primary" type="button" data-detail="${escapeHtml(entry.id)}">Information öffnen</button>`;
}

function renderGrid() {
  const list = filteredDocuments();
  $("#resultCount").textContent = `${list.length} ${list.length === 1 ? "Eintrag" : "Einträge"}`;

  if (!list.length) {
    entryGrid.innerHTML = '<div class="empty"><h3>Keine passenden Einträge</h3><p>Suche oder Filter anpassen.</p></div>';
    return;
  }

  entryGrid.innerHTML = list.map((entry) => {
    const apartmentTags = getApartments(entry)
      .map((value) => `<span class="tag">${escapeHtml(value)}</span>`)
      .join("");

    return `
      <article class="entry-card">
        <header>
          <div class="tags"><span class="tag">${escapeHtml(entry.category)}</span>${apartmentTags}</div>
          <button class="edit-button admin-only" type="button" data-edit="${escapeHtml(entry.id)}">Bearbeiten</button>
        </header>
        <h3>${escapeHtml(entry.title)}</h3>
        <p>${escapeHtml(noteFor(entry))}</p>
        <footer>
          ${cardPrimaryAction(entry)}
          <button class="qr-button admin-only" type="button" data-qr="${escapeHtml(entry.id)}">QR</button>
        </footer>
      </article>
    `;
  }).join("");

  entryGrid.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openEntryDialog(button.dataset.edit)));
  entryGrid.querySelectorAll("[data-qr]").forEach((button) => button.addEventListener("click", () => openQrDialog(button.dataset.qr)));
  entryGrid.querySelectorAll("[data-detail]").forEach((button) => button.addEventListener("click", () => navigateToEntry(button.dataset.detail)));
}

function renderDetail() {
  const id = requestedId();
  if (!id) {
    overviewView.hidden = false;
    detailView.hidden = true;
    return;
  }

  overviewView.hidden = true;
  detailView.hidden = false;
  const entry = documents.find((item) => item.id === id);

  if (!entry) {
    $("#detailCard").innerHTML = '<h1>Eintrag nicht gefunden</h1><p>Der QR-Link ist ungültig oder der Eintrag wurde entfernt.</p>';
    return;
  }

  const apartmentTags = getApartments(entry)
    .map((value) => `<span class="tag">${escapeHtml(value)}</span>`)
    .join("");
  const links = getLinks(entry);
  const linkButtons = links.map((link, index) => `
    <a class="button ${index === 0 ? "button-primary" : "button-secondary"}" href="${escapeHtml(directLink(link.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>
  `).join("");

  document.title = `${entry.title} · Gerätemappe`;
  $("#detailCard").innerHTML = `
    <div class="tags"><span class="tag">${escapeHtml(entry.category)}</span>${apartmentTags}</div>
    <h1>${escapeHtml(entry.title)}</h1>
    <p>${escapeHtml(noteFor(entry))}</p>
    <div class="detail-actions">
      ${linkButtons}
      <button class="button button-secondary admin-only" type="button" data-detail-qr="${escapeHtml(entry.id)}">QR-Code anzeigen</button>
    </div>
  `;
  $("[data-detail-qr]")?.addEventListener("click", () => openQrDialog(entry.id));
}

function render() {
  renderFilters();
  renderGrid();
  renderDetail();
}

function navigateToEntry(id) {
  history.pushState({}, "", `/d/${encodeURIComponent(id)}`);
  renderDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCategoryPicker() {
  const container = $("#categoryPicker");
  const values = allCategoryLabels();

  if (!values.length) {
    container.innerHTML = '<span class="picker-empty">Noch keine Kategorien vorhanden. Unten ein Label anlegen.</span>';
    return;
  }

  container.innerHTML = values.map((value) => `
    <button class="picker-chip ${sameLabel(value, selectedCategory) ? "active" : ""}" type="button" data-category="${encodeURIComponent(value)}">${escapeHtml(value)}</button>
  `).join("");

  container.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = decodeURIComponent(button.dataset.category);
      renderCategoryPicker();
    });
  });
}

function renderApartmentPicker() {
  const container = $("#apartmentPicker");
  const values = allApartmentLabels();

  if (!values.length) {
    container.innerHTML = '<span class="picker-empty">Noch keine Wohnungen oder Bereiche vorhanden. Unten ein Label anlegen.</span>';
    return;
  }

  container.innerHTML = values.map((value) => `
    <button class="picker-chip ${[...selectedApartments].some((selected) => sameLabel(selected, value)) ? "active" : ""}" type="button" data-apartment="${encodeURIComponent(value)}">${escapeHtml(value)}</button>
  `).join("");

  container.querySelectorAll("[data-apartment]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = decodeURIComponent(button.dataset.apartment);
      const existing = [...selectedApartments].find((selected) => sameLabel(selected, value));
      if (existing) selectedApartments.delete(existing);
      else selectedApartments.add(value);
      renderApartmentPicker();
    });
  });
}

function addCategoryLabel() {
  const input = $("#newCategoryInput");
  const value = input.value.trim();
  if (!value) return;

  const existing = allCategoryLabels().find((item) => sameLabel(item, value));
  selectedCategory = existing || value;
  if (!existing) draftCategoryLabels.add(value);
  input.value = "";
  renderCategoryPicker();
}

function addApartmentLabel() {
  const input = $("#newApartmentInput");
  const value = input.value.trim();
  if (!value) return;

  const existing = allApartmentLabels().find((item) => sameLabel(item, value));
  const selected = existing || value;
  selectedApartments.add(selected);
  if (!existing) draftApartmentLabels.add(value);
  input.value = "";
  renderApartmentPicker();
}

function addLinkRow(link = { label: "", url: "" }) {
  const container = $("#linksEditor");
  if (container.children.length >= MAX_LINKS) {
    alert(`Pro Eintrag sind maximal ${MAX_LINKS} Links möglich.`);
    return;
  }

  const row = document.createElement("div");
  row.className = "link-editor-row";
  row.innerHTML = `
    <input class="link-label-input" maxlength="100" placeholder="Bezeichnung, z. B. Anleitung" value="${escapeHtml(link.label || "")}">
    <input class="link-url-input" type="url" maxlength="2000" placeholder="https://…" value="${escapeHtml(link.url || "")}">
    <button class="link-remove-button" type="button" aria-label="Link entfernen">×</button>
  `;
  row.querySelector(".link-remove-button").addEventListener("click", () => {
    row.remove();
    if (!container.children.length) addLinkRow();
  });
  container.appendChild(row);
}

function renderLinkEditor(links) {
  const container = $("#linksEditor");
  container.innerHTML = "";
  const values = links.length ? links : [{ label: "", url: "" }];
  values.forEach((link) => addLinkRow(link));
}

function collectEditedLinks() {
  const rows = [...$("#linksEditor").querySelectorAll(".link-editor-row")];
  const result = [];

  for (const [index, row] of rows.entries()) {
    const label = row.querySelector(".link-label-input").value.trim();
    const url = row.querySelector(".link-url-input").value.trim();
    if (!label && !url) continue;
    if (!label || !url) {
      throw new Error(`Beim Link ${index + 1} müssen Bezeichnung und URL ausgefüllt sein.`);
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error();
    } catch {
      throw new Error(`Der Link „${label}“ muss mit https:// beginnen.`);
    }
    result.push({ label, url });
  }

  return result;
}

function openEntryDialog(id = null) {
  if (!isAdmin) return;
  editingId = id;
  const entry = id ? documents.find((item) => item.id === id) : null;

  draftCategoryLabels = new Set();
  draftApartmentLabels = new Set();
  $("#entryDialogTitle").textContent = entry ? "Eintrag bearbeiten" : "Eintrag hinzufügen";
  $("#titleInput").value = entry?.title || "";
  $("#noteInput").value = entry?.note || "";
  selectedCategory = entry?.category || "";
  selectedApartments = new Set(entry ? getApartments(entry) : []);
  $("#deleteButton").hidden = !entry;
  $("#duplicateButton").hidden = !entry;
  $("#newCategoryInput").value = "";
  $("#newApartmentInput").value = "";
  renderCategoryPicker();
  renderApartmentPicker();
  renderLinkEditor(entry ? getLinks(entry) : []);
  entryDialog.showModal();
}

function duplicateEntry() {
  if (!editingId || !isAdmin) return;
  const original = documents.find((entry) => entry.id === editingId);
  if (!original) return;

  editingId = null;
  $("#entryDialogTitle").textContent = "Eintrag hinzufügen (Kopie)";
  $("#titleInput").value = `${original.title} (Kopie)`;
  $("#noteInput").value = original.note || "";
  selectedCategory = original.category;
  selectedApartments = new Set(getApartments(original));
  $("#deleteButton").hidden = true;
  $("#duplicateButton").hidden = true;
  renderCategoryPicker();
  renderApartmentPicker();
  renderLinkEditor(getLinks(original));
  $("#titleInput").focus();
}

async function submitEntry(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    entryDialog.close();
    editingId = null;
    draftCategoryLabels.clear();
    draftApartmentLabels.clear();
    return;
  }

  const note = $("#noteInput").value.trim();
  const title = $("#titleInput").value.trim();
  let links;
  try {
    links = collectEditedLinks();
  } catch (error) {
    alert(error.message);
    return;
  }

  if (!title) return alert("Bitte einen Titel eintragen.");
  if (!selectedCategory) return alert("Bitte eine Kategorie auswählen oder anlegen.");
  if (!selectedApartments.size) return alert("Bitte mindestens eine Wohnung oder einen Bereich auswählen.");
  if (!links.length && !note) return alert("Bitte eine Notiz oder mindestens einen Link eintragen.");

  const entry = {
    id: editingId || createId(),
    title,
    category: selectedCategory,
    apartments: [...selectedApartments],
    links,
    note
  };
  const next = editingId
    ? documents.map((item) => item.id === editingId ? entry : item)
    : [...documents, entry];

  try {
    await saveDocuments(next);
    entryDialog.close();
    editingId = null;
    draftCategoryLabels.clear();
    draftApartmentLabels.clear();
    setStatus("Eintrag gespeichert. Nicht mehr verwendete Labels wurden automatisch bereinigt.");
    render();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteEntry() {
  if (!editingId || !confirm("Diesen Eintrag wirklich löschen?")) return;
  try {
    await saveDocuments(documents.filter((item) => item.id !== editingId));
    entryDialog.close();
    editingId = null;
    setStatus("Eintrag gelöscht. Nicht mehr verwendete Labels wurden automatisch entfernt.");
    render();
  } catch (error) {
    alert(error.message);
  }
}

function categoryUsage(label) {
  return documents.filter((entry) => sameLabel(entry.category, label)).length;
}

function apartmentUsage(label) {
  return documents.filter((entry) => getApartments(entry).some((value) => sameLabel(value, label))).length;
}

function renderManagedLabelList(type) {
  const isCategory = type === "category";
  const values = isCategory ? allCategoryLabels() : allApartmentLabels();
  const container = isCategory ? $("#categoryLabelList") : $("#apartmentLabelList");

  if (!values.length) {
    container.innerHTML = '<p class="picker-empty">Keine verwendeten Labels vorhanden.</p>';
    return;
  }

  container.innerHTML = values.map((label) => {
    const usage = isCategory ? categoryUsage(label) : apartmentUsage(label);
    return `
      <div class="managed-label-row">
        <div><strong>${escapeHtml(label)}</strong><small>${usage} ${usage === 1 ? "Eintrag" : "Einträge"}</small></div>
        <div class="managed-label-actions">
          <button class="button button-secondary" type="button" data-rename-label="${encodeURIComponent(label)}" data-label-type="${type}">Umbenennen</button>
          <button class="button button-danger" type="button" data-delete-label="${encodeURIComponent(label)}" data-label-type="${type}">Löschen</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-rename-label]").forEach((button) => {
    button.addEventListener("click", () => renameLabel(button.dataset.labelType, decodeURIComponent(button.dataset.renameLabel)));
  });
  container.querySelectorAll("[data-delete-label]").forEach((button) => {
    button.addEventListener("click", () => deleteLabel(button.dataset.labelType, decodeURIComponent(button.dataset.deleteLabel)));
  });
}

function renderLabelManager() {
  renderManagedLabelList("category");
  renderManagedLabelList("apartment");
}

function openLabelManager() {
  if (!isAdmin) return;
  renderLabelManager();
  labelDialog.showModal();
}

async function renameLabel(type, oldLabel) {
  const newLabel = prompt(`„${oldLabel}“ umbenennen in:`, oldLabel)?.trim();
  if (!newLabel || newLabel === oldLabel) return;
  if (newLabel.length > 100) return alert("Ein Label darf höchstens 100 Zeichen lang sein.");

  const existing = (type === "category" ? allCategoryLabels() : allApartmentLabels())
    .find((value) => sameLabel(value, newLabel) && !sameLabel(value, oldLabel));
  if (existing && !confirm(`Das Label „${existing}“ existiert bereits. Beide Labels zusammenführen?`)) return;
  const target = existing || newLabel;

  const next = documents.map((entry) => {
    if (type === "category") {
      return sameLabel(entry.category, oldLabel) ? { ...entry, category: target } : entry;
    }
    const apartments = unique(getApartments(entry).map((value) => sameLabel(value, oldLabel) ? target : value));
    return { ...entry, apartments };
  });

  try {
    await saveDocuments(next);
    render();
    renderLabelManager();
    setStatus(`Label „${oldLabel}“ wurde in „${target}“ umbenannt.`);
  } catch (error) {
    alert(error.message);
  }
}

async function deleteLabel(type, label) {
  if (type === "category") {
    const affected = categoryUsage(label);
    const alternatives = allCategoryLabels().filter((value) => !sameLabel(value, label));
    if (!affected) {
      await loadLabels();
      renderLabelManager();
      return;
    }

    const suggestion = alternatives[0] || "Allgemein";
    const replacement = prompt(
      `Das Kategorie-Label „${label}“ wird noch von ${affected} Einträgen verwendet.\n\nBitte ein Ersatz-Label eingeben:`,
      suggestion
    )?.trim();
    if (!replacement || sameLabel(replacement, label)) return;
    if (!confirm(`„${label}“ löschen und die betroffenen Einträge „${replacement}“ zuordnen?`)) return;

    try {
      await saveDocuments(documents.map((entry) => sameLabel(entry.category, label) ? { ...entry, category: replacement } : entry));
      render();
      renderLabelManager();
      setStatus(`Kategorie „${label}“ wurde gelöscht und durch „${replacement}“ ersetzt.`);
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  const affectedEntries = documents.filter((entry) => getApartments(entry).some((value) => sameLabel(value, label)));
  if (!affectedEntries.length) {
    await loadLabels();
    renderLabelManager();
    return;
  }

  const orphaned = affectedEntries.filter((entry) => getApartments(entry).filter((value) => !sameLabel(value, label)).length === 0);
  let replacement = "";
  if (orphaned.length) {
    const alternatives = allApartmentLabels().filter((value) => !sameLabel(value, label));
    replacement = prompt(
      `${orphaned.length} Einträge hätten danach keine Wohnung oder keinen Bereich mehr.\n\nBitte ein Ersatz-Label eingeben:`,
      alternatives[0] || "Alle Wohnungen"
    )?.trim() || "";
    if (!replacement || sameLabel(replacement, label)) return;
  }

  if (!confirm(`Das Label „${label}“ aus ${affectedEntries.length} Einträgen entfernen?`)) return;

  const next = documents.map((entry) => {
    let apartments = getApartments(entry).filter((value) => !sameLabel(value, label));
    if (!apartments.length && replacement) apartments = [replacement];
    return { ...entry, apartments };
  });

  try {
    await saveDocuments(next);
    render();
    renderLabelManager();
    setStatus(`Wohnungs-/Bereichs-Label „${label}“ wurde gelöscht.`);
  } catch (error) {
    alert(error.message);
  }
}

async function login(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    loginDialog.close();
    return;
  }

  adminPassword = $("#passwordInput").value;
  $("#loginError").textContent = "";
  try {
    await saveDocuments(documents);
    sessionStorage.setItem("geraetemappeAdminPassword", adminPassword);
    loginDialog.close();
    setAdminMode(true);
  } catch (error) {
    $("#loginError").textContent = error.message;
  }
}

function toggleAdmin() {
  if (isAdmin) {
    sessionStorage.removeItem("geraetemappeAdminPassword");
    adminPassword = "";
    setAdminMode(false);
    return;
  }
  $("#passwordInput").value = "";
  $("#loginError").textContent = "";
  loginDialog.showModal();
}

function openQrDialog(id) {
  if (!isAdmin) return;
  const entry = documents.find((item) => item.id === id);
  if (!entry) return;
  activeQrId = id;
  $("#qrTitle").textContent = `QR-Code · ${entry.title}`;
  $("#qrUrl").textContent = entryUrl(id);
  $("#qrImage").src = `${QR_URL}?id=${encodeURIComponent(id)}&v=${Date.now()}`;
  $("#downloadQrButton").href = `${QR_URL}?id=${encodeURIComponent(id)}&download=1`;
  qrDialog.showModal();
}

async function copyQrLink() {
  if (!activeQrId) return;
  const value = entryUrl(activeQrId);
  try {
    await navigator.clipboard.writeText(value);
    setStatus("QR-Link kopiert.");
  } catch {
    prompt("Link kopieren:", value);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportExcel() {
  const response = await fetch(EXCEL_URL, {
    method: "POST",
    headers: { "x-admin-password": adminPassword }
  });
  if (!response.ok) throw new Error("Excel-Export fehlgeschlagen.");
  downloadBlob(
    await response.blob(),
    `Geraetemappe-Export-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

async function downloadBackup() {
  const response = await fetch(BACKUP_URL, {
    method: "GET",
    headers: { "x-admin-password": adminPassword },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Backup konnte nicht heruntergeladen werden.");

  const disposition = response.headers.get("content-disposition") || "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1]
    || `Geraetemappe-Backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  downloadBlob(await response.blob(), filename);
  setStatus("Backup wurde heruntergeladen.");
}

async function importBackup(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const importedDocuments = Array.isArray(payload) ? payload : payload?.documents;
    if (!Array.isArray(importedDocuments)) throw new Error("Die Datei enthält kein gültiges Gerätemappe-Backup.");

    const linkCount = importedDocuments.reduce((sum, entry) => sum + getLinks(entry).length, 0);
    const categories = unique(importedDocuments.map((entry) => entry?.category));
    const apartments = unique(importedDocuments.flatMap(getApartments));
    const confirmed = confirm(
      `Backup importieren?\n\n` +
      `${importedDocuments.length} Einträge\n` +
      `${linkCount} Links\n` +
      `${categories.length} Kategorien\n` +
      `${apartments.length} Wohnungen/Bereiche\n\n` +
      `Der aktuelle Datenstand wird davor automatisch als Sicherheitskopie gespeichert.`
    );
    if (!confirmed) return;

    const response = await fetch(BACKUP_URL, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-admin-password": adminPassword
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Backup-Import fehlgeschlagen.");

    documents = Array.isArray(result.documents) ? result.documents : importedDocuments;
    labels = result.labels || {
      categories: unique(documents.map((entry) => entry.category)),
      apartments: unique(documents.flatMap(getApartments))
    };
    render();
    setStatus(`Backup mit ${documents.length} Einträgen importiert. Sicherheitskopie wurde erstellt.`);
  } catch (error) {
    alert(error.message);
  } finally {
    $("#backupImportInput").value = "";
  }
}

entryDialog.addEventListener("close", () => {
  editingId = null;
  draftCategoryLabels.clear();
  draftApartmentLabels.clear();
});

$("#searchInput").addEventListener("input", renderGrid);
$("#apartmentFilter").addEventListener("change", renderGrid);
$("#categoryFilter").addEventListener("change", renderGrid);
$("#adminButton").addEventListener("click", toggleAdmin);
$("#addButton").addEventListener("click", () => openEntryDialog());
$("#entryForm").addEventListener("submit", submitEntry);
$("#deleteButton").addEventListener("click", deleteEntry);
$("#duplicateButton").addEventListener("click", duplicateEntry);
$("#addCategoryButton").addEventListener("click", addCategoryLabel);
$("#addApartmentButton").addEventListener("click", addApartmentLabel);
$("#addLinkButton").addEventListener("click", () => addLinkRow());
$("#newCategoryInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCategoryLabel();
  }
});
$("#newApartmentInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addApartmentLabel();
  }
});
$("#labelManagerButton").addEventListener("click", openLabelManager);
$("#closeLabelManagerButton").addEventListener("click", () => labelDialog.close());
$("#loginForm").addEventListener("submit", login);
$("#backButton").addEventListener("click", () => {
  history.pushState({}, "", "/");
  document.title = "Gerätemappe · Dokumente und Informationen";
  renderDetail();
});
$("#qrCloseButton").addEventListener("click", () => qrDialog.close());
$("#copyQrButton").addEventListener("click", copyQrLink);
$("#excelButton").addEventListener("click", () => exportExcel().catch((error) => alert(error.message)));
$("#backupDownloadButton").addEventListener("click", () => downloadBackup().catch((error) => alert(error.message)));
$("#backupImportButton").addEventListener("click", () => $("#backupImportInput").click());
$("#backupImportInput").addEventListener("change", (event) => importBackup(event.target.files?.[0]));
window.addEventListener("popstate", renderDetail);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(console.error));
}

loadDocuments();
