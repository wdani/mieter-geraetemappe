const API_URL = "/api/documents";
const LABELS_URL = "/api/labels";
const EXCEL_URL = "/api/export.xlsx";
const QR_URL = "/api/qr";

let documents = [];
let labels = { categories: [], apartments: [] };
let editingId = null;
let adminPassword = sessionStorage.getItem("geraetemappeAdminPassword") || "";
let isAdmin = false;
let activeQrId = null;
let selectedCategory = "";
let selectedApartments = new Set();

const $ = (selector) => document.querySelector(selector);
const entryGrid = $("#entryGrid");
const overviewView = $("#overviewView");
const detailView = $("#detailView");
const entryDialog = $("#entryDialog");
const loginDialog = $("#loginDialog");
const qrDialog = $("#qrDialog");

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

function getApartments(entry) {
  if (Array.isArray(entry?.apartments)) return unique(entry.apartments);
  if (typeof entry?.apartment === "string" && entry.apartment.trim()) return [entry.apartment.trim()];
  return [];
}

function allCategoryLabels() {
  return unique([...(labels.categories || []), ...documents.map((entry) => entry.category)]);
}

function allApartmentLabels() {
  return unique([...(labels.apartments || []), ...documents.flatMap(getApartments)]);
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
      url.searchParams.set("dl", "1");
      url.searchParams.delete("raw");
    }
    return url.toString();
  } catch {
    return value;
  }
}

function noteFor(entry) {
  if (entry.note) return entry.note;
  if (entry.link) return "Dokument direkt über den hinterlegten Link öffnen.";
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
    const [response] = await Promise.all([
      fetch(API_URL, { cache: "no-store" }),
      loadLabels()
    ]);
    if (!response.ok) throw new Error(`Laden fehlgeschlagen (${response.status})`);
    const payload = await response.json();
    documents = Array.isArray(payload.documents) ? payload.documents : [];
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
}

async function saveLabels(nextLabels) {
  const response = await fetch(LABELS_URL, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify(nextLabels)
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {}

  if (response.status === 401) throw new Error("Das Verwaltungspasswort ist nicht korrekt.");
  if (!response.ok) throw new Error(payload.error || `Labels konnten nicht gespeichert werden (${response.status})`);

  labels = {
    categories: Array.isArray(payload.categories) ? payload.categories : nextLabels.categories,
    apartments: Array.isArray(payload.apartments) ? payload.apartments : nextLabels.apartments
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
    const text = [entry.title, entry.category, ...apartments, entry.note].join(" ").toLocaleLowerCase("de");
    return (!query || text.includes(query)) &&
      (!apartment || apartments.includes(apartment)) &&
      (!category || entry.category === category);
  });
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
          ${entry.link ? `<a class="button button-primary" href="${escapeHtml(directLink(entry.link))}" target="_blank" rel="noopener noreferrer">Dokument öffnen</a>` : `<button class="button button-primary" type="button" data-detail="${escapeHtml(entry.id)}">Information öffnen</button>`}
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

  document.title = `${entry.title} · Gerätemappe`;
  $("#detailCard").innerHTML = `
    <div class="tags"><span class="tag">${escapeHtml(entry.category)}</span>${apartmentTags}</div>
    <h1>${escapeHtml(entry.title)}</h1>
    <p>${escapeHtml(noteFor(entry))}</p>
    <div class="detail-actions">
      ${entry.link ? `<a class="button button-primary" href="${escapeHtml(directLink(entry.link))}" target="_blank" rel="noopener noreferrer">Dokument öffnen</a>` : ""}
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
    <button class="picker-chip ${value === selectedCategory ? "active" : ""}" type="button" data-category="${encodeURIComponent(value)}">${escapeHtml(value)}</button>
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
    <button class="picker-chip ${selectedApartments.has(value) ? "active" : ""}" type="button" data-apartment="${encodeURIComponent(value)}">${escapeHtml(value)}</button>
  `).join("");

  container.querySelectorAll("[data-apartment]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = decodeURIComponent(button.dataset.apartment);
      if (selectedApartments.has(value)) selectedApartments.delete(value);
      else selectedApartments.add(value);
      renderApartmentPicker();
    });
  });
}

async function addCategoryLabel() {
  const input = $("#newCategoryInput");
  const value = input.value.trim();
  if (!value) return;

  const existing = allCategoryLabels().find((item) => item.toLocaleLowerCase("de") === value.toLocaleLowerCase("de"));
  if (existing) {
    selectedCategory = existing;
    input.value = "";
    renderCategoryPicker();
    return;
  }

  const nextLabels = {
    categories: unique([...(labels.categories || []), value]),
    apartments: labels.apartments || []
  };

  try {
    await saveLabels(nextLabels);
    selectedCategory = value;
    input.value = "";
    renderCategoryPicker();
    setStatus("Kategorie-Label gespeichert.");
  } catch (error) {
    alert(error.message);
  }
}

async function addApartmentLabel() {
  const input = $("#newApartmentInput");
  const value = input.value.trim();
  if (!value) return;

  const existing = allApartmentLabels().find((item) => item.toLocaleLowerCase("de") === value.toLocaleLowerCase("de"));
  if (existing) {
    selectedApartments.add(existing);
    input.value = "";
    renderApartmentPicker();
    return;
  }

  const nextLabels = {
    categories: labels.categories || [],
    apartments: unique([...(labels.apartments || []), value])
  };

  try {
    await saveLabels(nextLabels);
    selectedApartments.add(value);
    input.value = "";
    renderApartmentPicker();
    setStatus("Wohnungs-/Bereichs-Label gespeichert.");
  } catch (error) {
    alert(error.message);
  }
}

function openEntryDialog(id = null) {
  if (!isAdmin) return;
  editingId = id;
  const entry = id ? documents.find((item) => item.id === id) : null;

  $("#entryDialogTitle").textContent = entry ? "Eintrag bearbeiten" : "Eintrag hinzufügen";
  $("#titleInput").value = entry?.title || "";
  $("#linkInput").value = entry?.link || "";
  $("#noteInput").value = entry?.note || "";
  selectedCategory = entry?.category || "";
  selectedApartments = new Set(entry ? getApartments(entry) : []);
  $("#deleteButton").hidden = !entry;
  $("#duplicateButton").hidden = !entry;
  $("#newCategoryInput").value = "";
  $("#newApartmentInput").value = "";
  renderCategoryPicker();
  renderApartmentPicker();
  entryDialog.showModal();
}

function duplicateEntry() {
  if (!editingId || !isAdmin) return;
  const original = documents.find((entry) => entry.id === editingId);
  if (!original) return;

  editingId = null;
  $("#entryDialogTitle").textContent = "Eintrag hinzufügen (Kopie)";
  $("#titleInput").value = `${original.title} (Kopie)`;
  $("#linkInput").value = original.link || "";
  $("#noteInput").value = original.note || "";
  selectedCategory = original.category;
  selectedApartments = new Set(getApartments(original));
  $("#deleteButton").hidden = true;
  $("#duplicateButton").hidden = true;
  renderCategoryPicker();
  renderApartmentPicker();
  $("#titleInput").focus();
}

async function submitEntry(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    entryDialog.close();
    editingId = null;
    return;
  }

  const link = $("#linkInput").value.trim();
  const note = $("#noteInput").value.trim();
  const title = $("#titleInput").value.trim();

  if (!title) {
    alert("Bitte einen Titel eintragen.");
    return;
  }
  if (!selectedCategory) {
    alert("Bitte eine Kategorie auswählen oder anlegen.");
    return;
  }
  if (!selectedApartments.size) {
    alert("Bitte mindestens eine Wohnung oder einen Bereich auswählen.");
    return;
  }
  if (!link && !note) {
    alert("Bitte eine Notiz oder einen Dokument-Link eintragen.");
    return;
  }
  if (link) {
    try {
      const url = new URL(link);
      if (url.protocol !== "https:") throw new Error();
    } catch {
      alert("Der Dokument-Link muss mit https:// beginnen.");
      return;
    }
  }

  const entry = {
    id: editingId || createId(),
    title,
    category: selectedCategory,
    apartments: [...selectedApartments],
    link,
    note
  };
  const next = editingId
    ? documents.map((item) => item.id === editingId ? entry : item)
    : [...documents, entry];

  try {
    await saveDocuments(next);
    entryDialog.close();
    editingId = null;
    setStatus("Eintrag gespeichert.");
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
    setStatus("Eintrag gelöscht.");
    render();
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
  link.click();
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

function exportJson() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    labels,
    documents
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `Geraetemappe-Sicherung-${new Date().toISOString().slice(0, 10)}.json`
  );
}

async function importJson(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const imported = Array.isArray(payload) ? payload : payload.documents;
    if (!Array.isArray(imported)) throw new Error("Ungültige Sicherungsdatei.");
    if (!confirm(`${imported.length} Einträge importieren und die aktuelle Liste ersetzen?`)) return;

    if (payload.labels && typeof payload.labels === "object") {
      await saveLabels({
        categories: Array.isArray(payload.labels.categories) ? payload.labels.categories : [],
        apartments: Array.isArray(payload.labels.apartments) ? payload.labels.apartments : []
      });
    }

    await saveDocuments(imported);
    render();
    setStatus("JSON-Sicherung importiert.");
  } catch (error) {
    alert(error.message);
  } finally {
    $("#jsonImportInput").value = "";
  }
}

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
$("#loginForm").addEventListener("submit", login);
$("#backButton").addEventListener("click", () => {
  history.pushState({}, "", "/");
  document.title = "Gerätemappe · Dokumente und Informationen";
  renderDetail();
});
$("#qrCloseButton").addEventListener("click", () => qrDialog.close());
$("#copyQrButton").addEventListener("click", copyQrLink);
$("#excelButton").addEventListener("click", () => exportExcel().catch((error) => alert(error.message)));
$("#jsonExportButton").addEventListener("click", exportJson);
$("#jsonImportButton").addEventListener("click", () => $("#jsonImportInput").click());
$("#jsonImportInput").addEventListener("change", (event) => importJson(event.target.files?.[0]));
window.addEventListener("popstate", renderDetail);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(console.error));
}

loadDocuments();
