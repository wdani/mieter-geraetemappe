import type { Config, Context } from "@netlify/functions";
import { isAuthorized } from "./_shared.mjs";
import {
  consumeDropboxOAuthState,
  createDropboxOAuthState,
  disconnectDropbox,
  getDropboxAppConfig,
  storeDropboxRefreshToken
} from "./dropbox-lib.mjs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function html(title: string, message: string, origin: string, success: boolean): Response {
  const safeTitle = title.replace(/[<>&"]/g, "");
  const safeMessage = message.replace(/[<>&]/g, "");
  const originJson = JSON.stringify(origin);
  return new Response(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f7f6;color:#17322f;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}.card{max-width:520px;background:white;border:1px solid #d8e4e1;border-radius:24px;padding:32px;box-shadow:0 18px 55px rgba(17,52,47,.12)}h1{margin-top:0;color:#075a54}a,button{display:inline-flex;padding:12px 16px;border:0;border-radius:12px;background:#0f766e;color:white;text-decoration:none;font-weight:700;cursor:pointer}</style></head>
<body><main class="card"><h1>${safeTitle}</h1><p>${safeMessage}</p><button onclick="window.close()">Fenster schliessen</button> <a href="/">Zur Gerätemappe</a></main>
<script>try{window.opener&&window.opener.postMessage({type:${JSON.stringify(success ? "dropbox-connected" : "dropbox-error")}},${originJson})}catch(e){}</script></body></html>`, {
    status: success ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

async function exchangeCode(code: string, redirectUri: string) {
  const config = getDropboxAppConfig();
  const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "authorization": `Basic ${btoa(`${config.appKey}:${config.appSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  const payload = await response.json().catch(() => ({})) as {
    refresh_token?: string;
    account_id?: string;
    error_description?: string;
    error?: string;
  };
  if (!response.ok || !payload.refresh_token) {
    throw new Error(payload.error_description || payload.error || "Dropbox hat keinen Refresh Token geliefert.");
  }
  return payload;
}

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "";

  if (request.method === "GET" && action === "callback") {
    const origin = url.origin;
    const error = url.searchParams.get("error_description") || url.searchParams.get("error") || "";
    if (error) return html("Dropbox nicht verbunden", error, origin, false);

    const state = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    const record = await consumeDropboxOAuthState(state);
    if (!record || !code) return html("Dropbox nicht verbunden", "Die Verbindungsanfrage ist ungültig oder abgelaufen.", origin, false);

    try {
      const payload = await exchangeCode(code, record.redirectUri);
      await storeDropboxRefreshToken(payload.refresh_token || "", payload.account_id || "");
      return html("Dropbox verbunden", "Die Gerätemappe kann automatische Backups nun zusätzlich in den eigenen Dropbox-App-Ordner kopieren.", origin, true);
    } catch (exchangeError) {
      return html("Dropbox nicht verbunden", exchangeError instanceof Error ? exchangeError.message : "Unbekannter Fehler", origin, false);
    }
  }

  if (!isAuthorized(request)) return json({ error: "Nicht autorisiert." }, 401);

  if (request.method === "GET" && action === "start") {
    const config = getDropboxAppConfig();
    if (!config.available) {
      return json({ error: "DROPBOX_APP_KEY und DROPBOX_APP_SECRET sind noch nicht eingerichtet." }, 400);
    }

    const redirectUri = `${url.origin}/api/dropbox-oauth?action=callback`;
    const state = await createDropboxOAuthState(redirectUri);
    const authorizationUrl = new URL("https://www.dropbox.com/oauth2/authorize");
    authorizationUrl.searchParams.set("client_id", config.appKey);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("token_access_type", "offline");
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("state", state);
    return json({ authorizationUrl: authorizationUrl.toString(), redirectUri });
  }

  if (request.method === "DELETE") {
    return json({ dropbox: await disconnectDropbox() });
  }

  return json({ error: "Methode nicht erlaubt." }, 405);
};

export const config: Config = { path: "/api/dropbox-oauth" };
