import ExcelJS from "exceljs";
import type { Config, Context } from "@netlify/functions";
import { isAuthorized, readDocuments } from "./_shared.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") return json({ error: "Methode nicht erlaubt." }, 405);
  if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);

  const origin = new URL(request.url).origin;
  const documents = (await readDocuments()).sort((a, b) =>
    (a.apartments[0] || "").localeCompare(b.apartments[0] || "", "de") ||
    a.category.localeCompare(b.category, "de") ||
    a.title.localeCompare(b.title, "de")
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Gerätemappe";
  workbook.created = new Date();
  workbook.modified = new Date();

  const info = workbook.addWorksheet("Übersicht", { views: [{ showGridLines: false }] });
  info.columns = [{ width: 24 }, { width: 72 }];
  info.addRows([
    ["Gerätemappe – Export", ""],
    ["Exportiert am", new Date()],
    ["Anzahl Einträge", documents.length],
    ["Web-App", origin],
    ["Hinweis", "QR-Links führen zuerst zur Gerätemappe. Ein Eintrag kann nur eine Notiz enthalten oder zusätzlich auf ein externes Dokument verweisen."]
  ]);
  info.mergeCells("A1:B1");
  info.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  info.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  info.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  info.getRow(1).height = 30;
  info.getColumn(1).font = { bold: true, color: { argb: "FF334542" } };
  info.getCell("B2").numFmt = "dd.mm.yyyy hh:mm";
  info.getCell("B4").value = { text: origin, hyperlink: origin };
  info.getCell("B5").alignment = { wrapText: true, vertical: "top" };
  info.getRow(5).height = 48;

  const sheet = workbook.addWorksheet("Einträge", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }]
  });
  sheet.columns = [
    { header: "ID", key: "id", width: 22 },
    { header: "Titel", key: "title", width: 34 },
    { header: "Kategorie", key: "category", width: 20 },
    { header: "Wohnung / Bereich", key: "apartment", width: 30 },
    { header: "Notiz", key: "note", width: 42 },
    { header: "Dokument-Link (optional)", key: "link", width: 52 },
    { header: "QR-Link zur Gerätemappe", key: "qrLink", width: 52 }
  ];

  for (const document of documents) {
    const qrLink = `${origin}/d/${encodeURIComponent(document.id)}`;
    const row = sheet.addRow({
      id: document.id,
      title: document.title,
      category: document.category,
      apartment: document.apartments.join(", "),
      note: document.note || "",
      link: document.link ? { text: document.link, hyperlink: document.link } : "",
      qrLink: { text: qrLink, hyperlink: qrLink }
    });
    row.alignment = { vertical: "top", wrapText: true };
  }

  const header = sheet.getRow(1);
  header.height = 27;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  header.alignment = { vertical: "middle", horizontal: "left" };
  sheet.autoFilter = { from: "A1", to: "G1" };

  for (let index = 2; index <= sheet.rowCount; index++) {
    const row = sheet.getRow(index);
    row.height = 34;
    if (index % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F8F7" } };
      });
    }
    sheet.getCell(`F${index}`).font = { color: { argb: "FF0F766E" }, underline: true };
    sheet.getCell(`G${index}`).font = { color: { argb: "FF0F766E" }, underline: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(buffer, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="Geraetemappe-Export-${date}.xlsx"`,
      "cache-control": "no-store"
    }
  });
};

export const config: Config = { path: "/api/export.xlsx" };
