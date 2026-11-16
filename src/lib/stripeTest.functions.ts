import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { stripeTestRequest } from "@/server/stripeTest.server";

const uuid = z.string().uuid();
const ref = z.string().regex(/^cus_[A-Za-z0-9]+$/);
const price = z.string().regex(/^price_[A-Za-z0-9]+$/);
const requestId = uuid;
const httpOrigin = z.string().url().refine(value => new URL(value).protocol === "https:");

async function assertFinanceAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from("user_roles")
    .select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Only administrators can initiate Stripe operations");
}

function approvedOrigin() {
  const origin = process.env["STRIPE_APP_ORIGIN"];
  if (!origin) throw new Error("STRIPE_APP_ORIGIN is not configured");
  return new URL(httpOrigin.parse(origin)).origin;
}

function allowlistedPrice(priceId: string) {
  const allowed = (process.env["STRIPE_TEST_PRICE_IDS"] ?? "").split(",").map(v => v.trim());
  if (!allowed.includes(priceId)) throw new Error("Price is not configured for sandbox billing");
}

async function assertPerson(context: { supabase: any }, personId: string) {
  const { data, error } = await context.supabase.from("people")
    .select("id,name").eq("id", personId).maybeSingle();
  if (error || !data) throw new Error("Person not found or not accessible");
  return data as { id: string; name: string };
}

export const createStripeTestCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    personId: uuid, email: z.string().email().max(254), requestId,
  }).parse(value))
  .handler(async ({ data, context }) => {
    await assertFinanceAdmin(context);
    const person = await assertPerson(context, data.personId);
    const customer = await stripeTestRequest<{ id: string }>("\/customers", {
      name: person.name, email: data.email.trim().toLowerCase(),
      "metadata[seed_person_id]": person.id,
    }, `seed-test-customer-${person.id}`);
    return { customerId: customer.id, personId: person.id, mode: "test" as const };
  });

export const createStripeTestCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    customerId: ref, priceId: price, requestId,
  }).parse(value))
  .handler(async ({ data, context }) => {
    await assertFinanceAdmin(context);
    allowlistedPrice(data.priceId);
    const origin = approvedOrigin();
    const session = await stripeTestRequest<{ id: string; url: string | null }>("\/checkout\/sessions", {
      mode: "subscription", customer: data.customerId,
      "line_items[0][price]": data.priceId, "line_items[0][quantity]": 1,
      success_url: `${origin}/configuracoes?stripe_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/configuracoes?stripe_checkout=cancel`,
      "metadata[seed_source]": "seed_connection_hub",
      "subscription_data[metadata][seed_source]": "seed_connection_hub",
      "subscription_data[billing_mode][type]": "flexible",
      "automatic_tax[enabled]": false,
    }, `seed-test-checkout-${data.requestId}`);
    return { sessionId: session.id, url: session.url, mode: "test" as const };
  });

export const createStripeTestInvoiceDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({
    customerId: ref,
    description: z.string().trim().min(3).max(300),
    amountCents: z.number().int().min(100).max(100000000),
    requestId,
  }).parse(value))
  .handler(async ({ data, context }) => {
    await assertFinanceAdmin(context);
    const invoice = await stripeTestRequest<{ id: string; status: string }>("\/invoices", {
      customer: data.customerId,
      collection_method: "send_invoice",
      days_until_due: 14,
      auto_advance: false,
      "automatic_tax[enabled]": false,
      "metadata[seed_source]": "seed_connection_hub",
      "metadata[seed_request_id]": data.requestId,
    }, `seed-test-invoice-${data.requestId}`);
    await stripeTestRequest<{ id: string }>("\/invoiceitems", {
      customer: data.customerId,
      invoice: invoice.id,
      amount: data.amountCents,
      currency: "brl",
      description: data.description,
    }, `seed-test-invoice-item-${data.requestId}`);
    return { invoiceId: invoice.id, status: invoice.status, mode: "test" as const, draftOnly: true };
  });

export const createStripeTestCustomerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ customerId: ref, requestId }).parse(value))
  .handler(async ({ data, context }) => {
    await assertFinanceAdmin(context);
    const portal = await stripeTestRequest<{ url: string }>("\/billing_portal\/sessions", {
      customer: data.customerId, return_url: `${approvedOrigin()}/configuracoes`,
    }, `seed-test-portal-${data.requestId}`);
    return { url: portal.url, mode: "test" as const };
  });
