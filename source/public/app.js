const API_URL = "/api/documents";
const EXCEL_URL = "/api/export.xlsx";
const QR_URL = "/api/qr";

let documents = [];
let editingId = null;
let adminPassword = sessionStorage.getItem("geraetemappeAdminPassword") || "";
let isAdmin = false;
let activeQrId = null;

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
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
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
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
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

async function loadDocuments() {
  setStatus("Einträge werden geladen …");
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
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
  try { payload = await response.json(); } catch {}

  if (response.status === 401) {
    sessionStorage.removeItem("geraetemappeAdminPassword");
    adminPassword = "";
    setAdminMode(false);
    throw new Error("Das Verwaltungspasswort ist nicht korrekt.");
  }
  if (!response.ok) throw new Error(payload.error || `Speichern fehlgeschlagen (${response.status})`);

  documents = Array.isArray(payload.documents) ? payload.documents : nextDocuments;
}

function renderFilters() {
  const apartmentFilter = $("#apartmentFilter");
  const categoryFilter = $("#categoryFilter");
  const apartmentValue = apartmentFilter.value;
  const categoryValue = categoryFilter.value;

  apartmentFilter.innerHTML = '<option value="">Alle Bereiche</option>' + unique(documents.map((entry) => entry.apartment))
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
  categoryFilter.innerHTML = '<option value="">Alle Kategorien</option>' + unique(documents.map((entry) => entry.category))
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");

  apartmentFilter.value = [...apartmentFilter.options].some((option) => option.value === apartmentValue) ? apartmentValue : "";
  categoryFilter.value = [...categoryFilter.options].some((option) => option.value === categoryValue) ? categoryValue : "";

  $("#categoryList").innerHTML = unique(documents.map((entry) => entry.category))
    .map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
  $("#apartmentList").innerHTML = unique(documents.map((entry) => entry.apartment))
    .map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
}

function filteredDocuments() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const apartment = $("#apartmentFilter").value;
  const category = $("#categoryFilter").value;

  return documents.filter((entry) => {
    const text = [entry.title, entry.category, entry.apartment, entry.note].join(" ").toLowerCase();
    return (!query || text.includes(query)) &&
      (!apartment || entry.apartment === apartment) &&
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

  entryGrid.innerHTML = list.map((entry) => `
    <article class="entry-card">
      <header>
        <div class="tags"><span class="tag">${escapeHtml(entry.category)}</span><span class="tag">${escapeHtml(entry.apartment)}</span></div>
        <button class="edit-button admin-only" type="button" data-edit="${escapeHtml(entry.id)}">Bearbeiten</button>
      </header>
      <h3>${escapeHtml(entry.title)}</h3>
      <p>${escapeHtml(noteFor(entry))}</p>
      <footer>
        ${entry.link ? `<a class="button button-primary" href="${escapeHtml(directLink(entry.link))}" target="_blank" rel="noopener noreferrer">Dokument öffnen</a>` : `<button class="button button-primary" type="button" data-detail="${escapeHtml(entry.id)}">Information öffnen</button>`}
        <button class="qr-button admin-only" type="button" data-qr="${escapeHtml(entry.id)}">QR</button>
      </footer>
    </article>
  `).join("");

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

  document.title = `${entry.title} · Gerätemappe`;
  $("#detailCard").innerHTML = `
    <div class="tags"><span class="tag">${escapeHtml(entry.category)}</span><span class="tag">${escapeHtml(entry.apartment)}</span></div>
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

function openEntryDialog(id = null) {
  if (!isAdmin) return;
  editingId = id;
  const entry = id ? documents.find((item) => item.id === id) : null;
  $("#entryDialogTitle").textContent = entry ? "Eintrag bearbeiten" : "Eintrag hinzufügen";
  $("#titleInput").value = entry?.title || "";
  $("#categoryInput").value = entry?.category || "";
  $("#apartmentInput").value = entry?.apartment || "";
  $("#linkInput").value = entry?.link || "";
  $("#noteInput").value = entry?.note || "";
  $("#deleteButton").hidden = !entry;
  entryDialog.showModal();
}

async function submitEntry(event) {
  event.preventDefault();
  const link = $("#linkInput").value.trim();
  const note = $("#noteInput").value.trim();

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
    title: $("#titleInput").value.trim(),
    category: $("#categoryInput").value.trim(),
    apartment: $("#apartmentInput").value.trim(),
    link,
    note
  };
  const next = editingId ? documents.map((item) => item.id === editingId ? entry : item) : [...documents, entry];

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
  try { await navigator.clipboard.writeText(value); setStatus("QR-Link kopiert."); }
  catch { prompt("Link kopieren:", value); }
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
  const response = await fetch(EXCEL_URL, { method: "POST", headers: { "x-admin-password": adminPassword } });
  if (!response.ok) throw new Error("Excel-Export fehlgeschlagen.");
  downloadBlob(await response.blob(), `Geraetemappe-Export-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportJson() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), documents };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `Geraetemappe-Sicherung-${new Date().toISOString().slice(0, 10)}.json`);
}

async function importJson(file) {
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const imported = Array.isArray(payload) ? payload : payload.documents;
    if (!Array.isArray(imported)) throw new Error("Ungültige Sicherungsdatei.");
    if (!confirm(`${imported.length} Einträge importieren und die aktuelle Liste ersetzen?`)) return;
    await saveDocuments(imported);
    render();
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
$("#loginForm").addEventListener("submit", login);
$("#backButton").addEventListener("click", () => { history.pushState({}, "", "/"); document.title = "Gerätemappe · Dokumente und Informationen"; renderDetail(); });
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
