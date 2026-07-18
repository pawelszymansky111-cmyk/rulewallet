import { describe, expect, it } from "vitest";
import {
  buildMainnetFactoryDeployment,
  RULEWALLET_FACTORY_INIT_CODE_HASH,
} from "./mainnet-factory-deployment";

const DEPLOYER = "0xEd7A64Ff77da059fcE68E7704D97276fcF853570";

describe("mainnet factory deployment plan", () => {
  it("matches the independently simulated nonce-zero deployment", () => {
    const plan = buildMainnetFactoryDeployment(DEPLOYER, BigInt(0));

    expect(plan.chainId).toBe(4663);
    expect(plan.value).toBe(BigInt(0));
    expect(plan.to).toBeUndefined();
    expect(plan.dataHash).toBe(RULEWALLET_FACTORY_INIT_CODE_HASH);
    expect(plan.predictedAddress).toBe("0xdDfEAE34FA9cDd665BD833Ecd5c8C06A4279BD25");
    expect(plan.canonicalStablecoin).toBe("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168");
  });

  it("changes the predicted address when the deployment nonce changes", () => {
    const first = buildMainnetFactoryDeployment(DEPLOYER, BigInt(0));
    const second = buildMainnetFactoryDeployment(DEPLOYER, BigInt(1));

    expect(second.predictedAddress).not.toBe(first.predictedAddress);
    expect(second.dataHash).toBe(first.dataHash);
  });
});
