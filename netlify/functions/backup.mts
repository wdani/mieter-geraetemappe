import type { Config, Context } from "@netlify/functions";
import {
  createBackupPayload,
  deriveLabelSet,
  isAuthorized,
  readDocuments,
  saveLatestImportSafetyBackup,
  validateDocuments,
  writeDocuments
} from "./_shared.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default async (request: Request, _context: Context) => {
  if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);

  if (request.method === "GET") {
    const documents = await readDocuments();
    const backup = createBackupPayload(documents);
    const date = new Date().toISOString().replace(/[:.]/g, "-");

    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="Geraetemappe-Backup-${date}.json"`,
        "cache-control": "no-store"
      }
    });
  }

  if (request.method === "PUT") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Ungültige Backup-Datei." }, 400);
    }

    const source = body as { documents?: unknown };
    const rawDocuments = Array.isArray(body) ? body : source?.documents;
    const documents = validateDocuments(rawDocuments);
    if (!documents) return json({ error: "Das Backup enthält ungültige Einträge." }, 400);

    const currentDocuments = await readDocuments();
    const safetyBackup = await saveLatestImportSafetyBackup(currentDocuments);
    await writeDocuments(documents);

    return json({
      documents,
      labels: deriveLabelSet(documents),
      imported: documents.length,
      safetyBackupCreatedAt: safetyBackup.exportedAt
    });
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = { path: "/api/backup" };
