/**
 * Stripe test-mode only REST client. Credentials never reach the browser.
 * Replace with the official Stripe SDK when dependency/lockfile install is available.
 */
export function stripeTestConfig() {
  const key = process.env["STRIPE_SECRET_KEY"] ?? "";
  if (process.env["STRIPE_TEST_INTEGRATION_ENABLED"] !== "true") throw new Error("Stripe integration disabled");
  if (!key.startsWith("sk_test_")) throw new Error("Only Stripe test keys are accepted");
  return key;
}

export function encodeStripeParams(input: Record<string, string | number | boolean | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [name, value] of Object.entries(input)) {
    if (value !== undefined) out.set(name, String(value));
  }
  return out;
}

export async function stripeTestRequest<T>(
  resource: string,
  params?: Record<string, string | number | boolean | undefined>,
  idempotencyKey?: string,
): Promise<T> {
  const key = stripeTestConfig();
  if (!/^\/[a-z0-9/_-]+$/i.test(resource)) throw new Error("Invalid Stripe API resource");
  const response = await fetch(`https://api.stripe.com/v1${resource}`, {
    method: params ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: params ? encodeStripeParams(params) : undefined,
    cache: "no-store",
  });
  const result = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(`Stripe API ${response.status}: ${result.error?.message ?? "request failed"}`);
  return result;
}

export async function verifyStripeWebhook(rawBody: string, signatureHeader: string | null): Promise<{
  id: string; type: string; livemode: boolean; data: { object: { id: string; customer?: string } };
}> {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";
  if (!secret.startsWith("whsec_") || !signatureHeader) throw new Error("Missing webhook signature configuration");
  const fields = signatureHeader.split(",").map(x => x.trim());
  const timestamp = fields.find(x => x.startsWith("t="))?.slice(2);
  const signatures = fields.filter(x => x.startsWith("v1=")).map(x => x.slice(3));
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) throw new Error("Invalid webhook signature");
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Webhook timestamp outside tolerance");
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign(
    "HMAC", cryptoKey, new TextEncoder().encode(`${timestamp}.${rawBody}`),
  ));
  const expected = Array.from(mac, x => x.toString(16).padStart(2, "0")).join("");
  let match = 0;
  for (const candidate of signatures) {
    if (!/^[a-f0-9]{64}$/i.test(candidate)) continue;
    let diff = 0;
    for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ candidate.toLowerCase().charCodeAt(i);
    match |= Number(diff === 0);
  }
  if (!match) throw new Error("Invalid webhook signature");
  const event = JSON.parse(rawBody);
  if (!event || typeof event.id !== "string" || typeof event.type !== "string" || event.livemode !== false)
    throw new Error("Unexpected webhook event");
  return event;
}
