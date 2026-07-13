import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Config, Context } from "@netlify/functions";
import { isAuthorized, readDocuments } from "./_shared.mjs";
import { ensureApartmentPages } from "./apartment-lib.mjs";

type SheetItem = { type: "document" | "apartment"; id: string };
type ResolvedItem = { title: string; subtitle: string; code: string; url: string };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function safePdfText(value: string): string {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/–/g, "-")
    .replace(/—/g, "-");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number): string[] {
  const words = safePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (font.widthOfTextAtSize(`${last}...`, size) > maxWidth && last.length > 3) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}...`;
  }
  return lines;
}

async function drawLabel(
  pdf: any,
  page: PDFPage,
  item: ResolvedItem,
  x: number,
  y: number,
  width: number,
  height: number,
  regular: PDFFont,
  bold: PDFFont
) {
  page.drawRectangle({ x, y, width, height, borderColor: rgb(0.82, 0.88, 0.87), borderWidth: 0.8, color: rgb(1, 1, 1) });

  const qrBuffer = await QRCode.toBuffer(item.url, {
    type: "png",
    width: 600,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0F766EFF", light: "#FFFFFFFF" }
  });
  const qrImage = await pdf.embedPng(qrBuffer);
  const qrSize = Math.min(104, height - 24);
  page.drawImage(qrImage, { x: x + 12, y: y + (height - qrSize) / 2, width: qrSize, height: qrSize });

  const textX = x + qrSize + 24;
  const textWidth = width - qrSize - 36;
  const titleLines = wrapText(item.title, bold, 12, textWidth, 3);
  let cursorY = y + height - 28;
  for (const line of titleLines) {
    page.drawText(line, { x: textX, y: cursorY, size: 12, font: bold, color: rgb(0.03, 0.35, 0.33) });
    cursorY -= 15;
  }

  const subtitleLines = wrapText(item.subtitle, regular, 8.5, textWidth, 2);
  cursorY -= 3;
  for (const line of subtitleLines) {
    page.drawText(line, { x: textX, y: cursorY, size: 8.5, font: regular, color: rgb(0.35, 0.45, 0.43) });
    cursorY -= 11;
  }

  page.drawText(`Code: ${safePdfText(item.code)}`, {
    x: textX,
    y: y + 18,
    size: 8.5,
    font: bold,
    color: rgb(0.25, 0.35, 0.33)
  });
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "POST") return json({ error: "Methode nicht erlaubt." }, 405);
  if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Auswahl." }, 400);
  }

  const rawItems = Array.isArray((body as any)?.items) ? (body as any).items : [];
  const items: SheetItem[] = rawItems
    .filter((item: any) => item && (item.type === "document" || item.type === "apartment") && /^[A-Za-z0-9_-]{1,100}$/.test(String(item.id || "")))
    .slice(0, 200);
  if (!items.length) return json({ error: "Bitte mindestens einen QR-Code auswählen." }, 400);

  const requestUrl = new URL(request.url);
  const documents = await readDocuments();
  const pages = await ensureApartmentPages(documents);
  const resolved: ResolvedItem[] = [];

  for (const item of items) {
    if (item.type === "document") {
      const document = documents.find((entry) => entry.id === item.id);
      if (!document) continue;
      resolved.push({
        title: document.title,
        subtitle: `${document.category} · ${document.apartments.join(", ")}`,
        code: document.id.slice(-8).toUpperCase(),
        url: `${requestUrl.origin}/d/${encodeURIComponent(document.id)}`
      });
    } else {
      const apartment = pages.find((page) => page.id === item.id);
      if (!apartment) continue;
      resolved.push({
        title: apartment.label,
        subtitle: "Wohnungsübersicht · Gerätemappe",
        code: apartment.id.slice(-8).toUpperCase(),
        url: `${requestUrl.origin}/wohnung/${encodeURIComponent(apartment.id)}`
      });
    }
  }

  if (!resolved.length) return json({ error: "Keine gültigen QR-Codes gefunden." }, 400);

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;
  const gap = 8;
  const columns = 2;
  const rows = 5;
  const cellWidth = (pageWidth - margin * 2 - gap) / columns;
  const cellHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;

  for (let index = 0; index < resolved.length; index++) {
    const position = index % (columns * rows);
    if (position === 0) pdf.addPage([pageWidth, pageHeight]);
    const page = pdf.getPages()[pdf.getPageCount() - 1];
    const column = position % columns;
    const row = Math.floor(position / columns);
    const x = margin + column * (cellWidth + gap);
    const y = pageHeight - margin - (row + 1) * cellHeight - row * gap;
    await drawLabel(pdf, page, resolved[index], x, y, cellWidth, cellHeight, regular, bold);
  }

  const bytes = await pdf.save();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="Geraetemappe-QR-Druckbogen-${date}.pdf"`,
      "cache-control": "no-store"
    }
  });
};

export const config: Config = { path: "/api/qr-sheet" };
