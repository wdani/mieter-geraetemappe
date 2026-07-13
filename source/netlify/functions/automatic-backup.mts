import type { Config } from "@netlify/functions";
import { readDocuments } from "./_shared.mjs";
import { ensureApartmentPages } from "./apartment-lib.mjs";
import { saveBackup } from "./backup-lib.mjs";

export default async () => {
  const documents = await readDocuments();
  const apartmentPages = await ensureApartmentPages(documents);
  const now = new Date();

  await saveBackup("daily", "automatic", documents, apartmentPages);
  if (now.getUTCDate() === 1) {
    await saveBackup("monthly", "automatic", documents, apartmentPages);
  }

  console.log(`Automatic backup created for ${documents.length} entries.`);
};

export const config: Config = { schedule: "@daily" };
