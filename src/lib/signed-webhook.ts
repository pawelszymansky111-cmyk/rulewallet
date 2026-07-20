import { createHmac, timingSafeEqual } from "node:crypto";

export function webhookSigningSecretConfigured(value: string | undefined) {
  return Boolean(value && /^[a-fA-F0-9]{64}$/.test(value));
}

function signaturePayload(timestamp: string, deliveryId: string, body: string) {
  return `${timestamp}.${deliveryId}.${body}`;
}

export function createWebhookSignature(input: {
  timestamp: string;
  deliveryId: string;
  body: string;
  secret: string;
}) {
  if (!webhookSigningSecretConfigured(input.secret)) {
    throw new Error("Webhook signing secret must be a 32-byte hex key.");
  }
  return `v1=${createHmac("sha256", Buffer.from(input.secret, "hex"))
    .update(signaturePayload(input.timestamp, input.deliveryId, input.body), "utf8")
    .digest("hex")}`;
}

export function verifyWebhookSignature(input: {
  timestamp: string;
  deliveryId: string;
  body: string;
  signature: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}) {
  const timestamp = Number(input.timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSeconds ?? 300;
  if (!Number.isInteger(timestamp) || Math.abs(now - timestamp) > tolerance) return false;
  if (!/^[0-9a-fA-F-]{16,64}$/.test(input.deliveryId)) return false;
  let expected: string;
  try {
    expected = createWebhookSignature(input);
  } catch {
    return false;
  }
  const supplied = Buffer.from(input.signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return supplied.length === wanted.length && timingSafeEqual(supplied, wanted);
}

export function signedWebhookHeaders(input: {
  body: string;
  deliveryId: string;
  secret: string;
  timestamp?: string;
}) {
  const timestamp = input.timestamp ?? String(Math.floor(Date.now() / 1000));
  return {
    "X-RuleWallet-Timestamp": timestamp,
    "X-RuleWallet-Delivery-Id": input.deliveryId,
    "X-RuleWallet-Signature": createWebhookSignature({ ...input, timestamp }),
  };
}
