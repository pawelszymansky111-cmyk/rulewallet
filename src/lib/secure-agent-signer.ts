import "server-only";
import {
  getAddress,
  isAddress,
  isHash,
  toFunctionSelector,
  type Address,
  type Hash,
  type Hex,
} from "viem";
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

export type MainnetSignerIdentity = {
  signerAddress: Address;
  keyId: string;
  attestationSha256: string;
  chainId: 4663;
  nonExportable: true;
  allowedSelectors: Hex[];
  zeroValueOnly: true;
};

export const EXECUTE_SIGNED_STRATEGY_SELECTOR = toFunctionSelector(
  "executeSignedStrategy((uint256,address,address,address,uint128,uint8,bytes32,uint64,uint64,uint32,uint32),bytes,uint64)",
);

/// Adapter boundary for a non-exportable KMS, MPC, or HSM-backed agent key.
/// Implementations submit an exact transaction intent; no private key is accepted or returned.
export interface SecureAgentSigner {
  readonly kind: "external-kms";
  readonly address: Address;
  verifyIdentity(): Promise<MainnetSignerIdentity>;
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
    private readonly expectedKeyId: string,
    private readonly expectedAttestation: string,
  ) {}

  private headers(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.credential}`,
      ...extra,
    };
  }

  async verifyIdentity(): Promise<MainnetSignerIdentity> {
    const response = await fetch(this.endpoint, {
      method: "GET",
      headers: this.headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await response.json()) as Partial<MainnetSignerIdentity> & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Secure signer identity request failed.");
    if (!result.signerAddress || !isAddress(result.signerAddress)) throw new Error("Secure signer identity returned an invalid address.");
    if (getAddress(result.signerAddress) !== this.address) throw new Error("Secure signer identity address mismatch.");
    if (result.keyId !== this.expectedKeyId) throw new Error("Secure signer key identity mismatch.");
    if (result.attestationSha256?.toLowerCase() !== this.expectedAttestation) throw new Error("Secure signer attestation mismatch.");
    if (result.chainId !== 4663 || result.nonExportable !== true || result.zeroValueOnly !== true) {
      throw new Error("Secure signer policy does not enforce chain 4663, non-exportability, and zero-value execution.");
    }
    if (!Array.isArray(result.allowedSelectors)
      || !result.allowedSelectors.some((selector) => selector.toLowerCase() === EXECUTE_SIGNED_STRATEGY_SELECTOR.toLowerCase())) {
      throw new Error("Secure signer policy does not allow only the expected strategy selector.");
    }
    return {
      signerAddress: this.address,
      keyId: this.expectedKeyId,
      attestationSha256: this.expectedAttestation,
      chainId: 4663,
      nonExportable: true,
      allowedSelectors: result.allowedSelectors as Hex[],
      zeroValueOnly: true,
    };
  }

  async submitTransaction(intent: MainnetTransactionIntent): Promise<MainnetSignerReceipt> {
    if (intent.chainId !== 4663) throw new Error("Secure signer rejected a non-mainnet chain ID.");
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        ...this.headers(),
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
    verification.keyId,
    verification.attestation,
  );
}

export async function verifyMainnetSignerIdentity() {
  const signer = getMainnetAgentSigner();
  return signer.verifyIdentity();
}
