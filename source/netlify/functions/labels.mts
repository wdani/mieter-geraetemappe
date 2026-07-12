import type { Config, Context } from "@netlify/functions";
import { LABELS_KEY, getLabelStore, isAuthorized, type LabelSet } from "./_shared.mjs";

const MAX_LABELS = 300;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function cleanLabelList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > MAX_LABELS) return null;

  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim().slice(0, 100) : ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  for (const label of cleaned) {
    const key = label.toLocaleLowerCase("de");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result.sort((a, b) => a.localeCompare(b, "de"));
}

export default async (request: Request, _context: Context) => {
  const store = getLabelStore();

  if (request.method === "GET") {
    const labels = await store.get(LABELS_KEY, { type: "json" }) as LabelSet | null;
    return json({
      categories: Array.isArray(labels?.categories) ? labels.categories : [],
      apartments: Array.isArray(labels?.apartments) ? labels.apartments : []
    });
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

    const source = body as { categories?: unknown; apartments?: unknown };
    const categories = cleanLabelList(source?.categories ?? []);
    const apartments = cleanLabelList(source?.apartments ?? []);

    if (!categories || !apartments) {
      return json({ error: "Die Label-Liste ist ungültig." }, 400);
    }

    const labels: LabelSet = { categories, apartments };
    await store.setJSON(LABELS_KEY, labels);
    return json(labels);
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = {
  path: "/api/labels"
};
