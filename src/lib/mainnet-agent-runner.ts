import "server-only";
import { encodeFunctionData, getAddress, type Hex } from "viem";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import {
  claimMainnetExecutionLock,
  getMainnetStrategy,
  listMainnetStrategies,
  releaseMainnetExecutionLock,
  saveMainnetExecution,
  saveMainnetStrategy,
} from "@/lib/mainnet-agent-store";
import type { MainnetAgentStrategy, MainnetAgentExecution } from "@/lib/mainnet-agent-types";
import { ruleWalletV2Abi } from "@/lib/mainnet-registry";
import { sendMainnetAlert } from "@/lib/mainnet-monitoring";
import { getMainnetAgentSigner, mainnetSignerStatus } from "@/lib/secure-agent-signer";
import { getServerEnvironment } from "@/lib/server-env";

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

  try {
    const client = getMainnetPublicClient();
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

    const submitted = await signer.submitTransaction({
      chainId: 4663,
      to: strategy.account,
      data,
      value: "0",
      gas: (estimatedGas * BigInt(120) / BigInt(100)).toString(),
      maxFeePerGas: fees.maxFeePerGas.toString(),
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas.toString(),
      nonce,
      idempotencyKey: `rulewallet:4663:${strategy.id}:${digest}:${nonce}`,
      expectedResult: simulation.result === BigInt(0)
        ? "Direct policy-compliant transfer and RequestExecuted event"
        : `Pending human approval request ${simulation.result}`,
    });
    const receipt = await client.waitForTransactionReceipt({ hash: submitted.transactionHash, confirmations: 3, timeout: 180_000 });
    const transaction = await client.getTransaction({ hash: submitted.transactionHash });
    if (
      receipt.status !== "success" || transaction.from !== signer.address
      || !transaction.to || getAddress(transaction.to) !== getAddress(strategy.account)
      || transaction.input.toLowerCase() !== data.toLowerCase() || transaction.value !== BigInt(0)
      || transaction.nonce !== nonce
    ) {
      await sendMainnetAlert({ severity: "critical", code: "SIGNED_TRANSACTION_MISMATCH", summary: "Signer receipt did not match the approved transaction intent.", account: strategy.account, strategyId: strategy.id, transactionHash: submitted.transactionHash, occurredAt: new Date().toISOString() }).catch(() => false);
      throw new Error("Secure signer transaction did not match the exact approved intent.");
    }

    const now = new Date();
    await saveMainnetStrategy({
      ...strategy,
      lastRunAt: now.toISOString(),
      nextRunAt: new Date(now.getTime() + strategy.intervalSeconds * 1000).toISOString(),
    });
    return saveMainnetExecution({
      id: crypto.randomUUID(), strategyId: strategy.id, strategyName: strategy.name,
      account: strategy.account, asset: strategy.asset, recipient: strategy.recipient,
      amount: strategy.amount, trigger: "schedule", status: "confirmed",
      reason: simulation.result === BigInt(0) ? "Policy checks passed; transfer confirmed." : `Pending human approval request ${simulation.result}.`,
      transactionHash: submitted.transactionHash, blockNumber: receipt.blockNumber.toString(), confirmations: 3,
      createdAt: now.toISOString(),
    });
  } catch (error) {
    return record(strategy, "failed", errorText(error));
  } finally {
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
