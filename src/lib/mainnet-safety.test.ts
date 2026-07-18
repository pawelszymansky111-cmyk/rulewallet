import { describe, expect, it } from "vitest";
import {
  MAINNET_AUTONOMY_RELEASE_ENABLED,
  assertRpcAgreement,
  assertWithinMainnetFeeCeilings,
  mainnetProductionGates,
  validateSecureSignerConfiguration,
} from "./mainnet-safety";

const signerEnvironment = {
  MAINNET_SIGNER_MODE: "external-kms",
  MAINNET_AGENT_ADDRESS: "0x0000000000000000000000000000000000000001",
  MAINNET_SIGNER_ENDPOINT: "https://signer.example.com/v1/sign",
  MAINNET_SIGNER_ALLOWED_HOST: "signer.example.com",
  MAINNET_SIGNER_KEY_ID: "kms-key-production",
  MAINNET_SIGNER_ATTESTATION_SHA256: `sha256:${"a".repeat(64)}`,
  MAINNET_SIGNER_AUTH_TOKEN: "runtime-credential",
};

describe("mainnet production safety gates", () => {
  it("cannot enable autonomy through environment configuration", () => {
    expect(MAINNET_AUTONOMY_RELEASE_ENABLED).toBe(false);
    const release = mainnetProductionGates({ ...signerEnvironment, ENABLE_MAINNET_AUTONOMY: "true" }).find((gate) => gate.id === "release");
    expect(release?.ready).toBe(false);
  });

  it("requires HTTPS and an exact signer host identity", () => {
    expect(validateSecureSignerConfiguration(signerEnvironment).verified).toBe(true);
    expect(validateSecureSignerConfiguration({ ...signerEnvironment, MAINNET_SIGNER_ENDPOINT: "http://signer.example.com/v1/sign" }).verified).toBe(false);
    expect(validateSecureSignerConfiguration({ ...signerEnvironment, MAINNET_SIGNER_ENDPOINT: "https://evil.example/v1/sign" }).verified).toBe(false);
    expect(validateSecureSignerConfiguration({ ...signerEnvironment, MAINNET_SIGNER_ATTESTATION_SHA256: "fake" }).verified).toBe(false);
  });

  it("blocks RPC disagreement", () => {
    const observation = { chainId: 4663, nonce: 7, codeHash: `0x${"1".repeat(64)}` };
    expect(assertRpcAgreement([observation, observation])).toEqual(observation);
    expect(() => assertRpcAgreement([observation, { ...observation, nonce: 8 }])).toThrow(/disagree/);
    expect(() => assertRpcAgreement([observation])).toThrow(/two independent/);
  });

  it("enforces strict gas and fee ceilings", () => {
    const environment = {
      MAINNET_MAX_GAS: "300000",
      MAINNET_MAX_FEE_PER_GAS_WEI: "1000000000",
      MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI: "100000000",
    };
    expect(() => assertWithinMainnetFeeCeilings({ gas: BigInt(200000), maxFeePerGas: BigInt(900000000), maxPriorityFeePerGas: BigInt(90000000) }, environment)).not.toThrow();
    expect(() => assertWithinMainnetFeeCeilings({ gas: BigInt(300001), maxFeePerGas: BigInt(1), maxPriorityFeePerGas: BigInt(1) }, environment)).toThrow(/gas/);
    expect(() => assertWithinMainnetFeeCeilings({ gas: BigInt(1), maxFeePerGas: BigInt(1000000001), maxPriorityFeePerGas: BigInt(1) }, environment)).toThrow(/max fee/);
  });
});
