import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Módulos server-only (gateway do conector, chave service_role) são carregados
// dinamicamente dentro dos handlers: este arquivo entra no grafo do cliente
// por causa das createServerFn, e imports estáticos quebrariam o bundle.
const connector = () => import("@/integrations/lovable/appUserConnector");
const keyStore = () => import("@/server/appUserConnections.server");

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
];

function clientKey(): string {
  const k = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  if (!k) throw new Error("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY is not set");
  return k;
}

export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const request = getRequest();
    if (!request) throw new Error("OAuth must start from an app request.");
    const url = new URL(request.url);
    const sandboxHost =
      url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL(
      "/api/oauth/google/return",
      sandboxHost ? `https://${sandboxHost}` : url.origin,
    ).toString();

    const connectionAPIKey = await (await keyStore()).getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    const { authorizationUrl } = await (await connector()).authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientKey(),
      returnUrl,
      ...(connectionAPIKey ? { connectionAPIKey } : {}),
      credentialsConfiguration: { scopes: GOOGLE_CALENDAR_SCOPES },
    });
    return { authorizationUrl };
  });

export const completeGoogleCalendarConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const { connectionAPIKey, connectorId } = await (await connector()).exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) {
      throw new Error("OAuth completion returned the wrong connector");
    }
    await (await keyStore()).saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true };
  });

export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = await (await keyStore()).getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (key) {
      await (await connector()).disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: key,
        connectorId: CONNECTOR_ID,
      });
      await (await keyStore()).deleteConnectionKeyForUser(context.userId, CONNECTOR_ID);
    }
    return { ok: true };
  });

export const googleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = await (await keyStore()).getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return { connected: false as const };
    const res = await (await connector()).callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: "/calendar/v3/users/me/calendarList",
      init: { method: "GET" },
      requiredScopes: GOOGLE_CALENDAR_SCOPES,
    });
    if (await (await connector()).appUserReconnectRequired(res))
      return { connected: false as const, reconnectRequired: true as const };
    if (!res.ok) throw new Error(`Google Calendar falhou: ${res.status}`);
    const body = (await res.json()) as { items?: { id: string; summary: string }[] };
    return {
      connected: true as const,
      calendars: (body.items ?? []).map((c) => ({ id: c.id, name: c.summary })),
    };
  });

export interface GoogleEventItem {
  id: string;
  title: string;
  start: string; // ISO date or datetime
  end: string;
  allDay: boolean;
  htmlLink?: string | undefined;
}

export const listGoogleEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ timeMin: z.string(), timeMax: z.string() }))
  .handler(async ({ data, context }) => {
    const key = await (await keyStore()).getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!key) return { connected: false as const, events: [] as GoogleEventItem[] };
    const qs = new URLSearchParams({
      timeMin: data.timeMin,
      timeMax: data.timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });
    const res = await (await connector()).callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: CONNECTOR_ID,
      path: `/calendar/v3/calendars/primary/events?${qs}`,
      init: { method: "GET" },
      requiredScopes: GOOGLE_CALENDAR_SCOPES,
    });
    if (await (await connector()).appUserReconnectRequired(res))
      return { connected: false as const, reconnectRequired: true as const, events: [] };
    if (!res.ok) throw new Error(`Google Calendar falhou: ${res.status}`);
    const body = (await res.json()) as {
      items?: {
        id: string;
        summary?: string;
        htmlLink?: string;
        start?: { date?: string; dateTime?: string };
        end?: { date?: string; dateTime?: string };
      }[];
    };
    const events: GoogleEventItem[] = (body.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? "(sem título)",
      start: e.start?.date ?? e.start?.dateTime ?? "",
      end: e.end?.date ?? e.end?.dateTime ?? "",
      allDay: !!e.start?.date,
      htmlLink: e.htmlLink,
    }));
    return { connected: true as const, events };
  });
