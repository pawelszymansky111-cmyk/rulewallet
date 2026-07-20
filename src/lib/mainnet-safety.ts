import { getAddress, isAddress, type Address } from "viem";

// The codebase supports autonomous mainnet execution, but the live path remains
// fail-closed unless every runtime gate below is verified. The default
// environment keeps ENABLE_MAINNET_AUTONOMY=false.
export const MAINNET_AUTONOMY_RELEASE_ENABLED = true as const;

export type ProductionGate = {
  id:
    | "release"
    | "factory"
    | "asset"
    | "signer"
    | "storage"
    | "scheduler"
    | "nonce"
    | "rpc"
    | "monitoring"
    | "fees";
  ready: boolean;
  message: string;
};

type Environment = Record<string, string | undefined>;

export type MainnetRuntimeVerification = {
  factoryVerified?: boolean;
  canonicalAssetVerified?: boolean;
  signerIdentityVerified?: boolean;
};

function isDistinctHttpsRpcPair(primary?: string, fallback?: string) {
  if (!primary || !fallback || primary === fallback) return false;
  try {
    const first = new URL(primary);
    const second = new URL(fallback);
    return first.protocol === "https:" && second.protocol === "https:" && first.host !== second.host;
  } catch {
    return false;
  }
}

function hasPositiveInteger(value?: string) {
  return Boolean(value && /^\d+$/.test(value) && BigInt(value) > BigInt(0));
}

function isHttpsEndpoint(value?: string) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

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

export function mainnetProductionGates(
  environment: Environment = process.env,
  runtime: MainnetRuntimeVerification = {},
): ProductionGate[] {
  const signer = validateSecureSignerConfiguration(environment);
  const rpcReady = isDistinctHttpsRpcPair(
    environment.RH_MAINNET_RPC_URL,
    environment.RH_MAINNET_RPC_FALLBACK_URL,
  );
  const feeReady = hasPositiveInteger(environment.MAINNET_MAX_GAS)
    && hasPositiveInteger(environment.MAINNET_MAX_FEE_PER_GAS_WEI)
    && hasPositiveInteger(environment.MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI);
  const storageReady = Boolean(
    (environment.UPSTASH_REDIS_REST_URL && environment.UPSTASH_REDIS_REST_TOKEN)
      || (environment.KV_REST_API_URL && environment.KV_REST_API_TOKEN),
  ) && Boolean(environment.MAINNET_STRATEGY_ENCRYPTION_KEY && /^[a-fA-F0-9]{64}$/.test(environment.MAINNET_STRATEGY_ENCRYPTION_KEY));
  const monitoringReady = isHttpsEndpoint(environment.MAINNET_ALERT_WEBHOOK_URL)
    && Boolean(environment.MAINNET_ALERT_WEBHOOK_TOKEN)
    && /^[a-fA-F0-9]{64}$/.test(environment.MAINNET_ALERT_WEBHOOK_SIGNING_SECRET ?? "");
  const schedulerMode = environment.MAINNET_SCHEDULER_MODE;
  const schedulerReady = Boolean(environment.CRON_SECRET)
    && (schedulerMode === "vercel-pro-cron" || schedulerMode === "external-durable");
  const signerReady = signer.verified && runtime.signerIdentityVerified === true;
  return [
    { id: "release", ready: MAINNET_AUTONOMY_RELEASE_ENABLED, message: "This build contains the production-gated autonomous execution path." },
    { id: "factory", ready: runtime.factoryVerified === true, message: runtime.factoryVerified ? "The configured 3.0.0-commerce-beta factory and helper runtimes are pinned and verified." : "Deploy and configure the pinned V3 commerce factory." },
    { id: "asset", ready: runtime.canonicalAssetVerified === true, message: runtime.canonicalAssetVerified ? "Canonical Robinhood Chain USDG reports symbol USDG and 6 decimals." : "Canonical USDG metadata verification has not passed." },
    { id: "signer", ready: signerReady, message: signerReady ? `Remote identity and non-exportable signer attestation verified for ${signer.keyId}.` : signer.verified ? "Signer configuration is valid, but the remote identity attestation handshake has not passed." : signer.reason },
    { id: "storage", ready: storageReady, message: storageReady ? "Durable storage and authenticated encryption for strategy signatures are configured." : "Durable Redis plus a 32-byte MAINNET_STRATEGY_ENCRYPTION_KEY are required." },
    { id: "scheduler", ready: schedulerReady, message: schedulerReady ? `Authenticated ${schedulerMode} mainnet scheduler is explicitly configured.` : "Set CRON_SECRET and MAINNET_SCHEDULER_MODE to vercel-pro-cron or external-durable after the scheduler exists." },
    { id: "nonce", ready: true, message: "Signer-global durable nonce locking and unresolved-transaction reservation are enforced." },
    { id: "rpc", ready: rpcReady, message: rpcReady ? "Two independent managed HTTPS RPC hosts are configured; agreement is required before signing." : "Two distinct managed HTTPS RPC hosts are required." },
    { id: "monitoring", ready: monitoringReady, message: monitoringReady ? "Authenticated, HMAC-signed HTTPS alerts are configured." : "Authenticated HTTPS alert delivery with a 32-byte HMAC signing secret is required." },
    { id: "fees", ready: feeReady, message: feeReady ? "Strict gas and fee ceilings are configured." : "Strict gas and fee ceilings are not configured." },
  ];
}

export function mainnetAutonomyReady(
  environment: Environment = process.env,
  runtime: MainnetRuntimeVerification = {},
) {
  return environment.ENABLE_MAINNET === "true"
    && environment.ENABLE_MAINNET_AUTONOMY === "true"
    && mainnetProductionGates(environment, runtime).every((gate) => gate.ready);
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
