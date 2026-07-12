import QRCode from "qrcode";
import type { Config, Context } from "@netlify/functions";
import { readDocuments } from "./_shared.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "GET") return json({ error: "Methode nicht erlaubt." }, 405);

  const requestUrl = new URL(request.url);
  const id = (requestUrl.searchParams.get("id") || "").trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return json({ error: "Ungültige Eintrags-ID." }, 400);

  const documents = await readDocuments();
  const document = documents.find(item => item.id === id);
  if (!document) return json({ error: "Eintrag nicht gefunden." }, 404);

  const detailUrl = `${requestUrl.origin}/d/${encodeURIComponent(document.id)}`;
  const png = await QRCode.toBuffer(detailUrl, {
    type: "png",
    width: 1000,
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#0F766EFF", light: "#FFFFFFFF" }
  });

  const safeTitle = document.title
    .replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || "Eintrag";
  const download = requestUrl.searchParams.get("download") === "1";

  return new Response(png, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=3600",
      ...(download ? { "content-disposition": `attachment; filename="QR-${safeTitle}.png"` } : {})
    }
  });
};

export const config: Config = { path: "/api/qr" };
