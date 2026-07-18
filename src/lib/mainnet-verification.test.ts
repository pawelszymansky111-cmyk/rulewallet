import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";
import { ROBINHOOD_MAINNET_USDG, RULEWALLET_V2_VERSION } from "./mainnet-registry";
import { verifyPinnedMainnetFactory } from "./mainnet-verification";

const factory = "0x0000000000000000000000000000000000000001" as const;

describe("factory provenance verification", () => {
  it("rejects a spoof factory even when every getter returns the expected value", async () => {
    const client = {
      getCode: async () => "0x60006000",
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "deploymentChainId") return BigInt(4663);
        if (functionName === "canonicalStablecoin") return ROBINHOOD_MAINNET_USDG;
        if (functionName === "VERSION") return RULEWALLET_V2_VERSION;
        throw new Error("unexpected getter");
      },
    } as unknown as PublicClient;

    const result = await verifyPinnedMainnetFactory(client, factory);
    expect(result.verified).toBe(false);
    expect(result.chainId).toBe(BigInt(4663));
    expect(result.version).toBe(RULEWALLET_V2_VERSION);
  });
});
