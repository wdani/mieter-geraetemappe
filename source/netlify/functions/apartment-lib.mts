import {
  APARTMENT_PAGES_KEY,
  DOCUMENTS_KEY,
  LABELS_KEY,
  cleanString,
  deriveLabelSet,
  getDocumentStore,
  isGlobalApartmentLabel,
  normalizeApartmentPages,
  readApartmentPages,
  sameLabel,
  type ApartmentPage,
  type ApartmentRename,
  type LabelSet,
  type ManualDocument
} from "./_shared.mjs";

function createApartmentPageId(): string {
  return `w${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
}

export function synchronizeApartmentPages(
  existingPages: ApartmentPage[],
  documents: ManualDocument[],
  renames: ApartmentRename[] = []
): ApartmentPage[] {
  let pages = normalizeApartmentPages(existingPages).map((page) => ({ ...page }));

  for (const rename of renames) {
    const from = cleanString(rename?.from, 100);
    const to = cleanString(rename?.to, 100);
    if (!from || !to || isGlobalApartmentLabel(to)) continue;

    const sourcePage = pages.find((page) => sameLabel(page.label, from));
    const targetPage = pages.find((page) => sameLabel(page.label, to));
    if (sourcePage && !targetPage) sourcePage.label = to;
    if (sourcePage && targetPage && sourcePage.id !== targetPage.id) {
      pages = pages.filter((page) => page.id !== sourcePage.id);
    }
  }

  const usedLabels = deriveLabelSet(documents).apartments.filter((label) => !isGlobalApartmentLabel(label));
  const usedKeys = new Set(usedLabels.map((label) => label.toLocaleLowerCase("de")));
  pages = pages.filter((page) => usedKeys.has(page.label.toLocaleLowerCase("de")));

  for (const label of usedLabels) {
    if (!pages.some((page) => sameLabel(page.label, label))) {
      pages.push({ id: createApartmentPageId(), label });
    }
  }

  return pages.sort((a, b) => a.label.localeCompare(b.label, "de"));
}

export async function ensureApartmentPages(documents: ManualDocument[]): Promise<ApartmentPage[]> {
  const store = getDocumentStore();
  const existing = await readApartmentPages();
  const pages = synchronizeApartmentPages(existing, documents);
  if (JSON.stringify(existing) !== JSON.stringify(pages)) {
    await store.setJSON(APARTMENT_PAGES_KEY, pages);
  }
  return pages;
}

export async function writeDocuments(
  documents: ManualDocument[],
  options: { apartmentRenames?: ApartmentRename[]; preferredApartmentPages?: ApartmentPage[] } = {}
): Promise<{ labels: LabelSet; apartmentPages: ApartmentPage[] }> {
  const store = getDocumentStore();
  const labels = deriveLabelSet(documents);
  const existingPages = options.preferredApartmentPages?.length
    ? normalizeApartmentPages(options.preferredApartmentPages)
    : await readApartmentPages();
  const apartmentPages = synchronizeApartmentPages(existingPages, documents, options.apartmentRenames || []);

  await Promise.all([
    store.setJSON(DOCUMENTS_KEY, documents),
    store.setJSON(LABELS_KEY, labels),
    store.setJSON(APARTMENT_PAGES_KEY, apartmentPages)
  ]);
  return { labels, apartmentPages };
}
