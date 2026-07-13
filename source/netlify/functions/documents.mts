import type { Config, Context } from "@netlify/functions";
import {
  DOCUMENTS_KEY,
  deriveLabelSet,
  getDocumentStore,
  isAuthorized,
  normalizeDocument,
  readDocuments,
  validateDocuments,
  type ApartmentRename,
  type ManualDocument
} from "./_shared.mjs";
import { ensureApartmentPages, writeDocuments } from "./apartment-lib.mjs";
import { saveBackup } from "./backup-lib.mjs";

const seedDocuments: ManualDocument[] = [
  {
    id: "allgemeine-information",
    title: "Allgemeine Information",
    category: "Allgemein",
    apartments: ["Alle Wohnungen"],
    links: [],
    note: "Hier können allgemeine Hinweise oder gemeinsame Dokumente hinterlegt werden."
  }
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default async (request: Request, _context: Context) => {
  const store = getDocumentStore();

  if (request.method === "GET") {
    const rawDocuments = await store.get(DOCUMENTS_KEY, { type: "json" }) as unknown[] | null;

    if (!rawDocuments) {
      const result = await writeDocuments(seedDocuments);
      return json({ documents: seedDocuments, ...result });
    }

    const documents = rawDocuments.map(normalizeDocument);
    const migrationNeeded = rawDocuments.some((item) => {
      if (!item || typeof item !== "object") return true;
      const source = item as Record<string, unknown>;
      return !Array.isArray(source.apartments) || !Array.isArray(source.links) || "link" in source;
    });

    if (migrationNeeded) {
      const result = await writeDocuments(documents);
      return json({ documents, ...result });
    }

    const apartmentPages = await ensureApartmentPages(documents);
    return json({ documents, labels: deriveLabelSet(documents), apartmentPages });
  }

  if (request.method === "PUT") {
    if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Ungültige JSON-Daten." }, 400);
    }

    const source = body as { documents?: unknown; apartmentRenames?: ApartmentRename[] };
    const documents = validateDocuments(source?.documents);
    if (!documents) return json({ error: "Die Eintragsliste ist ungültig." }, 400);

    const currentDocuments = await readDocuments();
    const currentIds = new Set(currentDocuments.map((document) => document.id));
    const nextIds = new Set(documents.map((document) => document.id));
    const removedCount = [...currentIds].filter((id) => !nextIds.has(id)).length;
    const destructive = removedCount >= 5 || (currentDocuments.length >= 4 && removedCount / currentDocuments.length >= 0.25);

    if (destructive) {
      await saveBackup("safety", "before-bulk-delete", currentDocuments);
    }

    const apartmentRenames = Array.isArray(source.apartmentRenames)
      ? source.apartmentRenames.slice(0, 50)
      : [];
    const result = await writeDocuments(documents, { apartmentRenames });
    return json({ documents, ...result, safetyBackupCreated: destructive });
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = { path: "/api/documents" };
