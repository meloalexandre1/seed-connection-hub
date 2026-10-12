/**
 * Google Drive as optional storage backend for large Seed Connection captures.
 * The owner's OAuth tokens are encrypted at rest in app_user_connections.
 * No OAuth token is returned to the browser; only resumable session URLs, which
 * are short-lived capabilities scoped to one authorized capture upload.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  cleanUploadName, isAllowedDriveMime, MAX_UPLOAD_BYTES,
  SEED_DRIVE_FOLDER_ID, verifyUploadedDriveFile,
} from "@/lib/driveUploadValidation";

const CONNECTION = "google_drive_storage";
const FOLDER = SEED_DRIVE_FOLDER_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const MAX_BYTES = MAX_UPLOAD_BYTES; // 1 GiB per upload initially

type StoredOAuth = { accessToken: string; refreshToken: string; expiresAt: number };
type Authed = { supabase: any; userId: string };

function config() {
  const clientId = process.env["GOOGLE_DRIVE_CLIENT_ID"] ?? "";
  const clientSecret = process.env["GOOGLE_DRIVE_CLIENT_SECRET"] ?? "";
  const origin = (process.env["GOOGLE_DRIVE_APP_ORIGIN"] ?? "").replace(/\/$/, "");
  const keySecret = process.env["APP_USER_CONNECTION_KEY_SECRET"] ?? "";
  return { clientId, clientSecret, origin, keySecret, ready: !!(clientId && clientSecret && origin && keySecret) };
}
function requireConfig() {
  const c = config();
  if (!c.ready) throw new Error("Drive aguardando configuração de OAuth no servidor (Google Client ID, Client Secret e URL de origem).");
  if (!c.origin.startsWith("https://")) throw new Error("Origem pública de Drive deve utilizar HTTPS.");
  return c;
}
async function role({ supabase, userId }: Authed) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle();
  if (error || !data) throw new Error("Acesso ao Google Drive restrito a integrantes autorizados.");
  return data.role as string;
}
async function checkAdmin(ctx: Authed) {
  if ((await role(ctx)) !== "admin") throw new Error("Somente administradores podem vincular uma conta Google Drive.");
}
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const decode = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")), c => c.charCodeAt(0));
async function hmacKey() {
  const secret = requireConfig().keySecret;
  return crypto.subtle.importKey("raw", decode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function makeState(userId: string) {
  const nonce = crypto.randomUUID();
  const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  await saveConnectionKeyForUser(userId, "google_drive_oauth_pending", nonce);
  const payload = encode(new TextEncoder().encode(JSON.stringify({ userId, until: Date.now() + 600_000, nonce })));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload));
  return payload + "." + encode(new Uint8Array(signature));
}
async function verifyState(state: string, userId: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature || state.length > 4000) throw new Error("Autorização do Drive inválida.");
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(), decode(signature), new TextEncoder().encode(payload));
  if (!valid) throw new Error("A assinatura da autorização do Drive não é válida.");
  const data = JSON.parse(new TextDecoder().decode(decode(payload))) as { userId: string; until: number; nonce: string };
  if (data.userId !== userId || data.until < Date.now() || !data.nonce)
    throw new Error("Autorização expirada ou de outro usuário.");
  const { getConnectionKeyForUser, deleteConnectionKeyForUser } =
    await import("@/server/appUserConnections.server");
  const pending = await getConnectionKeyForUser(userId, "google_drive_oauth_pending");
  if (!pending || pending !== data.nonce) throw new Error("A autorização já foi usada ou substituída.");
  // Consume before using Google's one-time authorization code.
  await deleteConnectionKeyForUser(userId, "google_drive_oauth_pending");
}
async function storedFor(userId: string): Promise<StoredOAuth | null> {
  const { getConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  const s = await getConnectionKeyForUser(userId, CONNECTION);
  if (!s) return null;
  return JSON.parse(s) as StoredOAuth;
}
async function saveFor(userId: string, data: StoredOAuth) {
  const { saveConnectionKeyForUser } = await import("@/server/appUserConnections.server");
  await saveConnectionKeyForUser(userId, CONNECTION, JSON.stringify(data));
}
async function tokenFor(userId: string): Promise<string> {
  const saved = await storedFor(userId);
  if (!saved) throw new Error("O Drive ainda não foi autorizado pelo administrador do Seed Connection.");
  if (saved.expiresAt > Date.now() + 90_000) return saved.accessToken;
  const c = requireConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId, client_secret: c.clientSecret,
      refresh_token: saved.refreshToken, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("A autorização do Google Drive expirou. Reconecte sua conta em Configurações.");
  const fresh = await res.json() as { access_token: string; expires_in: number; refresh_token?: string };
  await saveFor(userId, {
    accessToken: fresh.access_token,
    refreshToken: fresh.refresh_token ?? saved.refreshToken,
    expiresAt: Date.now() + fresh.expires_in * 1000,
  });
  return fresh.access_token;
}
async function ownerFor(userId: string): Promise<string> {
  // The administrative owner's UID is deliberately configured on the server;
  // this ensures collaborators cannot silently switch storage to their Drive.
  const owner = process.env["GOOGLE_DRIVE_STORAGE_OWNER_UID"] ?? "";
  if (owner) return owner;
  if (await storedFor(userId)) return userId; // admin can test before configuring staff
  throw new Error("Defina GOOGLE_DRIVE_STORAGE_OWNER_UID no servidor para permitir uploads da equipe.");
}
async function driveApi(token: string, url: string, opts: RequestInit = {}) {
  const headers = new Headers(opts.headers);
  headers.set("Authorization", "Bearer " + token);
  const response = await fetch(url, { ...opts, headers });
  if (!response.ok) throw new Error("Google Drive recusou a operação (" + response.status + "). Verifique acesso à pasta e autorização Google.");
  return response;
}
async function ensureFolder(token: string) {
  const r = await driveApi(token, "https://www.googleapis.com/drive/v3/files/" + FOLDER +
    "?fields=id,name,mimeType,capabilities(canAddChildren)");
  const f = await r.json() as { mimeType: string; capabilities?: { canAddChildren: boolean } };
  if (f.mimeType !== "application/vnd.google-apps.folder" || !f.capabilities?.canAddChildren)
    throw new Error("O aplicativo não tem permissão de gravação na pasta Seed Connection — Arquivos.");
}
const uploadInput = z.object({
  name: z.string().trim().min(1).max(180),
  kind: z.enum(["audio", "video", "foto", "arquivo", "plaud"]),
  mime: z.string().min(3).max(130),
  size: z.number().int().min(1).max(MAX_BYTES),
});
function allowedMime(mime: string) {
  return isAllowedDriveMime(mime);
}

export const startGoogleDriveConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await checkAdmin(context as Authed);
    const c = requireConfig();
    const request = getRequest();
    if (!request || new URL(request.url).origin !== c.origin) {
      throw new Error("Abra o endereço público configurado do Seed Connection para conectar o Drive.");
    }
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", c.clientId);
    url.searchParams.set("redirect_uri", c.origin + "/api/oauth/drive/return");
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", await makeState(context.userId));
    return { authorizationUrl: url.toString() };
  });

export const completeGoogleDriveConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: z.string().min(5).max(2048), state: z.string().min(20).max(4000) }))
  .handler(async ({ context, data }) => {
    await checkAdmin(context as Authed);
    await verifyState(data.state, context.userId);
    const c = requireConfig();
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code", code: data.code,
        client_id: c.clientId, client_secret: c.clientSecret,
        redirect_uri: c.origin + "/api/oauth/drive/return",
      }),
    });
    if (!res.ok) throw new Error("O Google não concluiu a autorização. Tente novamente.");
    const t = await res.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!t.access_token || !t.refresh_token) throw new Error("Google não forneceu acesso permanente. Revogue o consentimento anterior e autorize novamente.");
    await saveFor(context.userId, {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000,
    });
    return { ok: true };
  });

export const googleDriveStorageStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const r = await role(context as Authed);
    const c = config();
    if (!c.ready) return { configured: false, connected: false, folderReady: false, isAdmin: r === "admin" };
    try {
      const ownerId = await ownerFor(context.userId);
      const token = await tokenFor(ownerId);
      try {
        await ensureFolder(token);
        return { configured: true, connected: true, folderReady: true, isAdmin: r === "admin" };
      } catch {
        return { configured: true, connected: true, folderReady: false, isAdmin: r === "admin" };
      }
    } catch {
      return { configured: true, connected: false, folderReady: false, isAdmin: r === "admin" };
    }
  });

export const startDriveCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(uploadInput)
  .handler(async ({ data, context }) => {
    await role(context as Authed);
    if (!allowedMime(data.mime)) throw new Error("Formato de arquivo não permitido no Drive.");
    const ownerId = await ownerFor(context.userId);
    const token = await tokenFor(ownerId);
    await ensureFolder(token);
    const title = cleanUploadName(data.name);
    // Create a private, owner-bound capture BEFORE asking Google for a session.
    // The Drive upload carries the capture ID as private application metadata.
    const { data: capture, error } = await context.supabase.from("captures").insert({
      owner_id: context.userId, visibility: "privado", source: "integracao",
      kind: data.kind, title, mime: data.mime, size_bytes: data.size,
      status: "enviando",
    }).select("id").single();
    if (error || !capture) throw new Error("Falha ao preparar a captura no banco.");
    let uploadUrl: string | null = null;
    try {
      const req = await driveApi(token,
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,parents,appProperties",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": data.mime,
            "X-Upload-Content-Length": String(data.size),
          },
          body: JSON.stringify({
            name: title, mimeType: data.mime, parents: [FOLDER],
            appProperties: { seedCaptureId: capture.id, seedOwnerId: context.userId },
          }),
        },
      );
      uploadUrl = req.headers.get("Location");
      if (!uploadUrl || !uploadUrl.startsWith("https://www.googleapis.com/")) {
        throw new Error("O Google Drive não retornou uma sessão de upload válida.");
      }
    } catch (err) {
      await context.supabase.from("captures")
        .update({ status: "erro", error: "Não foi possível iniciar o upload no Drive." })
        .eq("id", capture.id);
      throw err;
    }
    return { uploadUrl, captureId: capture.id as string };
  });

export const finishDriveCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ captureId: z.string().uuid(), fileId: z.string().regex(/^[\w-]{8,250}$/) }))
  .handler(async ({ data, context }) => {
    await role(context as Authed);
    const { data: capture, error } = await context.supabase.from("captures")
      .select("id,size_bytes,status,owner_id,mime").eq("id", data.captureId).maybeSingle();
    if (error || !capture || capture.owner_id !== context.userId || capture.status !== "enviando") {
      throw new Error("Captura não encontrada ou sem autorização de atualização.");
    }
    const token = await tokenFor(await ownerFor(context.userId));
    const result = await driveApi(token, "https://www.googleapis.com/drive/v3/files/" +
      data.fileId + "?fields=id,name,size,mimeType,parents,trashed,appProperties");
    const file = await result.json();
    if (file.id !== data.fileId) throw new Error("ID do arquivo no Drive não corresponde.");
    verifyUploadedDriveFile(file, capture);
    const { error: saveError } = await context.supabase.from("captures").update({
      status: "revisar", external_id: "gdrive:" + file.id, storage_path: null, error: null,
    }).eq("id", capture.id);
    if (saveError) throw new Error("Arquivo enviado ao Drive, mas falhou ao vincular ao Supabase. Contate o administrador antes de reenviar.");
    return { ok: true, captureId: capture.id as string };
  });

/**
 * Google Picker is a user-initiated access grant to the pre-existing folder.
 * The short-lived access token is sent only to the admin's authenticated
 * browser; the long-lived refresh token stays encrypted on the server.
 */
export const googleDrivePickerCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await checkAdmin(context as Authed);
    const developerKey = process.env["GOOGLE_DRIVE_PICKER_API_KEY"] ?? "";
    const appId = process.env["GOOGLE_DRIVE_PICKER_APP_ID"] ?? "";
    if (!developerKey || !appId) throw new Error("Configure GOOGLE_DRIVE_PICKER_API_KEY e GOOGLE_DRIVE_PICKER_APP_ID para selecionar a pasta.");
    return {
      token: await tokenFor(context.userId), developerKey, appId,
      folderId: FOLDER,
    };
  });
