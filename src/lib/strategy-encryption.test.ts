import { describe, expect, it } from "vitest";
import type { Hex } from "viem";
import {
  decryptStrategySignature,
  encryptStrategySignature,
  strategyEncryptionKeyConfigured,
} from "./strategy-encryption";

const key = "11".repeat(32);
const otherKey = "22".repeat(32);
const signature = `0x${"ab".repeat(65)}` as Hex;

describe("strategy signature encryption", () => {
  it("round-trips an EIP-712 signature with authenticated associated data", () => {
    const encrypted = encryptStrategySignature(signature, "strategy:one", key);
    expect(encrypted.ciphertext).not.toContain(signature.slice(2));
    expect(decryptStrategySignature(encrypted, "strategy:one", key)).toBe(signature);
  });

  it("fails closed for a wrong key, changed strategy id, or tampered ciphertext", () => {
    const encrypted = encryptStrategySignature(signature, "strategy:one", key);
    expect(() => decryptStrategySignature(encrypted, "strategy:one", otherKey)).toThrow("authentication failed");
    expect(() => decryptStrategySignature(encrypted, "strategy:two", key)).toThrow("authentication failed");
    expect(() => decryptStrategySignature({ ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }, "strategy:one", key)).toThrow("authentication failed");
  });

  it("accepts only exact 32-byte hex keys", () => {
    expect(strategyEncryptionKeyConfigured(key)).toBe(true);
    expect(strategyEncryptionKeyConfigured("short")).toBe(false);
  });
});
