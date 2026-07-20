import { describe, expect, it } from "vitest";
import {
  MAINNET_AUTONOMY_RELEASE_ENABLED,
  assertRpcAgreement,
  assertWithinMainnetFeeCeilings,
  mainnetAutonomyReady,
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
  it("supports autonomy but cannot enable it without every runtime gate", () => {
    expect(MAINNET_AUTONOMY_RELEASE_ENABLED).toBe(true);
    expect(mainnetAutonomyReady({
      ...signerEnvironment,
      ENABLE_MAINNET: "true",
      ENABLE_MAINNET_AUTONOMY: "true",
    })).toBe(false);
  });

  it("enables autonomy only when every configured and live gate passes", () => {
    const environment = {
      ...signerEnvironment,
      ENABLE_MAINNET: "true",
      ENABLE_MAINNET_AUTONOMY: "true",
      RH_MAINNET_RPC_URL: "https://primary-rpc.example/v2/key",
      RH_MAINNET_RPC_FALLBACK_URL: "https://secondary-rpc.example/v2/key",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "redis-token",
      MAINNET_STRATEGY_ENCRYPTION_KEY: "11".repeat(32),
      CRON_SECRET: "cron-secret-at-least-sixteen",
      MAINNET_SCHEDULER_MODE: "external-durable",
      MAINNET_ALERT_WEBHOOK_URL: "https://alerts.example/hook",
      MAINNET_ALERT_WEBHOOK_TOKEN: "alert-token-at-least-sixteen",
      MAINNET_MAX_GAS: "500000",
      MAINNET_MAX_FEE_PER_GAS_WEI: "1000000000",
      MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI: "100000000",
    };
    const runtime = {
      factoryVerified: true,
      canonicalAssetVerified: true,
      signerIdentityVerified: true,
    };
    expect(mainnetProductionGates(environment, runtime).every((gate) => gate.ready)).toBe(true);
    expect(mainnetAutonomyReady(environment, runtime)).toBe(true);
  });

  it("does not treat a secret alone as proof that a production scheduler exists", () => {
    const scheduler = mainnetProductionGates({ CRON_SECRET: "cron-secret-at-least-sixteen" })
      .find((gate) => gate.id === "scheduler");
    expect(scheduler?.ready).toBe(false);
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
