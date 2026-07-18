import "server-only";
import { encodeFunctionData, getAddress, type Hex } from "viem";
import { getIndependentMainnetPublicClients, getMainnetPublicClient } from "@/lib/mainnet-clients";
import {
  claimMainnetExecutionLock,
  getMainnetStrategy,
  listMainnetStrategies,
  listMainnetExecutions,
  releaseMainnetExecutionLock,
  claimMainnetSignerLock,
  saveMainnetExecution,
  saveMainnetStrategy,
  getMainnetPendingSignerTransaction,
  saveMainnetPendingSignerTransaction,
  clearMainnetPendingSignerTransaction,
} from "@/lib/mainnet-agent-store";
import type { MainnetAgentStrategy, MainnetAgentExecution } from "@/lib/mainnet-agent-types";
import { ruleWalletV2Abi } from "@/lib/mainnet-registry";
import { sendMainnetAlert } from "@/lib/mainnet-monitoring";
import { getMainnetAgentSigner, mainnetSignerStatus } from "@/lib/secure-agent-signer";
import { getServerEnvironment } from "@/lib/server-env";
import { assertRpcAgreement, assertWithinMainnetFeeCeilings, MAINNET_AUTONOMY_RELEASE_ENABLED } from "@/lib/mainnet-safety";
import { keccak256 } from "viem";

function errorText(error: unknown) {
  return error instanceof Error ? error.message.split("\n")[0].slice(0, 400) : "Unknown mainnet execution error";
}

function strategyTuple(strategy: MainnetAgentStrategy) {
  return {
    chainId: BigInt(strategy.chainId),
    account: strategy.account,
    asset: strategy.asset,
    recipient: strategy.recipient,
    amount: BigInt(strategy.amount),
    nonce: BigInt(strategy.nonce),
    expiry: BigInt(strategy.expiry),
    intervalSeconds: strategy.intervalSeconds,
    maxExecutions: strategy.maxExecutions,
  } as const;
}

async function record(
  strategy: MainnetAgentStrategy,
  status: "blocked" | "failed",
  reason: string,
): Promise<MainnetAgentExecution> {
  const execution = await saveMainnetExecution({
    id: crypto.randomUUID(),
    strategyId: strategy.id,
    strategyName: strategy.name,
    account: strategy.account,
    asset: strategy.asset,
    recipient: strategy.recipient,
    amount: strategy.amount,
    trigger: "schedule",
    status,
    reason,
    createdAt: new Date().toISOString(),
  });
  await sendMainnetAlert({
    severity: status === "failed" ? "high" : "medium",
    code: `AUTONOMY_${status.toUpperCase()}`,
    summary: reason,
    account: strategy.account,
    strategyId: strategy.id,
    occurredAt: execution.createdAt,
  }).catch(() => false);
  return execution;
}

export async function executeMainnetStrategy(strategyId: string) {
  const strategy = await getMainnetStrategy(strategyId);
  if (!strategy) throw new Error("Mainnet strategy not found.");
  if (!strategy.active) return record(strategy, "blocked", "Strategy is inactive.");

  if (!MAINNET_AUTONOMY_RELEASE_ENABLED) {
    return record(strategy, "blocked", "Autonomous mainnet execution is compile-time disabled; this release supports manual preview actions only.");
  }

  const environment = getServerEnvironment();
  const signerStatus = mainnetSignerStatus();
  if (environment.ENABLE_MAINNET !== "true" || environment.ENABLE_MAINNET_AUTONOMY !== "true") {
    return record(strategy, "blocked", "Autonomous mainnet execution is disabled by environment policy.");
  }
  if (!signerStatus.configured || !signerStatus.address) {
    return record(strategy, "blocked", signerStatus.reason ?? "Secure signer is not configured.");
  }

  const lock = await claimMainnetExecutionLock(strategy.id);
  if (!lock) return record(strategy, "blocked", "A durable execution lock is already held.");

  const signerLock = await claimMainnetSignerLock(signerStatus.address);
  if (!signerLock) {
    await releaseMainnetExecutionLock(lock);
    return record(strategy, "blocked", "The signer-global durable nonce lock is already held.");
  }

  try {
    const existingPending = await getMainnetPendingSignerTransaction(signerStatus.address);
    if (existingPending) return record(strategy, "blocked", `Signer nonce ${existingPending.nonce} is still reserved by pending transaction ${existingPending.transactionHash}.`);
    const client = getMainnetPublicClient();
    const independentClients = getIndependentMainnetPublicClients();
    const signer = getMainnetAgentSigner();
    const typedStrategy = strategyTuple(strategy);
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    if (BigInt(strategy.expiry) <= nowSeconds) return record(strategy, "blocked", "Strategy signature expired.");

    const [agentRole, policyActive, paused, trusted, policy, digest] = await Promise.all([
      client.readContract({ address: strategy.account, abi: ruleWalletV2Abi, functionName: "AGENT_ROLE" }),
      client.readContract({ address: strategy.account, abi: ruleWalletV2Abi, functionName: "policyActive" }),
      client.readContract({ address: strategy.account, abi: ruleWalletV2Abi, functionName: "paused" }),
      client.readContract({ address: strategy.account, abi: ruleWalletV2Abi, functionName: "trustedRecipients", args: [strategy.recipient] }),
      client.readContract({ address: strategy.account, abi: ruleWalletV2Abi, functionName: "assetPolicies", args: [strategy.asset] }),
      client.readContract({ address: strategy.account, abi: ruleWalletV2Abi, functionName: "strategyDigest", args: [typedStrategy] }),
    ]);
    const hasAgentRole = await client.readContract({ address: strategy.account, abi: ruleWalletV2Abi, functionName: "hasRole", args: [agentRole, signer.address] });
    if (!policyActive) return record(strategy, "blocked", "Onchain policy is inactive.");
    if (paused) return record(strategy, "blocked", "Policy account is paused.");
    if (!trusted) return record(strategy, "blocked", "Recipient is no longer trusted.");
    if (!policy[0]) return record(strategy, "blocked", "Asset policy is disabled.");
    if (!hasAgentRole) return record(strategy, "blocked", "Secure signer does not hold AGENT_ROLE.");

    const requestDeadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
    const simulation = await client.simulateContract({
      account: signer.address,
      address: strategy.account,
      abi: ruleWalletV2Abi,
      functionName: "executeSignedStrategy",
      args: [typedStrategy, strategy.signature as Hex, requestDeadline],
    });
    const data = encodeFunctionData({
      abi: ruleWalletV2Abi,
      functionName: "executeSignedStrategy",
      args: [typedStrategy, strategy.signature as Hex, requestDeadline],
    });
    const [nonce, estimatedGas, fees] = await Promise.all([
      client.getTransactionCount({ address: signer.address, blockTag: "pending" }),
      client.estimateContractGas({ account: signer.address, address: strategy.account, abi: ruleWalletV2Abi, functionName: "executeSignedStrategy", args: [typedStrategy, strategy.signature as Hex, requestDeadline] }),
      client.estimateFeesPerGas(),
    ]);
    if (!fees.maxFeePerGas || !fees.maxPriorityFeePerGas) throw new Error("RPC did not return EIP-1559 fee estimates.");
    const agreement = await Promise.all(independentClients.map(async (rpc) => ({
      chainId: await rpc.getChainId(),
      nonce: await rpc.getTransactionCount({ address: signer.address, blockTag: "pending" }),
      codeHash: keccak256(await rpc.getCode({ address: strategy.account }) ?? "0x"),
    })));
    assertRpcAgreement(agreement);
    const gas = estimatedGas * BigInt(120) / BigInt(100);
    assertWithinMainnetFeeCeilings({ gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas });

    const submitted = await signer.submitTransaction({
      chainId: 4663,
      to: strategy.account,
      data,
      value: "0",
      gas: gas.toString(),
      maxFeePerGas: fees.maxFeePerGas.toString(),
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas.toString(),
      nonce,
      idempotencyKey: `rulewallet:4663:${strategy.id}:${digest}:${nonce}`,
      expectedResult: simulation.result === BigInt(0)
        ? "Direct policy-compliant transfer and RequestExecuted event"
        : `Pending human approval request ${simulation.result}`,
    });
    await saveMainnetPendingSignerTransaction(signer.address, {
      transactionHash: submitted.transactionHash,
      nonce,
      strategyId: strategy.id,
      submittedAt: new Date().toISOString(),
    });
    await saveMainnetExecution({
      id: crypto.randomUUID(), strategyId: strategy.id, strategyName: strategy.name,
      account: strategy.account, asset: strategy.asset, recipient: strategy.recipient,
      amount: strategy.amount, trigger: "schedule", status: "pending",
      reason: `Submitted with signer-global nonce ${nonce}; awaiting 3 confirmations.`,
      transactionHash: submitted.transactionHash, createdAt: new Date().toISOString(),
    });
    let replacementReason: string | undefined;
    let receipt;
    try {
      receipt = await client.waitForTransactionReceipt({
        hash: submitted.transactionHash,
        confirmations: 3,
        timeout: 180_000,
        onReplaced: ({ reason }) => { replacementReason = reason; },
      });
    } catch (confirmationError) {
      if (/timed? out|timeout/i.test(errorText(confirmationError))) {
        return saveMainnetExecution({
          id: crypto.randomUUID(), strategyId: strategy.id, strategyName: strategy.name,
          account: strategy.account, asset: strategy.asset, recipient: strategy.recipient,
          amount: strategy.amount, trigger: "schedule", status: "timed_out",
          reason: "Confirmation timed out. The nonce remains reserved and late confirmation must be reconciled before retrying.",
          transactionHash: submitted.transactionHash, createdAt: new Date().toISOString(),
        });
      }
      throw confirmationError;
    }
    const finalHash = receipt.transactionHash;
    const transaction = await client.getTransaction({ hash: finalHash });
    if (
      receipt.status !== "success" || transaction.from !== signer.address
      || !transaction.to || getAddress(transaction.to) !== getAddress(strategy.account)
      || transaction.input.toLowerCase() !== data.toLowerCase() || transaction.value !== BigInt(0)
      || transaction.nonce !== nonce
    ) {
      await sendMainnetAlert({ severity: "critical", code: "SIGNED_TRANSACTION_MISMATCH", summary: "Signer receipt did not match the approved transaction intent.", account: strategy.account, strategyId: strategy.id, transactionHash: finalHash, occurredAt: new Date().toISOString() }).catch(() => false);
      throw new Error("Secure signer transaction did not match the exact approved intent.");
    }
    await clearMainnetPendingSignerTransaction(signer.address, submitted.transactionHash);

    const now = new Date();
    await saveMainnetStrategy({
      ...strategy,
      lastRunAt: now.toISOString(),
      nextRunAt: new Date(now.getTime() + strategy.intervalSeconds * 1000).toISOString(),
    });
    return saveMainnetExecution({
      id: crypto.randomUUID(), strategyId: strategy.id, strategyName: strategy.name,
      account: strategy.account, asset: strategy.asset, recipient: strategy.recipient,
      amount: strategy.amount, trigger: "schedule", status: replacementReason ? "replaced" : "confirmed",
      reason: replacementReason ? `Transaction ${replacementReason}; replacement intent was revalidated and confirmed.` : simulation.result === BigInt(0) ? "Policy checks passed; transfer confirmed." : `Pending human approval request ${simulation.result}.`,
      transactionHash: finalHash, blockNumber: receipt.blockNumber.toString(), confirmations: 3,
      createdAt: now.toISOString(),
    });
  } catch (error) {
    return record(strategy, "failed", errorText(error));
  } finally {
    await releaseMainnetExecutionLock(signerLock);
    await releaseMainnetExecutionLock(lock);
  }
}

export async function runDueMainnetStrategies() {
  const now = Date.now();
  const strategies = await listMainnetStrategies();
  const due = strategies.filter((strategy) => strategy.active && new Date(strategy.nextRunAt).getTime() <= now);
  const executions = [];
  for (const strategy of due.slice(0, 10)) executions.push(await executeMainnetStrategy(strategy.id));
  return executions;
}

// Monitoring-only reconciliation. It never signs or submits a transaction.
export async function reconcileLateMainnetConfirmations() {
  const client = getMainnetPublicClient();
  const timedOut = (await listMainnetExecutions(100)).filter((execution) => execution.status === "timed_out" && execution.transactionHash);
  const reconciled: MainnetAgentExecution[] = [];
  for (const execution of timedOut) {
    const receipt = await client.getTransactionReceipt({ hash: execution.transactionHash! }).catch(() => undefined);
    if (!receipt || receipt.status !== "success") continue;
    const late = await saveMainnetExecution({
      ...execution,
      id: crypto.randomUUID(),
      status: "late_confirmed",
      reason: "A previously timed-out transaction confirmed late. Retries remain blocked pending operator reconciliation.",
      blockNumber: receipt.blockNumber.toString(),
      confirmations: 0,
      createdAt: new Date().toISOString(),
    });
    await sendMainnetAlert({ severity: "critical", code: "LATE_MAINNET_CONFIRMATION", summary: late.reason!, account: late.account, strategyId: late.strategyId, transactionHash: late.transactionHash, occurredAt: late.createdAt }).catch(() => false);
    reconciled.push(late);
  }
  return reconciled;
}
