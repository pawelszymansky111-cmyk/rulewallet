import { describe, expect, it } from "vitest";
import {
  canonicalMainnetAssets,
  buildMainnetAssetPolicyArgs,
  formatMainnetAssetUnits,
  parseMainnetAssetUnits,
} from "./mainnet-registry";

describe("Robinhood Chain canonical asset units", () => {
  it("uses 18 decimals for ETH and 6 for canonical USDG", () => {
    expect(canonicalMainnetAssets.ETH.decimals).toBe(18);
    expect(canonicalMainnetAssets.USDG.decimals).toBe(6);
    expect(parseMainnetAssetUnits("1", "ETH")).toBe(BigInt("1000000000000000000"));
    expect(parseMainnetAssetUnits("1", "USDG")).toBe(BigInt("1000000"));
  });

  it("round-trips policy and strategy amounts without a 12-order unit error", () => {
    const policy = ["1", "5", "0.5"].map((value) => parseMainnetAssetUnits(value, "USDG"));
    expect(policy).toEqual([BigInt("1000000"), BigInt("5000000"), BigInt("500000")]);
    expect(policy.map((value) => formatMainnetAssetUnits(value, "USDG"))).toEqual(["1", "5", "0.5"]);
  });

  it("constructs the exact USDG policy calldata arguments used by the UI", () => {
    expect(buildMainnetAssetPolicyArgs("USDG", "1", "5", "0.5")).toEqual([
      canonicalMainnetAssets.USDG.address,
      true,
      BigInt("1000000"),
      BigInt("5000000"),
      BigInt("500000"),
    ]);
  });
});
