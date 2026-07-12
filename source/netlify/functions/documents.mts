import type { Config, Context } from "@netlify/functions";
import {
  DOCUMENTS_KEY,
  getDocumentStore,
  isAuthorized,
  normalizeDocument,
  type ManualDocument
} from "./_shared.mjs";

const MAX_DOCUMENTS = 2000;
const MAX_APARTMENTS_PER_DOCUMENT = 30;

const seedDocuments: ManualDocument[] = [
  {
    id: "dropbox-allgemein",
    title: "Alle Dokumente (Dropbox-Ordner)",
    category: "Allgemein",
    apartments: ["Alle Wohnungen"],
    link: "",
    note: "Hier können allgemeine Hinweise oder ein gemeinsamer Dokumentenordner hinterlegt werden."
  }
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validateDocuments(value: unknown): ManualDocument[] | null {
  if (!Array.isArray(value) || value.length > MAX_DOCUMENTS) return null;

  const documents: ManualDocument[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const source = item as Record<string, unknown>;

    let rawApartments: unknown[];
    if (Array.isArray(source.apartments)) {
      rawApartments = source.apartments;
    } else if (typeof source.apartment === "string") {
      rawApartments = [source.apartment];
    } else {
      rawApartments = [];
    }

    const apartments = [...new Set(
      rawApartments
        .map((itemValue) => cleanString(itemValue, 100))
        .filter(Boolean)
    )].slice(0, MAX_APARTMENTS_PER_DOCUMENT);

    const document: ManualDocument = {
      id: cleanString(source.id, 100),
      title: cleanString(source.title, 200),
      category: cleanString(source.category, 100),
      apartments,
      link: cleanString(source.link, 2000),
      note: cleanString(source.note, 1000)
    };

    if (!/^[A-Za-z0-9_-]{1,100}$/.test(document.id) || ids.has(document.id)) return null;
    if (!document.title || !document.category || document.apartments.length === 0) return null;
    if (!document.link && !document.note) return null;

    if (document.link) {
      try {
        const url = new URL(document.link);
        if (url.protocol !== "https:") return null;
      } catch {
        return null;
      }
    }

    ids.add(document.id);
    documents.push(document);
  }

  return documents;
}

export default async (request: Request, _context: Context) => {
  const store = getDocumentStore();

  if (request.method === "GET") {
    const rawDocuments = await store.get(DOCUMENTS_KEY, { type: "json" }) as unknown[] | null;

    if (!rawDocuments) {
      await store.setJSON(DOCUMENTS_KEY, seedDocuments);
      return json({ documents: seedDocuments });
    }

    const documents = rawDocuments.map(normalizeDocument);

    const migrationNeeded = rawDocuments.some((item) => {
      if (!item || typeof item !== "object") return true;
      return !Array.isArray((item as Record<string, unknown>).apartments);
    });

    if (migrationNeeded) {
      await store.setJSON(DOCUMENTS_KEY, documents);
    }

    return json({ documents });
  }

  if (request.method === "PUT") {
    if (!isAuthorized(request)) {
      return json({ error: "Nicht autorisiert." }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Ungültige JSON-Daten." }, 400);
    }

    const source = body as { documents?: unknown };
    const documents = validateDocuments(source?.documents);
    if (!documents) {
      return json({ error: "Die Dokumentliste ist ungültig." }, 400);
    }

    await store.setJSON(DOCUMENTS_KEY, documents);
    return json({ documents });
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = {
  path: "/api/documents"
};
