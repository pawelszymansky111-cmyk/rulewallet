import "server-only";
import { getAddress, isAddress, isHash, type Address, type Hash, type Hex } from "viem";
import { validateSecureSignerConfiguration } from "@/lib/mainnet-safety";

export type MainnetTransactionIntent = {
  chainId: 4663;
  to: Address;
  data: Hex;
  value: string;
  gas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  nonce: number;
  idempotencyKey: string;
  expectedResult: string;
};

export type MainnetSignerReceipt = {
  transactionHash: Hash;
  signerAddress: Address;
  providerRequestId: string;
};

/// Adapter boundary for a non-exportable KMS, MPC, or HSM-backed agent key.
/// Implementations submit an exact transaction intent; no private key is accepted or returned.
export interface SecureAgentSigner {
  readonly kind: "external-kms";
  readonly address: Address;
  submitTransaction(intent: MainnetTransactionIntent): Promise<MainnetSignerReceipt>;
}

export type MainnetSignerStatus = {
  configured: boolean;
  mode: "disabled" | "external-kms" | "invalid";
  address?: Address;
  reason?: string;
};

export function mainnetSignerStatus(): MainnetSignerStatus {
  const mode = process.env.MAINNET_SIGNER_MODE ?? "disabled";
  if (mode === "disabled") {
    return {
      configured: false,
      mode,
      reason: "Autonomous mainnet execution is disabled until a KMS/MPC/HSM signer is configured.",
    };
  }
  if (mode !== "external-kms") {
    return { configured: false, mode: "invalid", reason: "Unsupported secure signer mode." };
  }
  const verification = validateSecureSignerConfiguration();
  if (!verification.verified) return { configured: false, mode: "invalid", reason: verification.reason };
  return {
    configured: true,
    mode,
    address: verification.address,
  };
}

class ExternalKmsAgentSigner implements SecureAgentSigner {
  readonly kind = "external-kms" as const;

  constructor(
    readonly address: Address,
    private readonly endpoint: string,
    private readonly credential: string,
  ) {}

  async submitTransaction(intent: MainnetTransactionIntent): Promise<MainnetSignerReceipt> {
    if (intent.chainId !== 4663) throw new Error("Secure signer rejected a non-mainnet chain ID.");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.credential}`,
        "Content-Type": "application/json",
        "Idempotency-Key": intent.idempotencyKey,
      },
      body: JSON.stringify(intent),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const result = (await response.json()) as Partial<MainnetSignerReceipt> & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Secure signer rejected the transaction intent.");
    if (!result.transactionHash || !isHash(result.transactionHash)) {
      throw new Error("Secure signer returned an invalid transaction hash.");
    }
    if (!result.signerAddress || !isAddress(result.signerAddress)) {
      throw new Error("Secure signer returned an invalid signer address.");
    }
    if (getAddress(result.signerAddress) !== this.address) {
      throw new Error("Secure signer address does not match MAINNET_AGENT_ADDRESS.");
    }
    return {
      transactionHash: result.transactionHash,
      signerAddress: this.address,
      providerRequestId: String(result.providerRequestId ?? "unavailable"),
    };
  }
}

export function getMainnetAgentSigner(): SecureAgentSigner {
  const status = mainnetSignerStatus();
  const verification = validateSecureSignerConfiguration();
  if (!status.configured || !status.address || !verification.verified) {
    throw new Error(status.reason ?? "Secure mainnet signer is not configured.");
  }
  return new ExternalKmsAgentSigner(
    status.address,
    verification.endpoint,
    process.env.MAINNET_SIGNER_AUTH_TOKEN!,
  );
}
