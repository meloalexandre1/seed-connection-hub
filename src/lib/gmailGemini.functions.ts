/**
 * Gmail is an opt-in, per-user, read-only integration.
 * OAuth tokens are encrypted in app_user_connections and never sent to browsers.
 * No messages are automatically imported; one explicit user click is required.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assembleMeetingCapture, extractPlainGmailBody, normalizeMeetingTitle,
  type GmailPart,
} from "@/lib/gmailMeetingParser";

const CONNECTOR = "gmail_gemini";
const PENDING = "gmail_gemini_oauth_pending";
const READONLY = "https://www.googleapis.com/auth/gmail.readonly";
const ORIGIN_DEFAULT = "https://hub.sidneyconexao.com.br";
const ID = z.string().regex(/^[a-f0-9]{8,35}$/i);
type GmailTokens = { accessToken: string; refreshToken: string; expiresAt: number };
type Context = { userId: string; supabase: any };

function configuration() {
  // Dedicated Gmail OAuth credentials are preferred, but one existing Google
  // Web client can be reused after Gmail API and its scopes are enabled.
  const clientId = (process.env["GOOGLE_GMAIL_CLIENT_ID"] || process.env["GOOGLE_DRIVE_CLIENT_ID"] || "").trim();
  const clientSecret = (process.env["GOOGLE_GMAIL_CLIENT_SECRET"] || process.env["GOOGLE_DRIVE_CLIENT_SECRET"] || "").trim();
  const origin = (process.env["GOOGLE_GMAIL_APP_ORIGIN"] || process.env["GOOGLE_DRIVE_APP_ORIGIN"] || ORIGIN_DEFAULT).replace(/\/$/, "");
  const secret = process.env["APP_USER_CONNECTION_KEY_SECRET"] || "";
  const enabled = process.env["GMAIL_OAUTH_ENABLED"] === "true";
  return { clientId, clientSecret, origin, secret, enabled,
    ready: enabled && !!(clientId && clientSecret && secret && origin.startsWith("https://")) };
}
function requireConfig() {
  const cfg = configuration();
  if (!cfg.ready) throw new Error("Gmail OAuth ainda não foi habilitado. Configure as permissões Google e GMAIL_OAUTH_ENABLED=true no servidor antes de conectar a caixa de entrada.");
  return cfg;
}
const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const from64 = (s: string) => Uint8Array.from(
  atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")),
  c => c.charCodeAt(0),
);
async function signingKey() {
  const cfg = requireConfig();
  return crypto.subtle.importKey("raw", from64(cfg.secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]);
}
async function stateFor(userId: string) {
  const nonce = crypto.randomUUID();
  const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  await saveConnectionKeyForUser(userId, PENDING, nonce);
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    userId, nonce, expires: Date.now() + 600_000,
  })));
  const sig = await crypto.subtle.sign("HMAC", await signingKey(), new TextEncoder().encode(payload));
  return payload + "." + b64url(new Uint8Array(sig));
}
async function consumeState(userId: string, state: string) {
  if (!/^[\w-]{20,1500}\.[\w-]{25,1500}$/.test(state)) throw new Error("Autorização Gmail inválida.");
  const [payload = "", signature = ""] = state.split(".");
  const valid = await crypto.subtle.verify("HMAC", await signingKey(), from64(signature), new TextEncoder().encode(payload));
  if (!valid) throw new Error("Assinatura da autorização Gmail inválida.");
  const stateData = JSON.parse(new TextDecoder().decode(from64(payload))) as { userId: string; nonce: string; expires: number };
  if (stateData.userId !== userId || stateData.expires < Date.now()) throw new Error("Autorização Gmail expirada ou de outro usuário.");
  const { getConnectionKeyForUser, deleteConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  const nonce = await getConnectionKeyForUser(userId, PENDING);
  if (!nonce || nonce !== stateData.nonce) throw new Error("Essa autorização Gmail foi usada ou substituída.");
  await deleteConnectionKeyForUser(userId, PENDING);
}
async function saved(userId: string): Promise<GmailTokens | null> {
  const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  const s = await getConnectionKeyForUser(userId, CONNECTOR);
  return s ? JSON.parse(s) as GmailTokens : null;
}
async function save(userId: string, creds: GmailTokens) {
  const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  await saveConnectionKeyForUser(userId, CONNECTOR, JSON.stringify(creds));
}
async function accessToken(userId: string): Promise<string> {
  const previous = await saved(userId);
  if (!previous) throw new Error("Gmail ainda não foi autorizado. Use o botão Conectar Gmail.");
  if (previous.expiresAt > Date.now() + 90_000) return previous.accessToken;
  const cfg = requireConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: {"content-type":"application/x-www-form-urlencoded"},
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret,
      refresh_token: previous.refreshToken, grant_type:"refresh_token" }),
  });
  if (!response.ok) throw new Error("A autorização Gmail expirou. Reconecte a conta em Integrações.");
  const next = await response.json() as { access_token: string; expires_in: number; refresh_token?: string };
  if (!next.access_token) throw new Error("Não foi possível renovar a conexão Gmail.");
  await save(userId, { accessToken:next.access_token, refreshToken:next.refresh_token ?? previous.refreshToken, expiresAt:Date.now() + next.expires_in*1000 });
  return next.access_token;
}
async function gmailGet<T>(userId: string, path: string): Promise<T> {
  const token = await accessToken(userId);
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/" + path, {
    headers: {Authorization: "Bearer " + token, Accept:"application/json"},
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new Error("O Gmail recusou o acesso. Confira Gmail API, permissões gmail.readonly e reconecte a conta.");
  if (!res.ok) throw new Error("Não foi possível consultar os resumos no Gmail (" + res.status + ").");
  return await res.json() as T;
}
type GmailMessage = {
  id: string; snippet?: string; internalDate?: string;
  payload?: GmailPart & { headers?: Array<{name:string;value:string}> };
};
function headersOf(m: GmailMessage) {
  const headers = m.payload?.headers ?? [];
  const get = (name:string) => headers.find(h=>h.name.toLowerCase()===name.toLowerCase())?.value ?? "";
  return { subject:normalizeMeetingTitle(get("subject")), from:get("from").slice(0,180), date:get("date").slice(0,120) };
}
async function messageFor(userId:string, id:string) {
  return gmailGet<GmailMessage>(userId, "messages/" + encodeURIComponent(id) + "?format=full");
}

export const gmailGeminiStatus = createServerFn({ method:"GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    configured: configuration().ready,
    connected: !!(await saved(context.userId)),
  }));

export const beginGmailGeminiConnect = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({context}) => {
    const cfg = requireConfig();
    const request = getRequest();
    if (!request || new URL(request.url).origin !== cfg.origin)
      throw new Error("Abra a versão publicada do Seed Connection para conectar o Gmail.");
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.searchParams.set("client_id", cfg.clientId);
    auth.searchParams.set("redirect_uri", cfg.origin+"/api/oauth/gmail/return");
    auth.searchParams.set("response_type", "code");
    auth.searchParams.set("scope", READONLY);
    auth.searchParams.set("access_type", "offline");
    auth.searchParams.set("prompt", "consent");
    auth.searchParams.set("state", await stateFor(context.userId));
    return { authorizationUrl: auth.toString() };
  });

export const finishGmailGeminiConnect = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({code:z.string().min(5).max(2048),state:z.string().min(30).max(3500)}))
  .handler(async ({context,data}) => {
    await consumeState(context.userId, data.state);
    const cfg = requireConfig();
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method:"POST", headers: {"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        grant_type:"authorization_code", code:data.code, client_id:cfg.clientId,
        client_secret:cfg.clientSecret, redirect_uri:cfg.origin+"/api/oauth/gmail/return",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(()=>null) as {error?:string} | null;
      const type = data?.error ?? "";
      if(type === "invalid_client") throw new Error("Client ID e Client Secret do Gmail não correspondem ou foram recusados pelo Google.");
      if(type === "invalid_grant") throw new Error("Código Gmail expirou. Confira o endereço de retorno OAuth e tente novamente.");
      throw new Error("Não foi possível finalizar a autorização do Gmail (HTTP " + res.status + ").");
    }
    const t = await res.json() as {access_token?:string;refresh_token?:string;expires_in?:number};
    if(!t.access_token || !t.refresh_token) throw new Error("O Google não enviou autorização renovável. Reconecte e aceite o consentimento.");
    await save(context.userId,{ accessToken:t.access_token,refreshToken:t.refresh_token,expiresAt:Date.now()+(t.expires_in??3600)*1000 });
    return {ok:true};
  });

export const disconnectGmailGemini = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .handler(async ({context})=>{
    const {deleteConnectionKeyForUser}=await import("@/server/appUserConnections.server");
    await deleteConnectionKeyForUser(context.userId, CONNECTOR);
    return {ok:true};
  });

export const searchGmailMeetingSummaries = createServerFn({method:"GET"})
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({search:z.string().trim().max(120).default('("Gemini" OR "notas da reunião" OR "meeting notes")')}))
  .handler(async ({context,data})=>{
    const query = data.search || '("Gemini" OR "notas da reunião" OR "meeting notes")';
    const list = await gmailGet<{messages?:{id:string}[]}>(context.userId,
      "messages?maxResults=12&q="+encodeURIComponent("newer_than:180d "+query));
    const ids=(list.messages??[]).slice(0,12).map(m=>m.id).filter(id=>ID.safeParse(id).success);
    const messages = await Promise.all(ids.map(async id=>{
      const m=await messageFor(context.userId,id);
      return {id:m.id, ...headersOf(m), snippet:(m.snippet??"").slice(0,300)};
    }));
    return {messages};
  });

export const importGmailMeetingSummary = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({id:ID}))
  .handler(async ({context,data})=>{
    const externalId="gmail:"+data.id;
    const table=context.supabase.from("captures");
    const existing=await table.select("id").eq("owner_id",context.userId).eq("external_id",externalId).maybeSingle();
    if(existing.error) throw existing.error;
    if(existing.data) return {id:existing.data.id as string, imported:false,alreadyImported:true};
    const m=await messageFor(context.userId,data.id);
    const parsed=assembleMeetingCapture({...headersOf(m),
      body:extractPlainGmailBody(m.payload),messageId:m.id});
    const result=await table.insert({
      owner_id:context.userId, visibility:"privado", source:"integracao",
      kind:"nota", status:"revisar", title:parsed.title, note:parsed.note,
      external_id:externalId,
    }).select("id").single();
    if(result.error || !result.data) throw new Error("Não foi possível salvar o resumo. Verifique permissões do Supabase.");
    return {id:result.data.id as string,imported:true,alreadyImported:false};
  });
