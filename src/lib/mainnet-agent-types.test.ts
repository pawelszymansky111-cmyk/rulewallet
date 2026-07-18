import { describe, expect, it } from "vitest";
import { getAddress, zeroAddress } from "viem";
import {
  createMainnetStrategySchema,
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
  });

  it("accepts only native ETH or canonical USDG", () => {
    expect(strategyTypedData(input(ROBINHOOD_MAINNET_USDG)).message.asset).toBe(ROBINHOOD_MAINNET_USDG);
    expect(() => strategyTypedData(input(owner))).toThrow(/Only native ETH and canonical/);
  });

  it("rejects intervals shorter than five minutes", () => {
    expect(() => createMainnetStrategySchema.parse({ ...input(), intervalSeconds: 299 })).toThrow();
  });
});
