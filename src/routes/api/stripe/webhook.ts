import { createFileRoute } from "@tanstack/react-router";
import { stripeTestConfig, verifyStripeWebhook } from "@/server/stripeTest.server";

const allowed = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.created",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "credit_note.created",
  "charge.refunded",
]);

function json(status: number, payload: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status, headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          stripeTestConfig();
        } catch {
          return json(503, { error: "Stripe sandbox disabled" });
        }
        const contentLength = Number(request.headers.get("content-length") ?? "0");
        if (contentLength > 1024 * 1024) return json(413, { error: "Payload too large" });
        const raw = await request.text();
        if (raw.length > 1024 * 1024) return json(413, { error: "Payload too large" });
        let event: Awaited<ReturnType<typeof verifyStripeWebhook>>;
        try {
          event = await verifyStripeWebhook(raw, request.headers.get("stripe-signature"));
        } catch {
          return json(400, { error: "Invalid webhook signature or event" });
        }
        if (!allowed.has(event.type)) return json(200, { received: "ignored" });
        // Persist first, then acknowledge. Event IDs provide durable deduplication.
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("stripe_test_events" as any).upsert({
            event_id: event.id,
            type: event.type,
            stripe_object_id: event.data.object.id,
            stripe_customer_id: typeof event.data.object.customer === "string"
              ? event.data.object.customer : null,
          } as any, { onConflict: "event_id", ignoreDuplicates: true });
          if (error) throw error;
        } catch (error) {
          console.error("Unable to persist verified Stripe test event", error);
          return json(503, { error: "Unable to persist Stripe event" });
        }
        return json(200, { received: "ok" });
      },
    },
  },
});
