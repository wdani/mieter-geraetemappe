import type { Config, Context } from "@netlify/functions";
import { getDocumentStore, isAuthorized, readApartmentPages, readDocuments } from "./_shared.mjs";
import { writeDocuments } from "./apartment-lib.mjs";
import { listBackups, readBackup, saveBackup } from "./backup-lib.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default async (request: Request, _context: Context) => {
  if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const downloadKey = url.searchParams.get("download") || "";
    if (downloadKey) {
      const backup = await readBackup(downloadKey);
      if (!backup) return json({ error: "Sicherung nicht gefunden." }, 404);
      const filename = `Geraetemappe-${backup.backupType || "Backup"}-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
      return new Response(JSON.stringify(backup, null, 2), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "no-store"
        }
      });
    }
    return json({ backups: await listBackups() });
  }

  if (request.method === "POST") {
    const documents = await readDocuments();
    const apartmentPages = await readApartmentPages();
    const created = await saveBackup("manual", "manual", documents, apartmentPages);
    return json({ key: created.key, backup: created.backup, backups: await listBackups() }, 201);
  }

  if (request.method === "PUT") {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Ungültige Anfrage." }, 400);
    }
    const key = typeof (body as any)?.key === "string" ? (body as any).key : "";
    const backup = await readBackup(key);
    if (!backup) return json({ error: "Sicherung nicht gefunden oder ungültig." }, 404);

    const currentDocuments = await readDocuments();
    const currentPages = await readApartmentPages();
    await saveBackup("safety", "before-restore", currentDocuments, currentPages);
    const result = await writeDocuments(backup.documents, { preferredApartmentPages: backup.apartmentPages });

    return json({
      restoredFrom: key,
      documents: backup.documents,
      labels: result.labels,
      apartmentPages: result.apartmentPages,
      backups: await listBackups()
    });
  }

  if (request.method === "DELETE") {
    const key = url.searchParams.get("key") || "";
    const backup = await readBackup(key);
    if (!backup) return json({ error: "Sicherung nicht gefunden." }, 404);
    if (backup.backupType === "daily" || backup.backupType === "monthly") {
      return json({ error: "Automatische Sicherungen werden über die Aufbewahrungsregel entfernt." }, 400);
    }
    await getDocumentStore().delete(key);
    return json({ backups: await listBackups() });
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = { path: "/api/backups" };
