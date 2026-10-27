import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/push/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
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
