import { getAddress, isAddress, type Address, type Hex } from "viem";

export type ExpectedMainnetIntent = {
  signerAddress: Address;
  to: Address;
  data: Hex;
  nonce: number;
};

export type ObservedMainnetTransaction = {
  from: Address;
  to: Address | null;
  input: Hex;
  value: bigint;
  nonce: number;
};

export function transactionMatchesMainnetIntent(
  expected: ExpectedMainnetIntent,
  observed: ObservedMainnetTransaction,
) {
  if (!isAddress(observed.from) || !observed.to || !isAddress(observed.to)) return false;
  return getAddress(observed.from) === getAddress(expected.signerAddress)
    && getAddress(observed.to) === getAddress(expected.to)
    && observed.input.toLowerCase() === expected.data.toLowerCase()
    && observed.value === BigInt(0)
    && observed.nonce === expected.nonce;
}

export function isConfirmationTimeout(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /timed? out|timeout/i.test(message);
}

export function confirmedExecutionStatus(replacementReason?: string) {
  return replacementReason ? "replaced" as const : "confirmed" as const;
}

export function reconciledExecutionStatus(receiptStatus: "success" | "reverted") {
  return receiptStatus === "success" ? "late_confirmed" as const : "failed" as const;
}
