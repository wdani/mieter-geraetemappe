import { getDeployStore, getStore } from "@netlify/blobs";

export interface ManualDocument {
  id: string;
  title: string;
  category: string;
  apartments: string[];
  link: string;
  note: string;
}

export interface LabelSet {
  categories: string[];
  apartments: string[];
}

export const STORE_NAME = "geraetemappe";
export const DOCUMENTS_KEY = "documents";
export const LABELS_KEY = "labels";

/**
 * Ältere Einträge verwendeten ein einzelnes Feld `apartment`.
 * Beim Lesen wird es transparent in das neue Array `apartments` überführt.
 */
export function normalizeDocument(source: any): ManualDocument {
  let apartments: string[] = [];

  if (Array.isArray(source?.apartments)) {
    apartments = source.apartments
      .filter((value: unknown): value is string => typeof value === "string")
      .map((value: string) => value.trim())
      .filter(Boolean);
  } else if (typeof source?.apartment === "string" && source.apartment.trim()) {
    apartments = [source.apartment.trim()];
  }

  return {
    id: typeof source?.id === "string" ? source.id : "",
    title: typeof source?.title === "string" ? source.title : "",
    category: typeof source?.category === "string" ? source.category : "",
    apartments,
    link: typeof source?.link === "string" ? source.link : "",
    note: typeof source?.note === "string" ? source.note : ""
  };
}

export function getDocumentStore() {
  const deployContext = Netlify.context?.deploy?.context;
  return deployContext === "production"
    ? getStore(STORE_NAME, { consistency: "strong" })
    : getDeployStore(STORE_NAME);
}

export function isAuthorized(request: Request): boolean {
  const configuredPassword = Netlify.env.get("ADMIN_PASSWORD");
  if (!configuredPassword) return false;
  return request.headers.get("x-admin-password") === configuredPassword;
}

export async function readDocuments(): Promise<ManualDocument[]> {
  const store = getDocumentStore();
  const documents = await store.get(DOCUMENTS_KEY, { type: "json" }) as unknown[] | null;
  return Array.isArray(documents) ? documents.map(normalizeDocument) : [];
}

export function getLabelStore() {
  const deployContext = Netlify.context?.deploy?.context;
  return deployContext === "production"
    ? getStore(STORE_NAME, { consistency: "strong" })
    : getDeployStore(STORE_NAME);
}
