import { describe, expect, it } from "vitest";
import { getAddress, zeroAddress } from "viem";
import {
  buildMainnetAdminMessage,
  createMainnetStrategySchema,
  mainnetAdminActionSchema,
  strategyTypedData,
} from "./mainnet-agent-types";
import { ROBINHOOD_MAINNET_USDG } from "./mainnet-registry";

const owner = getAddress("0x1111111111111111111111111111111111111111");
const account = getAddress("0x2222222222222222222222222222222222222222");
const recipient = getAddress("0x3333333333333333333333333333333333333333");

function input(asset: string = zeroAddress) {
  return createMainnetStrategySchema.parse({
    name: "Daily bounded transfer",
    owner,
    account,
    asset,
    recipient,
    amount: "1000000000000000",
    category: 3,
    intentHash: `0x${"44".repeat(32)}`,
    nonce: "7",
    expiry: "2000000000",
    intervalSeconds: 86400,
    maxExecutions: 30,
    signature: `0x${"11".repeat(65)}`,
  });
}

describe("mainnet signed strategy", () => {
  it("binds chain and verifying account in EIP-712 data", () => {
    const typed = strategyTypedData(input());
    expect(typed.domain.chainId).toBe(4663);
    expect(typed.domain.verifyingContract).toBe(account);
    expect(typed.message.chainId).toBe(BigInt(4663));
    expect(typed.message.amount).toBe(BigInt("1000000000000000"));
    expect(typed.message.category).toBe(3);
    expect(typed.message.intentHash).toBe(`0x${"44".repeat(32)}`);
  });

  it("accepts only native ETH or canonical USDG", () => {
    expect(strategyTypedData(input(ROBINHOOD_MAINNET_USDG)).message.asset).toBe(ROBINHOOD_MAINNET_USDG);
    expect(() => strategyTypedData(input(owner))).toThrow(/Only native ETH and canonical/);
  });

  it("rejects intervals shorter than five minutes", () => {
    expect(() => createMainnetStrategySchema.parse({ ...input(), intervalSeconds: 299 })).toThrow();
  });

  it("binds scheduler mutations to chain, account, strategy, nonce, and expiry", () => {
    const action = mainnetAdminActionSchema.parse({
      action: "set-strategy-active",
      strategyId: "11111111-1111-4111-8111-111111111111",
      account,
      active: false,
      nonce: "22222222-2222-4222-8222-222222222222",
      expiresAt: 2_000_000_000_000,
    });
    const message = buildMainnetAdminMessage(action);
    expect(message).toContain("Chain ID: 4663");
    expect(message).toContain(`Policy account: ${account}`);
    expect(message).toContain("Active: false");
    expect(message).toContain(action.nonce);
  });
});
