import { createFileRoute } from "@tanstack/react-router";

async function safeCronAuth(request: Request): Promise<boolean> {
  const secret = process.env["PUSH_CRON_SECRET"];
  const incoming = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32 || !incoming.startsWith("Bearer ")) return false;
  const supplied = incoming.slice(7);
  const encoded = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoded.encode(secret)),
    crypto.subtle.digest("SHA-256", encoded.encode(supplied)),
  ]);
  const x = new Uint8Array(a),
    y = new Uint8Array(b);
  let result = 0;
  for (let i = 0; i < x.length; i++) result |= x[i]! ^ y[i]!;
  return result === 0;
}

export const Route = createFileRoute("/api/push/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await safeCronAuth(request)))
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        if (process.env["PUSH_DELIVERY_ENABLED"] !== "true")
          return new Response(JSON.stringify({ error: "Disabled" }), {
            status: 503,
            headers: { "content-type": "application/json" },
          });
        try {
          const { dispatchPushReminders } = await import("@/server/pushDispatch.server");
          const result = await dispatchPushReminders();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        } catch {
          return new Response(JSON.stringify({ error: "Dispatch unavailable" }), {
            status: 503,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        }
      },
    },
  },
});
