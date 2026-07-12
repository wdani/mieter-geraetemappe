import { getDeployStore, getStore } from "@netlify/blobs";

export interface ManualDocument {
  id: string;
  title: string;
  category: string;
  apartment: string;
  link: string;
  note: string;
}

export const STORE_NAME = "geraetemappe";
export const DOCUMENTS_KEY = "documents";

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
  const documents = await store.get(DOCUMENTS_KEY, { type: "json" }) as ManualDocument[] | null;
  return Array.isArray(documents) ? documents : [];
}
