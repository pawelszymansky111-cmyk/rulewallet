import { describe, expect, it } from "vitest";
import { getAddress, keccak256 } from "viem";
import {
  buildExpectedAccountDeployerV3Runtime,
  buildExpectedFactoryV3Runtime,
  v3HelperAddresses,
} from "./v3-factory";

const factory = getAddress("0x5FbDB2315678afecb367f032d93F642f64180aa3");
const stablecoin = getAddress("0x0000000000000000000000000000000000001234");

describe("V3 factory provenance", () => {
  it("derives both constructor-created helper addresses", () => {
    expect(v3HelperAddresses(factory)).toEqual({
      registryDeployer: getAddress("0xa16E02E87b7454126E5E10d957A927a7F5B5d2be"),
      accountDeployer: getAddress("0xB7A5bd0345EF1Cc5E66bf61BdeC17D2461fBd968"),
    });
  });

  it("pins factory runtime to address, chain, stablecoin, and helper provenance", () => {
    const local = buildExpectedFactoryV3Runtime({ factory, chainId: 31337, canonicalStablecoin: stablecoin });
    const otherChain = buildExpectedFactoryV3Runtime({ factory, chainId: 46630, canonicalStablecoin: stablecoin });
    expect(local.runtimeHash).toBe(keccak256(local.runtime));
    expect(local.runtimeHash).not.toBe(otherChain.runtimeHash);
    const normalizedRuntime = local.runtime.toLowerCase();
    expect(normalizedRuntime).toContain(stablecoin.slice(2).toLowerCase());
    expect(normalizedRuntime).toContain(local.accountDeployer.slice(2).toLowerCase());
    expect(normalizedRuntime).toContain(local.registryDeployer.slice(2).toLowerCase());
  });

  it("pins the account deployer to the exact factory", () => {
    const first = buildExpectedAccountDeployerV3Runtime(factory);
    const second = buildExpectedAccountDeployerV3Runtime(
      getAddress("0x0000000000000000000000000000000000000001"),
    );
    expect(first.runtimeHash).not.toBe(second.runtimeHash);
  });
});
