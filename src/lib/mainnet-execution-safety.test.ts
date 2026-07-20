import { describe, expect, it } from "vitest";
import {
  confirmedExecutionStatus,
  isConfirmationTimeout,
  reconciledExecutionStatus,
  transactionMatchesMainnetIntent,
} from "./mainnet-execution-safety";

const expected = {
  signerAddress: "0x0000000000000000000000000000000000000001" as const,
  to: "0x0000000000000000000000000000000000000002" as const,
  data: "0x12345678" as const,
  nonce: 7,
};

const observed = {
  from: expected.signerAddress,
  to: expected.to,
  input: expected.data,
  value: BigInt(0),
  nonce: expected.nonce,
};

describe("mainnet execution confirmation safety", () => {
  it("accepts only the exact signer, account, calldata, zero value, and nonce", () => {
    expect(transactionMatchesMainnetIntent(expected, observed)).toBe(true);
    expect(transactionMatchesMainnetIntent(expected, { ...observed, from: "0x0000000000000000000000000000000000000003" })).toBe(false);
    expect(transactionMatchesMainnetIntent(expected, { ...observed, to: "0x0000000000000000000000000000000000000003" })).toBe(false);
    expect(transactionMatchesMainnetIntent(expected, { ...observed, input: "0x12345679" })).toBe(false);
    expect(transactionMatchesMainnetIntent(expected, { ...observed, value: BigInt(1) })).toBe(false);
    expect(transactionMatchesMainnetIntent(expected, { ...observed, nonce: 8 })).toBe(false);
  });

  it("reserves timed-out confirmations for reconciliation instead of blind retry", () => {
    expect(isConfirmationTimeout(new Error("Transaction confirmation timed out"))).toBe(true);
    expect(isConfirmationTimeout(new Error("timeout awaiting receipt"))).toBe(true);
    expect(isConfirmationTimeout(new Error("RPC rejected calldata"))).toBe(false);
  });

  it("distinguishes replacements and late reverted transactions", () => {
    expect(confirmedExecutionStatus()).toBe("confirmed");
    expect(confirmedExecutionStatus("repriced")).toBe("replaced");
    expect(reconciledExecutionStatus("success")).toBe("late_confirmed");
    expect(reconciledExecutionStatus("reverted")).toBe("failed");
  });
});
