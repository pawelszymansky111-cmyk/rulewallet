import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCommerceSessionToken, verifyCommerceSessionToken } from "./commerce-session-token";

const owner = "0x00000000000000000000000000000000000000A1";

describe("commerce session tokens", () => {
  beforeEach(() => {
    process.env.COMMERCE_SESSION_SECRET = "ab".repeat(32);
  });

  afterEach(() => {
    delete process.env.COMMERCE_SESSION_SECRET;
  });

  it("authenticates the exact owner during the short session window", () => {
    const token = createCommerceSessionToken(owner, 1_000);
    expect(verifyCommerceSessionToken(token, 1_100)?.address).toBe("0x00000000000000000000000000000000000000A1");
  });

  it("rejects tampering and expiration", () => {
    const token = createCommerceSessionToken(owner, 1_000);
    expect(verifyCommerceSessionToken(`${token.slice(0, -1)}x`, 1_100)).toBeUndefined();
    expect(verifyCommerceSessionToken(token, 2_801)).toBeUndefined();
  });

  it("requires a dedicated 32-byte secret", () => {
    process.env.COMMERCE_SESSION_SECRET = "short";
    expect(() => createCommerceSessionToken(owner, 1_000)).toThrow(/32-byte/);
  });
});
