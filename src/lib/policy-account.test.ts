import { describe, expect, it } from "vitest";
import {
  addressBookStorageKey,
  parseAddressBook,
  parseStoredAddress,
  policyAccountStorageKey,
  upsertAddressBookEntry,
  type AddressBookEntry,
} from "./policy-account";

const owner = "0x0000000000000000000000000000000000000001";
const policy = "0x0000000000000000000000000000000000000002";

describe("policy account storage", () => {
  it("scopes selections and contacts by owner, chain, and policy account", () => {
    expect(policyAccountStorageKey(owner, 46630)).toContain(`46630:${owner}`);
    expect(addressBookStorageKey(owner, policy, 46630)).toContain(
      `46630:${owner}:${policy}`,
    );
  });

  it("rejects malformed stored addresses", () => {
    expect(parseStoredAddress("not-an-address")).toBeUndefined();
    expect(parseStoredAddress(owner)).toBe(owner);
  });

  it("filters malformed address book records", () => {
    const parsed = parseAddressBook(
      JSON.stringify([
        {
          address: owner,
          label: " Treasury ",
          kind: "wallet",
          createdAt: "2026-07-18T00:00:00.000Z",
        },
        { address: "bad", label: "Bad", kind: "wallet", createdAt: "now" },
      ]),
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].label).toBe("Treasury");
  });

  it("upserts addresses case-insensitively", () => {
    const first: AddressBookEntry = {
      address: owner,
      label: "Old",
      kind: "wallet",
      createdAt: "2026-07-18T00:00:00.000Z",
    };
    const next = { ...first, label: "New" };
    expect(upsertAddressBookEntry([first], next)).toEqual([next]);
  });
});
