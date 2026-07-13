import type { Config, Context } from "@netlify/functions";
import {
  LABELS_KEY,
  deriveLabelSet,
  getLabelStore,
  isAuthorized,
  readDocuments
} from "./_shared.mjs";
import { ensureApartmentPages } from "./apartment-lib.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default async (request: Request, _context: Context) => {
  const store = getLabelStore();

  if (request.method === "GET" || request.method === "PUT") {
    if (request.method === "PUT" && !isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);
    const documents = await readDocuments();
    const labels = deriveLabelSet(documents);
    const apartmentPages = await ensureApartmentPages(documents);
    await store.setJSON(LABELS_KEY, labels);
    return json({ ...labels, apartmentPages });
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = { path: "/api/labels" };
