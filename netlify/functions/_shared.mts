import { getDeployStore, getStore } from "@netlify/blobs";

export interface DocumentLink {
  label: string;
  url: string;
}

export interface ManualDocument {
  id: string;
  title: string;
  category: string;
  apartments: string[];
  links: DocumentLink[];
  note: string;
}

export interface ApartmentPage {
  id: string;
  label: string;
}

export interface ApartmentRename {
  from: string;
  to: string;
}

export interface LabelSet {
  categories: string[];
  apartments: string[];
}

export const APP_VERSION = "1.5.1";
export const STORE_NAME = "geraetemappe";
export const DOCUMENTS_KEY = "documents";
export const LABELS_KEY = "labels";
export const APARTMENT_PAGES_KEY = "apartment-pages";

const MAX_DOCUMENTS = 2000;
const MAX_APARTMENTS_PER_DOCUMENT = 30;
const MAX_LINKS_PER_DOCUMENT = 12;
const GLOBAL_APARTMENT_LABELS = new Set([
  "alle wohnungen",
  "alle",
  "allgemein",
  "gesamte liegenschaft",
  "ganze liegenschaft"
]);

function getStoreForContext() {
  const deployContext = Netlify.context?.deploy?.context;
  return deployContext === "production"
    ? getStore(STORE_NAME, { consistency: "strong" })
    : getDeployStore(STORE_NAME);
}

export function getDocumentStore() {
  return getStoreForContext();
}

export function getLabelStore() {
  return getStoreForContext();
}

export function isAuthorized(request: Request): boolean {
  const configuredPassword = Netlify.env.get("ADMIN_PASSWORD");
  if (!configuredPassword) return false;
  return request.headers.get("x-admin-password") === configuredPassword;
}

export function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function uniqueLabels(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const label = cleanString(value, 100);
    if (!label) continue;
    const key = label.toLocaleLowerCase("de");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result.sort((a, b) => a.localeCompare(b, "de"));
}

export function sameLabel(left: unknown, right: unknown): boolean {
  return cleanString(left, 100).toLocaleLowerCase("de") === cleanString(right, 100).toLocaleLowerCase("de");
}

export function isGlobalApartmentLabel(label: unknown): boolean {
  return GLOBAL_APARTMENT_LABELS.has(cleanString(label, 100).toLocaleLowerCase("de"));
}

export function normalizeLinks(source: any): DocumentLink[] {
  const rawLinks = Array.isArray(source?.links)
    ? source.links
    : (typeof source?.link === "string" && source.link.trim()
      ? [{ label: "Dokument", url: source.link }]
      : []);

  const result: DocumentLink[] = [];
  const seen = new Set<string>();

  for (const item of rawLinks.slice(0, MAX_LINKS_PER_DOCUMENT)) {
    const label = cleanString(item?.label, 100) || "Dokument";
    const url = cleanString(item?.url, 2000);
    if (!url) continue;
    const key = `${label.toLocaleLowerCase("de")}\u0000${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ label, url });
  }

  return result;
}

export function normalizeDocument(source: any): ManualDocument {
  let apartments: string[] = [];

  if (Array.isArray(source?.apartments)) {
    apartments = uniqueLabels(source.apartments).slice(0, MAX_APARTMENTS_PER_DOCUMENT);
  } else if (typeof source?.apartment === "string" && source.apartment.trim()) {
    apartments = [source.apartment.trim()];
  }

  return {
    id: cleanString(source?.id, 100),
    title: cleanString(source?.title, 200),
    category: cleanString(source?.category, 100),
    apartments,
    links: normalizeLinks(source),
    note: cleanString(source?.note, 1000)
  };
}

export function validateDocuments(value: unknown): ManualDocument[] | null {
  if (!Array.isArray(value) || value.length > MAX_DOCUMENTS) return null;

  const documents: ManualDocument[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const document = normalizeDocument(item);

    if (!/^[A-Za-z0-9_-]{1,100}$/.test(document.id) || ids.has(document.id)) return null;
    if (!document.title || !document.category || document.apartments.length === 0) return null;
    if (document.links.length === 0 && !document.note) return null;

    for (const link of document.links) {
      try {
        const url = new URL(link.url);
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

export function deriveLabelSet(documents: ManualDocument[]): LabelSet {
  return {
    categories: uniqueLabels(documents.map((document) => document.category)),
    apartments: uniqueLabels(documents.flatMap((document) => document.apartments))
  };
}

export function normalizeApartmentPages(value: unknown): ApartmentPage[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  const labels = new Set<string>();
  const pages: ApartmentPage[] = [];

  for (const item of value) {
    const source = item as Record<string, unknown>;
    const id = cleanString(source?.id, 100);
    const label = cleanString(source?.label, 100);
    const labelKey = label.toLocaleLowerCase("de");
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id) || !label || isGlobalApartmentLabel(label)) continue;
    if (ids.has(id) || labels.has(labelKey)) continue;
    ids.add(id);
    labels.add(labelKey);
    pages.push({ id, label });
  }

  return pages;
}

export async function readDocuments(): Promise<ManualDocument[]> {
  const store = getDocumentStore();
  const rawDocuments = await store.get(DOCUMENTS_KEY, { type: "json" }) as unknown[] | null;
  return Array.isArray(rawDocuments) ? rawDocuments.map(normalizeDocument) : [];
}

export async function readApartmentPages(): Promise<ApartmentPage[]> {
  const store = getDocumentStore();
  const rawPages = await store.get(APARTMENT_PAGES_KEY, { type: "json" }) as unknown;
  return normalizeApartmentPages(rawPages);
}
