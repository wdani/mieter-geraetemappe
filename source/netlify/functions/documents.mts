import type { Config, Context } from "@netlify/functions";
import {
  DOCUMENTS_KEY,
  deriveLabelSet,
  getDocumentStore,
  isAuthorized,
  normalizeDocument,
  validateDocuments,
  writeDocuments,
  type ManualDocument
} from "./_shared.mjs";

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
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async (request: Request, _context: Context) => {
  const store = getDocumentStore();

  if (request.method === "GET") {
    const rawDocuments = await store.get(DOCUMENTS_KEY, { type: "json" }) as unknown[] | null;

    if (!rawDocuments) {
      const labels = await writeDocuments(seedDocuments);
      return json({ documents: seedDocuments, labels });
    }

    const documents = rawDocuments.map(normalizeDocument);
    const migrationNeeded = rawDocuments.some((item) => {
      if (!item || typeof item !== "object") return true;
      const source = item as Record<string, unknown>;
      return !Array.isArray(source.apartments) || !Array.isArray(source.links) || "link" in source;
    });

    const labels = migrationNeeded
      ? await writeDocuments(documents)
      : deriveLabelSet(documents);

    return json({ documents, labels });
  }

  if (request.method === "PUT") {
    if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Ungültige JSON-Daten." }, 400);
    }

    const source = body as { documents?: unknown };
    const documents = validateDocuments(source?.documents);
    if (!documents) return json({ error: "Die Eintragsliste ist ungültig." }, 400);

    const labels = await writeDocuments(documents);
    return json({ documents, labels });
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = { path: "/api/documents" };
