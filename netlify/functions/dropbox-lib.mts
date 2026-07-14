import { cleanString, getDocumentStore } from "./_shared.mjs";
import type { BackupPayload, BackupType } from "./backup-lib.mjs";

const DROPBOX_STATUS_KEY = "integrations/dropbox/status";
const DROPBOX_CREDENTIALS_KEY = "integrations/dropbox/credentials";
const DROPBOX_OAUTH_STATE_PREFIX = "integrations/dropbox/oauth-state/";
const DEFAULT_BACKUP_ROOT = "/Geraetemappe-Backups";

interface DropboxCredentials {
  refreshToken: string;
  connectedAt: string;
  accountId?: string;
}

interface StoredDropboxStatus {
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastUploadedPath?: string;
}

interface OAuthStateRecord {
  createdAt: string;
  redirectUri: string;
}

export interface DropboxBackupStatus {
  available: boolean;
  connected: boolean;
  rootPath: string;
  lastAttemptAt: string;
  lastSuccessAt: string;
  lastError: string;
  lastUploadedPath: string;
}

function env(name: string): string {
  return (Netlify.env.get(name) || "").trim();
}

function normalizeRootPath(value: string): string {
  const cleaned = cleanString(value, 300).replace(/\\/g, "/").replace(/\/+$/g, "");
  if (!cleaned) return DEFAULT_BACKUP_ROOT;
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

export function getDropboxAppConfig() {
  const appKey = env("DROPBOX_APP_KEY");
  const appSecret = env("DROPBOX_APP_SECRET");
  return {
    appKey,
    appSecret,
    available: Boolean(appKey && appSecret),
    rootPath: normalizeRootPath(env("DROPBOX_BACKUP_PATH"))
  };
}

async function readCredentials(): Promise<DropboxCredentials | null> {
  const raw = await getDocumentStore().get(DROPBOX_CREDENTIALS_KEY, { type: "json" }) as DropboxCredentials | null;
  if (!raw?.refreshToken) return null;
  return raw;
}

async function writeStatus(status: StoredDropboxStatus): Promise<void> {
  await getDocumentStore().setJSON(DROPBOX_STATUS_KEY, status);
}

export async function getDropboxStatus(): Promise<DropboxBackupStatus> {
  const config = getDropboxAppConfig();
  const [credentials, stored] = await Promise.all([
    readCredentials(),
    getDocumentStore().get(DROPBOX_STATUS_KEY, { type: "json" }) as Promise<StoredDropboxStatus | null>
  ]);

  return {
    available: config.available,
    connected: Boolean(config.available && credentials?.refreshToken),
    rootPath: config.rootPath,
    lastAttemptAt: stored?.lastAttemptAt || "",
    lastSuccessAt: stored?.lastSuccessAt || "",
    lastError: stored?.lastError || "",
    lastUploadedPath: stored?.lastUploadedPath || ""
  };
}

async function dropboxError(response: Response): Promise<Error> {
  const text = await response.text();
  let message = text;
  try {
    const payload = JSON.parse(text);
    message = payload?.error_summary || payload?.error_description || payload?.error || text;
  } catch {}
  return new Error(`Dropbox ${response.status}: ${String(message || response.statusText).slice(0, 500)}`);
}

async function accessToken(): Promise<string> {
  const config = getDropboxAppConfig();
  const credentials = await readCredentials();
  if (!config.available) throw new Error("Dropbox App Key und App Secret fehlen.");
  if (!credentials?.refreshToken) throw new Error("Dropbox ist noch nicht verbunden.");

  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "authorization": `Basic ${btoa(`${config.appKey}:${config.appSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken
    })
  });

  if (!response.ok) throw await dropboxError(response);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Dropbox hat kein Zugriffstoken geliefert.");
  return payload.access_token;
}

async function rpc(token: string, endpoint: string, body: unknown): Promise<any> {
  const response = await fetch(`https://api.dropboxapi.com/2/${endpoint}`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw await dropboxError(response);
  return response.json();
}

async function ensureFolderHierarchy(token: string, path: string): Promise<void> {
  const segments = path.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current += `/${segment}`;
    const response = await fetch("https://api.dropboxapi.com/2/files/create_folder_v2", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ path: current, autorename: false })
    });
    if (response.ok || response.status === 409) continue;
    throw await dropboxError(response);
  }
}

async function listFolderFiles(token: string, path: string): Promise<any[]> {
  const first = await rpc(token, "files/list_folder", {
    path,
    recursive: false,
    include_deleted: false,
    include_media_info: false,
    include_mounted_folders: true,
    limit: 2000
  });

  const entries = Array.isArray(first.entries) ? [...first.entries] : [];
  let cursor = first.cursor;
  let hasMore = Boolean(first.has_more);
  while (hasMore) {
    const next = await rpc(token, "files/list_folder/continue", { cursor });
    if (Array.isArray(next.entries)) entries.push(...next.entries);
    cursor = next.cursor;
    hasMore = Boolean(next.has_more);
  }
  return entries.filter((entry) => entry?.[".tag"] === "file");
}

async function pruneDropboxFolder(token: string, folderPath: string, keep: number): Promise<void> {
  const files = await listFolderFiles(token, folderPath);
  const obsolete = files
    .sort((left, right) => String(right.server_modified || right.client_modified || "").localeCompare(String(left.server_modified || left.client_modified || "")))
    .slice(keep);

  for (const file of obsolete) {
    await rpc(token, "files/delete_v2", { path: file.path_lower || file.path_display });
  }
}

function folderForType(type: BackupType): string {
  return ({ daily: "Daily", monthly: "Monthly", manual: "Manual", safety: "Safety" })[type];
}

function retentionForType(type: BackupType): number {
  return type === "daily" ? 30 : type === "monthly" ? 12 : type === "manual" ? 20 : 50;
}

export async function mirrorBackupToDropbox(
  type: BackupType,
  key: string,
  backup: BackupPayload
): Promise<DropboxBackupStatus> {
  const config = getDropboxAppConfig();
  const credentials = await readCredentials();
  if (!config.available || !credentials?.refreshToken) return getDropboxStatus();

  const attemptAt = new Date().toISOString();
  await writeStatus({
    ...(await getDocumentStore().get(DROPBOX_STATUS_KEY, { type: "json" }) as StoredDropboxStatus | null || {}),
    lastAttemptAt: attemptAt,
    lastError: ""
  });

  try {
    const token = await accessToken();
    const folder = `${config.rootPath}/${folderForType(type)}`;
    await ensureFolderHierarchy(token, folder);
    const filename = key.split("/").pop() || `${attemptAt.replace(/[:.]/g, "-")}.json`;
    const path = `${folder}/${filename}`;
    const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${token}`,
        "content-type": "application/octet-stream",
        "dropbox-api-arg": JSON.stringify({
          path,
          mode: "overwrite",
          autorename: false,
          mute: true,
          strict_conflict: false
        })
      },
      body: JSON.stringify(backup, null, 2)
    });
    if (!response.ok) throw await dropboxError(response);

    await pruneDropboxFolder(token, folder, retentionForType(type));
    await writeStatus({
      lastAttemptAt: attemptAt,
      lastSuccessAt: new Date().toISOString(),
      lastError: "",
      lastUploadedPath: path
    });
  } catch (error) {
    const previous = await getDocumentStore().get(DROPBOX_STATUS_KEY, { type: "json" }) as StoredDropboxStatus | null;
    await writeStatus({
      ...(previous || {}),
      lastAttemptAt: attemptAt,
      lastError: error instanceof Error ? error.message.slice(0, 500) : "Unbekannter Dropbox-Fehler"
    });
  }

  return getDropboxStatus();
}

export async function testDropboxConnection(): Promise<DropboxBackupStatus> {
  const config = getDropboxAppConfig();
  const attemptAt = new Date().toISOString();
  try {
    const token = await accessToken();
    await ensureFolderHierarchy(token, config.rootPath);
    await listFolderFiles(token, config.rootPath);
    await writeStatus({
      lastAttemptAt: attemptAt,
      lastSuccessAt: new Date().toISOString(),
      lastError: "",
      lastUploadedPath: ""
    });
  } catch (error) {
    const previous = await getDocumentStore().get(DROPBOX_STATUS_KEY, { type: "json" }) as StoredDropboxStatus | null;
    await writeStatus({
      ...(previous || {}),
      lastAttemptAt: attemptAt,
      lastError: error instanceof Error ? error.message.slice(0, 500) : "Unbekannter Dropbox-Fehler"
    });
  }
  return getDropboxStatus();
}

export async function createDropboxOAuthState(redirectUri: string): Promise<string> {
  const state = crypto.randomUUID().replace(/-/g, "");
  const record: OAuthStateRecord = { createdAt: new Date().toISOString(), redirectUri };
  await getDocumentStore().setJSON(`${DROPBOX_OAUTH_STATE_PREFIX}${state}`, record);
  return state;
}

export async function consumeDropboxOAuthState(state: string): Promise<OAuthStateRecord | null> {
  if (!/^[A-Za-z0-9]{20,100}$/.test(state)) return null;
  const key = `${DROPBOX_OAUTH_STATE_PREFIX}${state}`;
  const store = getDocumentStore();
  const record = await store.get(key, { type: "json" }) as OAuthStateRecord | null;
  await store.delete(key);
  if (!record?.createdAt || !record.redirectUri) return null;
  const age = Date.now() - new Date(record.createdAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age > 15 * 60 * 1000) return null;
  return record;
}

export async function storeDropboxRefreshToken(refreshToken: string, accountId = ""): Promise<void> {
  const credentials: DropboxCredentials = {
    refreshToken: cleanString(refreshToken, 2000),
    connectedAt: new Date().toISOString(),
    accountId: cleanString(accountId, 200)
  };
  if (!credentials.refreshToken) throw new Error("Kein Dropbox Refresh Token erhalten.");
  await getDocumentStore().setJSON(DROPBOX_CREDENTIALS_KEY, credentials);
  await writeStatus({ lastAttemptAt: "", lastSuccessAt: "", lastError: "", lastUploadedPath: "" });
}

export async function disconnectDropbox(): Promise<DropboxBackupStatus> {
  const store = getDocumentStore();
  await Promise.all([store.delete(DROPBOX_CREDENTIALS_KEY), store.delete(DROPBOX_STATUS_KEY)]);
  return getDropboxStatus();
}
