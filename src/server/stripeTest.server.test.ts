import { afterEach, describe, expect, it } from "vitest";
import { stripeTestConfig, verifyStripeWebhook, encodeStripeParams } from "./stripeTest.server";

const prior = {
  enabled: process.env["STRIPE_TEST_INTEGRATION_ENABLED"],
  key: process.env["STRIPE_SECRET_KEY"],
  webhook: process.env["STRIPE_WEBHOOK_SECRET"],
};
afterEach(() => {
  for (const [name, value] of Object.entries({
    STRIPE_TEST_INTEGRATION_ENABLED: prior.enabled,
    STRIPE_SECRET_KEY: prior.key,
    STRIPE_WEBHOOK_SECRET: prior.webhook,
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

async function makeSignature(body: string, secret: string, timestamp: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key,
    new TextEncoder().encode(`${timestamp}.${body}`)));
  const hex = Array.from(digest, x => x.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

describe("Stripe sandbox guards", () => {
  it("rejects disabled integration", () => {
    delete process.env["STRIPE_TEST_INTEGRATION_ENABLED"];
    process.env["STRIPE_SECRET_KEY"] = "sk_test_fixture";
    expect(() => stripeTestConfig()).toThrow(/disabled/);
  });
  it("rejects live key even if enabled", () => {
    process.env["STRIPE_TEST_INTEGRATION_ENABLED"] = "true";
    process.env["STRIPE_SECRET_KEY"] = "sk_live_not_allowed";
    expect(() => stripeTestConfig()).toThrow(/test keys/);
  });
  it("encodes nested Stripe parameter names", () => {
    expect(encodeStripeParams({ "line_items[0][price]": "price_test", quantity: 1 })
      .get("line_items[0][price]")).toBe("price_test");
  });
  it("verifies an authentic signed test webhook", async () => {
    const secret = "whsec_test_fixture";
    const body = JSON.stringify({ id: "evt_123", type: "invoice.paid", livemode: false,
      data: { object: { id: "in_123", customer: "cus_123" } } });
    process.env["STRIPE_WEBHOOK_SECRET"] = secret;
    const signature = await makeSignature(body, secret, Math.floor(Date.now() / 1000));
    const event = await verifyStripeWebhook(body, signature);
    expect(event.type).toBe("invoice.paid");
  });
  it("rejects tampered webhook payload and live-mode events", async () => {
    const secret = "whsec_test_fixture";
    process.env["STRIPE_WEBHOOK_SECRET"] = secret;
    const body = JSON.stringify({ id: "evt_123", type: "invoice.paid", livemode: false,
      data: { object: { id: "in_123" } } });
    const signature = await makeSignature(body, secret, Math.floor(Date.now() / 1000));
    await expect(verifyStripeWebhook(body + " ", signature)).rejects.toThrow(/signature/);
    const liveBody = body.replace('"livemode":false', '"livemode":true');
    const liveSig = await makeSignature(liveBody, secret, Math.floor(Date.now() / 1000));
    await expect(verifyStripeWebhook(liveBody, liveSig)).rejects.toThrow(/Unexpected/);
  });
  it("rejects stale webhook timestamps", async () => {
    const secret = "whsec_test_fixture";
    process.env["STRIPE_WEBHOOK_SECRET"] = secret;
    const body = JSON.stringify({ id: "evt_123", type: "invoice.paid", livemode: false,
      data: { object: { id: "in_123" } } });
    const old = Math.floor(Date.now() / 1000) - 700;
    await expect(verifyStripeWebhook(body, await makeSignature(body, secret, old)))
      .rejects.toThrow(/tolerance/);
  });
});
