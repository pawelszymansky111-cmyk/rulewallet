import assert from "node:assert/strict";
import test from "node:test";
import { encodeFunctionData, getAddress, parseAbi, zeroAddress } from "viem";
import {
  AmbiguousBroadcastError,
  parseDerSignature,
  validateIntent,
} from "./handler.mjs";

const abi = parseAbi([
  "function executeSignedStrategy((uint256 chainId,address account,address asset,address recipient,uint128 amount,uint8 category,bytes32 intentHash,uint64 nonce,uint64 expiry,uint32 intervalSeconds,uint32 maxExecutions) strategy,bytes ownerSignature,uint64 requestDeadline) returns (uint256 requestId)",
]);
const account = getAddress("0x1111111111111111111111111111111111111111");
const recipient = getAddress("0x2222222222222222222222222222222222222222");

process.env.SIGNER_MAX_GAS = "500000";
process.env.SIGNER_MAX_FEE_PER_GAS_WEI = "1000000000";
process.env.SIGNER_MAX_PRIORITY_FEE_PER_GAS_WEI = "100000000";

function intent(overrides = {}) {
  const data = encodeFunctionData({
    abi,
    functionName: "executeSignedStrategy",
    args: [{
      chainId: BigInt(4663),
      account,
      asset: zeroAddress,
      recipient,
      amount: BigInt(1),
      category: 3,
      intentHash: `0x${"44".repeat(32)}`,
      nonce: BigInt(7),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      intervalSeconds: 300,
      maxExecutions: 2,
    }, `0x${"11".repeat(65)}`, BigInt(Math.floor(Date.now() / 1000) + 1800)],
  });
  return {
    chainId: 4663,
    to: account,
    data,
    value: "0",
    gas: "300000",
    maxFeePerGas: "900000000",
    maxPriorityFeePerGas: "90000000",
    nonce: 3,
    idempotencyKey: "rulewallet:4663:strategy:digest:3",
    expectedResult: "bounded strategy execution",
    ...overrides,
  };
}

test("DER parser normalizes valid r and s values", () => {
  const parsed = parseDerSignature(Uint8Array.from([0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x02]));
  assert.equal(parsed.r, BigInt(1));
  assert.equal(parsed.s, BigInt(2));
});

test("signer accepts only exact bounded strategy calldata", () => {
  assert.doesNotThrow(() => validateIntent(intent(), new Set([account])));
  assert.throws(() => validateIntent(intent({ chainId: 1 }), new Set([account])), /4663/);
  assert.throws(() => validateIntent(intent({ value: "1" }), new Set([account])), /zero-value/);
  assert.throws(() => validateIntent(intent({ to: recipient }), new Set([account])), /allowlisted/);
  assert.throws(() => validateIntent(intent({ data: "0x12345678" }), new Set([account])), /executeSignedStrategy/);
});

test("signer enforces independent gas and fee ceilings", () => {
  assert.throws(() => validateIntent(intent({ gas: "500001" }), new Set([account])), /Gas exceeds/);
  assert.throws(() => validateIntent(intent({ maxFeePerGas: "1000000001" }), new Set([account])), /Fee exceeds/);
  assert.throws(() => validateIntent(intent({ maxPriorityFeePerGas: "100000001" }), new Set([account])), /Priority fee exceeds/);
});

test("ambiguous broadcasts carry the exact hash for durable reconciliation", () => {
  const hash = `0x${"ab".repeat(32)}`;
  const error = new AmbiguousBroadcastError(hash);
  assert.equal(error.name, "AmbiguousBroadcastError");
  assert.equal(error.transactionHash, hash);
  assert.match(error.message, /durable signer lock remains/);
});
