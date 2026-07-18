import { getAddress, isAddress, type Address } from "viem";

// This release is a manual-actions-only preview. Environment variables cannot
// override this compile-time safety gate.
export const MAINNET_AUTONOMY_RELEASE_ENABLED = false as const;

export type ProductionGate = {
  id: "release" | "signer" | "nonce" | "rpc" | "monitoring" | "fees";
  ready: boolean;
  message: string;
};

type Environment = Record<string, string | undefined>;

export function validateSecureSignerConfiguration(environment: Environment = process.env) {
  const address = environment.MAINNET_AGENT_ADDRESS;
  const endpoint = environment.MAINNET_SIGNER_ENDPOINT;
  const keyId = environment.MAINNET_SIGNER_KEY_ID;
  const expectedHost = environment.MAINNET_SIGNER_ALLOWED_HOST;
  const attestation = environment.MAINNET_SIGNER_ATTESTATION_SHA256;

  if (environment.MAINNET_SIGNER_MODE !== "external-kms") {
    return { verified: false, reason: "A production KMS/MPC/HSM signer is not configured." } as const;
  }
  if (!address || !isAddress(address)) {
    return { verified: false, reason: "The production signer address is missing or invalid." } as const;
  }
  if (!endpoint || !keyId || !expectedHost || !attestation || !environment.MAINNET_SIGNER_AUTH_TOKEN) {
    return { verified: false, reason: "Signer endpoint, identity, attestation, host allowlist, or runtime credential is incomplete." } as const;
  }
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    return { verified: false, reason: "The production signer endpoint is invalid." } as const;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== expectedHost || parsed.username || parsed.password) {
    return { verified: false, reason: "The signer must use HTTPS and exactly match MAINNET_SIGNER_ALLOWED_HOST." } as const;
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(attestation)) {
    return { verified: false, reason: "The signer identity attestation is missing or malformed." } as const;
  }
  return {
    verified: true,
    address: getAddress(address) as Address,
    endpoint: parsed.toString(),
    keyId,
    attestation: attestation.toLowerCase(),
  } as const;
}

export function mainnetProductionGates(environment: Environment = process.env): ProductionGate[] {
  const signer = validateSecureSignerConfiguration(environment);
  const rpcReady = Boolean(environment.RH_MAINNET_RPC_URL && environment.RH_MAINNET_RPC_FALLBACK_URL);
  const feeReady = Boolean(environment.MAINNET_MAX_GAS && environment.MAINNET_MAX_FEE_PER_GAS_WEI && environment.MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI);
  return [
    { id: "release", ready: MAINNET_AUTONOMY_RELEASE_ENABLED, message: "Autonomous execution is compile-time disabled in this release." },
    { id: "signer", ready: signer.verified, message: signer.verified ? `Verified non-exportable signer identity ${signer.keyId}.` : signer.reason },
    { id: "nonce", ready: false, message: "Signer-global durable nonce locking is implemented but not production-certified." },
    { id: "rpc", ready: rpcReady, message: rpcReady ? "Two managed RPC endpoints are configured; agreement is required before signing." : "Two independent managed HTTPS RPC endpoints are required." },
    { id: "monitoring", ready: Boolean(environment.MAINNET_ALERT_WEBHOOK_URL && environment.MAINNET_ALERT_WEBHOOK_TOKEN), message: "Production alert delivery and escalation must be verified." },
    { id: "fees", ready: feeReady, message: feeReady ? "Strict gas and fee ceilings are configured." : "Strict gas and fee ceilings are not configured." },
  ];
}

export function assertWithinMainnetFeeCeilings(input: {
  gas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}, environment: Environment = process.env) {
  const maxGas = BigInt(environment.MAINNET_MAX_GAS ?? "0");
  const maxFee = BigInt(environment.MAINNET_MAX_FEE_PER_GAS_WEI ?? "0");
  const maxPriority = BigInt(environment.MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI ?? "0");
  if (maxGas <= BigInt(0) || maxFee <= BigInt(0) || maxPriority <= BigInt(0)) throw new Error("Mainnet gas and fee ceilings are not configured.");
  if (input.gas > maxGas) throw new Error("Estimated gas exceeds MAINNET_MAX_GAS.");
  if (input.maxFeePerGas > maxFee) throw new Error("Estimated max fee exceeds MAINNET_MAX_FEE_PER_GAS_WEI.");
  if (input.maxPriorityFeePerGas > maxPriority) throw new Error("Estimated priority fee exceeds MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI.");
}

export function assertRpcAgreement(observations: Array<{ chainId: number; nonce: number; codeHash: string }>) {
  if (observations.length < 2) throw new Error("At least two independent RPC observations are required.");
  const expected = observations[0];
  if (observations.some((value) => value.chainId !== expected.chainId || value.nonce !== expected.nonce || value.codeHash.toLowerCase() !== expected.codeHash.toLowerCase())) {
    throw new Error("Independent RPC endpoints disagree; signing is blocked.");
  }
  return expected;
}
