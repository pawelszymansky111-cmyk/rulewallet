import "server-only";

import { randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "viem";
import { claimCommerceChallenge, saveCommerceChallenge } from "./commerce-store";
import {
  commerceSessionLifetimeSeconds,
  verifyCommerceSessionToken,
} from "./commerce-session-token";

export { commerceSessionConfigured, createCommerceSessionToken, verifyCommerceSessionToken } from "./commerce-session-token";

export const commerceSessionCookie = "rulewallet-commerce-session";
const challengeLifetimeSeconds = 5 * 60;
export function readCommerceSession(request: NextRequest, expectedAddress?: string) {
  const session = verifyCommerceSessionToken(request.cookies.get(commerceSessionCookie)?.value);
  if (!session) throw new Error("Sign with the owner wallet to unlock this private commerce session.");
  if (expectedAddress && getAddress(expectedAddress) !== session.address) {
    throw new Error("The commerce session belongs to a different owner wallet.");
  }
  return session;
}

export function setCommerceSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(commerceSessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: commerceSessionLifetimeSeconds,
  });
}

export function clearCommerceSessionCookie(response: NextResponse) {
  response.cookies.set(commerceSessionCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function createCommerceChallenge(address: string, origin: string, now = new Date()) {
  if (!isAddress(address)) throw new Error("Enter a valid wallet address.");
  const normalized = getAddress(address);
  const expiresAt = new Date(now.getTime() + challengeLifetimeSeconds * 1000);
  const message = [
    "RuleWallet Commerce login",
    "",
    `Owner: ${normalized}`,
    `Origin: ${origin}`,
    `Nonce: ${randomBytes(16).toString("hex")}`,
    `Issued at: ${now.toISOString()}`,
    `Expires at: ${expiresAt.toISOString()}`,
    "",
    "This signature unlocks private quotes, orders, and approvals. It cannot move funds.",
  ].join("\n");
  await saveCommerceChallenge(normalized, message, challengeLifetimeSeconds);
  return { address: normalized, message, expiresAt: expiresAt.toISOString() };
}

export async function verifyCommerceChallenge(input: { address: string; message: string; signature: `0x${string}` }) {
  if (!isAddress(input.address)) throw new Error("Enter a valid wallet address.");
  const address = getAddress(input.address);
  const valid = await verifyMessage({ address, message: input.message, signature: input.signature });
  if (!valid) throw new Error("The login signature does not match the owner wallet.");
  const claimed = await claimCommerceChallenge(address, input.message);
  if (!claimed) throw new Error("The login challenge is missing, expired, or already used.");
  return address;
}
