import {
  APP_VERSION,
  cleanString,
  deriveLabelSet,
  getDocumentStore,
  normalizeApartmentPages,
  readDocuments,
  validateDocuments,
  type ApartmentPage,
  type LabelSet,
  type ManualDocument
} from "./_shared.mjs";
import { ensureApartmentPages } from "./apartment-lib.mjs";

export type BackupType = "daily" | "monthly" | "manual" | "safety";

export interface BackupPayload {
  schema: "mieter-geraetemappe-backup";
  version: number;
  appVersion: string;
  exportedAt: string;
  backupType?: BackupType;
  reason?: string;
  labels: LabelSet;
  apartmentPages: ApartmentPage[];
  documents: ManualDocument[];
}

export interface BackupSummary {
  key: string;
  type: BackupType;
  reason: string;
  createdAt: string;
  documentCount: number;
  apartmentCount: number;
}

const BACKUP_PREFIX = "backups/";
const LATEST_IMPORT_BACKUP_KEY = "backups/latest-before-import";

export function createBackupPayload(
  documents: ManualDocument[],
  apartmentPages: ApartmentPage[],
  backupType?: BackupType,
  reason = ""
): BackupPayload {
  return {
    schema: "mieter-geraetemappe-backup",
    version: 4,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    backupType,
    reason,
    labels: deriveLabelSet(documents),
    apartmentPages: normalizeApartmentPages(apartmentPages),
    documents
  };
}

function isoKeyTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function backupKey(type: BackupType, date: Date, reason: string): string {
  if (type === "daily") return `${BACKUP_PREFIX}daily/${date.toISOString().slice(0, 10)}.json`;
  if (type === "monthly") return `${BACKUP_PREFIX}monthly/${date.toISOString().slice(0, 7)}.json`;
  const safeReason = cleanString(reason, 80).toLocaleLowerCase("de")
    .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || type;
  return `${BACKUP_PREFIX}${type}/${isoKeyTimestamp(date)}-${safeReason}.json`;
}

async function pruneBackups(prefix: string, keep: number): Promise<void> {
  const store = getDocumentStore();
  const { blobs } = await store.list({ prefix });
  const obsolete = blobs.map((blob: { key: string }) => blob.key).sort().reverse().slice(keep);
  await Promise.all(obsolete.map((key: string) => store.delete(key)));
}

export async function saveBackup(
  type: BackupType,
  reason: string,
  documents?: ManualDocument[],
  apartmentPages?: ApartmentPage[]
): Promise<{ key: string; backup: BackupPayload }> {
  const store = getDocumentStore();
  const currentDocuments = documents || await readDocuments();
  const currentPages = apartmentPages?.length ? apartmentPages : await ensureApartmentPages(currentDocuments);
  const now = new Date();
  const backup = createBackupPayload(currentDocuments, currentPages, type, reason);
  const key = backupKey(type, now, reason);
  await store.setJSON(key, backup);

  const retention = type === "daily" ? 30 : type === "monthly" ? 12 : type === "manual" ? 20 : 50;
  await pruneBackups(`${BACKUP_PREFIX}${type}/`, retention);
  return { key, backup };
}

export async function saveLatestImportSafetyBackup(documents: ManualDocument[]): Promise<BackupPayload> {
  const store = getDocumentStore();
  const pages = await ensureApartmentPages(documents);
  const { backup } = await saveBackup("safety", "before-import", documents, pages);
  await store.setJSON(LATEST_IMPORT_BACKUP_KEY, backup);
  return backup;
}

export function isAllowedBackupKey(key: string): boolean {
  return key.startsWith(BACKUP_PREFIX) && key.endsWith(".json") && !key.includes("..") && !key.includes("\\");
}

export async function readBackup(key: string): Promise<BackupPayload | null> {
  if (!isAllowedBackupKey(key)) return null;
  const store = getDocumentStore();
  const raw = await store.get(key, { type: "json" }) as BackupPayload | null;
  if (!raw || raw.schema !== "mieter-geraetemappe-backup") return null;
  const documents = validateDocuments(raw.documents);
  if (!documents) return null;
  return { ...raw, documents, apartmentPages: normalizeApartmentPages(raw.apartmentPages) };
}

export async function listBackups(): Promise<BackupSummary[]> {
  const store = getDocumentStore();
  const { blobs } = await store.list({ prefix: BACKUP_PREFIX });
  const keys = blobs.map((blob: { key: string }) => blob.key).filter(isAllowedBackupKey);
  const summaries = await Promise.all(keys.map(async (key: string): Promise<BackupSummary | null> => {
    const backup = await readBackup(key);
    if (!backup) return null;
    const type = (backup.backupType || key.split("/")[1] || "manual") as BackupType;
    return {
      key,
      type,
      reason: backup.reason || "",
      createdAt: backup.exportedAt,
      documentCount: backup.documents.length,
      apartmentCount: backup.apartmentPages.length
    };
  }));

  return summaries.filter((item): item is BackupSummary => Boolean(item))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
