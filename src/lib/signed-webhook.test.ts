import { describe, expect, it } from "vitest";
import {
  createWebhookSignature,
  signedWebhookHeaders,
  verifyWebhookSignature,
  webhookSigningSecretConfigured,
} from "./signed-webhook";

const secret = "55".repeat(32);
const body = JSON.stringify({ type: "approval", amount: "40000000" });
const timestamp = "1784548800";
const deliveryId = "4bcb598b-8cbb-4f13-b3d1-9ae1956aa958";

describe("signed webhook envelopes", () => {
  it("signs exact body, timestamp, and delivery id", () => {
    const headers = signedWebhookHeaders({ body, timestamp, deliveryId, secret });
    expect(headers["X-RuleWallet-Signature"]).toBe(createWebhookSignature({ body, timestamp, deliveryId, secret }));
    expect(verifyWebhookSignature({ body, timestamp, deliveryId, secret, signature: headers["X-RuleWallet-Signature"], nowSeconds: Number(timestamp) })).toBe(true);
  });

  it("rejects changed bodies, delivery ids, signatures, and expired deliveries", () => {
    const signature = createWebhookSignature({ body, timestamp, deliveryId, secret });
    expect(verifyWebhookSignature({ body: `${body} `, timestamp, deliveryId, secret, signature, nowSeconds: Number(timestamp) })).toBe(false);
    expect(verifyWebhookSignature({ body, timestamp, deliveryId: crypto.randomUUID(), secret, signature, nowSeconds: Number(timestamp) })).toBe(false);
    expect(verifyWebhookSignature({ body, timestamp, deliveryId, secret, signature: `${signature.slice(0, -1)}0`, nowSeconds: Number(timestamp) })).toBe(false);
    expect(verifyWebhookSignature({ body, timestamp, deliveryId, secret, signature, nowSeconds: Number(timestamp) + 301 })).toBe(false);
  });

  it("requires an exact 32-byte hex signing secret", () => {
    expect(webhookSigningSecretConfigured(secret)).toBe(true);
    expect(webhookSigningSecretConfigured("not-a-key")).toBe(false);
  });
});
