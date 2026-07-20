import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getAddress, isAddress } from "viem";

export const commerceSessionLifetimeSeconds = 30 * 60;

type SessionPayload = {
  address: string;
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
};

export function commerceSessionConfigured() {
  return Boolean(process.env.COMMERCE_SESSION_SECRET && /^[a-fA-F0-9]{64}$/.test(process.env.COMMERCE_SESSION_SECRET));
}

function sessionSecret() {
  const value = process.env.COMMERCE_SESSION_SECRET;
  if (!commerceSessionConfigured() || !value) {
    throw new Error("Commerce sessions require a server-only 32-byte COMMERCE_SESSION_SECRET.");
  }
  return Buffer.from(value, "hex");
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signatureFor(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createCommerceSessionToken(address: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!isAddress(address)) throw new Error("Enter a valid wallet address.");
  const payload = encodePayload({
    address: getAddress(address),
    issuedAt: nowSeconds,
    expiresAt: nowSeconds + commerceSessionLifetimeSeconds,
    sessionId: randomBytes(16).toString("hex"),
  });
  return `${payload}.${signatureFor(payload)}`;
}

export function verifyCommerceSessionToken(token: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!token || !commerceSessionConfigured()) return undefined;
  const [payloadText, suppliedSignature, extra] = token.split(".");
  if (!payloadText || !suppliedSignature || extra) return undefined;
  const expected = Buffer.from(signatureFor(payloadText), "utf8");
  const supplied = Buffer.from(suppliedSignature, "utf8");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(payloadText, "base64url").toString("utf8")) as SessionPayload;
    if (!isAddress(payload.address) || !Number.isSafeInteger(payload.issuedAt) || !Number.isSafeInteger(payload.expiresAt) || !/^[a-f0-9]{32}$/.test(payload.sessionId)) {
      return undefined;
    }
    if (payload.issuedAt > nowSeconds + 30 || payload.expiresAt <= nowSeconds || payload.expiresAt - payload.issuedAt !== commerceSessionLifetimeSeconds) {
      return undefined;
    }
    return { ...payload, address: getAddress(payload.address) };
  } catch {
    return undefined;
  }
}
