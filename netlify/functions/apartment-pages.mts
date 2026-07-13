import type { Config, Context } from "@netlify/functions";
import { isGlobalApartmentLabel, readDocuments } from "./_shared.mjs";
import { ensureApartmentPages } from "./apartment-lib.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default async (request: Request, _context: Context) => {
  if (request.method !== "GET") return json({ error: "Methode nicht erlaubt." }, 405);

  const documents = await readDocuments();
  const pages = await ensureApartmentPages(documents);
  const result = pages.map((page) => ({
    ...page,
    entryCount: documents.filter((document) =>
      document.apartments.some((label) =>
        label.toLocaleLowerCase("de") === page.label.toLocaleLowerCase("de") || isGlobalApartmentLabel(label)
      )
    ).length
  }));

  return json({ apartmentPages: result });
};

export const config: Config = { path: "/api/apartment-pages" };
