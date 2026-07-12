import type { Config, Context } from "@netlify/functions";
import {
  LABELS_KEY,
  deriveLabelSet,
  getLabelStore,
  isAuthorized,
  readDocuments
} from "./_shared.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export default async (request: Request, _context: Context) => {
  const store = getLabelStore();

  if (request.method === "GET") {
    const documents = await readDocuments();
    const labels = deriveLabelSet(documents);
    await store.setJSON(LABELS_KEY, labels);
    return json(labels);
  }

  if (request.method === "PUT") {
    if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);

    // Labels werden aus den tatsächlich verwendeten Einträgen abgeleitet.
    // Dadurch verschwinden unbenutzte Labels automatisch.
    const documents = await readDocuments();
    const labels = deriveLabelSet(documents);
    await store.setJSON(LABELS_KEY, labels);
    return json(labels);
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = { path: "/api/labels" };
