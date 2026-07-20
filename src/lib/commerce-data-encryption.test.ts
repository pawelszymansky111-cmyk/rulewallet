import { describe, expect, it } from "vitest";
import {
  commerceDataEncryptionConfigured,
  decryptCommerceRecord,
  encryptCommerceRecord,
  isEncryptedCommerceRecord,
} from "./commerce-data-encryption";

const key = "33".repeat(32);
const otherKey = "44".repeat(32);
const order = {
  id: "order-1",
  owner: "0x0000000000000000000000000000000000000001",
  summary: "Private travel purchase",
};

describe("commerce data encryption", () => {
  it("round-trips a record with authenticated key-bound associated data", () => {
    const encrypted = encryptCommerceRecord(order, "rulewallet:commerce:order:order-1", key);
    expect(isEncryptedCommerceRecord(encrypted)).toBe(true);
    expect(encrypted.ciphertext).not.toContain(order.summary);
    expect(decryptCommerceRecord(encrypted, "rulewallet:commerce:order:order-1", key)).toEqual(order);
  });

  it("fails closed for plaintext, a wrong key, another Redis key, or tampering", () => {
    const encrypted = encryptCommerceRecord(order, "rulewallet:commerce:order:order-1", key);
    expect(() => decryptCommerceRecord(order, "rulewallet:commerce:order:order-1", key)).toThrow(/not encrypted/);
    expect(() => decryptCommerceRecord(encrypted, "rulewallet:commerce:order:order-1", otherKey)).toThrow(/authentication failed/);
    expect(() => decryptCommerceRecord(encrypted, "rulewallet:commerce:order:order-2", key)).toThrow(/authentication failed/);
    expect(() => decryptCommerceRecord({ ...encrypted, tag: `${encrypted.tag.slice(0, -2)}AA` }, "rulewallet:commerce:order:order-1", key)).toThrow(/authentication failed/);
  });

  it("accepts only exact 32-byte hex keys", () => {
    expect(commerceDataEncryptionConfigured(key)).toBe(true);
    expect(commerceDataEncryptionConfigured("short")).toBe(false);
  });
});
