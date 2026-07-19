import "server-only";
import { parseEther } from "viem";
import {
  agentSignerConfigured,
  getAgentAccount,
  getAgentPublicClient,
  getAgentWalletClient,
} from "@/lib/agent-clients";
import {
  claimExecutionLock,
  getStrategy,
  listStrategies,
  releaseExecutionLock,
  saveExecution,
  saveStrategy,
} from "@/lib/agent-store";
import { getAgentBlockReason } from "@/lib/agent-policy";
import type { AgentExecution } from "@/lib/agent-types";
import { deliverTestnetNotification } from "@/lib/notification-delivery";
import { notificationFromExecution } from "@/lib/notification-events";
import { hasPinnedRuleWalletRuntime, nativeAssetAddress, ruleWalletAbi, ruleWalletAddress } from "@/lib/rulewallet-contract";

type Trigger = "schedule" | "manual";

async function recordExecution(execution: AgentExecution) {
  const saved = await saveExecution(execution);
  await deliverTestnetNotification(notificationFromExecution(saved));
  return saved;
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message.split("\n")[0].slice(0, 240);
  return "Unknown execution error";
}

async function recordFailure(
  strategy: NonNullable<Awaited<ReturnType<typeof getStrategy>>>,
  trigger: Trigger,
  status: "blocked" | "failed",
  reason: string,
) {
  return recordExecution({
    id: crypto.randomUUID(),
    strategyId: strategy.id,
    strategyName: strategy.name,
    target: strategy.target,
    policyAccount: strategy.policyAccount ?? ruleWalletAddress,
    amountEth: strategy.amountEth,
    trigger,
    status,
    reason,
    createdAt: new Date().toISOString(),
  });
}

export async function executeStrategy(strategyId: string, trigger: Trigger) {
  const strategy = await getStrategy(strategyId);
  if (!strategy) throw new Error("Strategy not found.");
  if (!strategy.active) return recordFailure(strategy, trigger, "blocked", "Strategy is paused.");
  const policyAccount = strategy.policyAccount ?? ruleWalletAddress;
  if (!policyAccount) return recordFailure(strategy, trigger, "blocked", "Policy contract is not configured.");
  if (!agentSignerConfigured()) return recordFailure(strategy, trigger, "blocked", "Agent signer is not configured.");

  const lock = await claimExecutionLock(strategy.id);
  if (!lock) return recordFailure(strategy, trigger, "blocked", "Another execution is already in progress.");

  try {
    const account = getAgentAccount();
    const publicClient = getAgentPublicClient();
    const walletClient = getAgentWalletClient();
    const bytecode = await publicClient.getBytecode({ address: policyAccount });
    if (!hasPinnedRuleWalletRuntime(bytecode)) {
      return recordFailure(strategy, trigger, "blocked", "Policy account runtime does not match the pinned RuleWallet testnet release.");
    }
    const amount = parseEther(strategy.amountEth);
    const [policyActive, paused, allowedTarget, nativePolicy, nonce, balance, agentRole] =
      await Promise.all([
        publicClient.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "policyActive" }),
        publicClient.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "paused" }),
        publicClient.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "allowedTargets", args: [strategy.target] }),
        publicClient.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "assetPolicies", args: [nativeAssetAddress] }),
        publicClient.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "nextNonce", args: [account.address] }),
        publicClient.getBalance({ address: policyAccount }),
        publicClient.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "AGENT_ROLE" }),
      ]);
    const hasAgentRole = await publicClient.readContract({
      address: policyAccount,
      abi: ruleWalletAbi,
      functionName: "hasRole",
      args: [agentRole, account.address],
    });

    const blockedReason = getAgentBlockReason({
      policyActive,
      paused,
      hasAgentRole,
      allowedTarget,
      nativePolicyAllowed: nativePolicy[0],
      amount,
      maxPerTransaction: nativePolicy[1],
      approvalAbove: nativePolicy[3],
      contractBalance: balance,
    });
    if (blockedReason) return recordFailure(strategy, trigger, "blocked", blockedReason);

    const deadline = BigInt(Math.floor(Date.now() / 1_000) + 30 * 60);
    const simulation = await publicClient.simulateContract({
      account,
      address: policyAccount,
      abi: ruleWalletAbi,
      functionName: "requestNativeCall",
      args: [strategy.target, amount, "0x", 0, deadline, nonce],
    });
    const transactionHash = await walletClient.writeContract(simulation.request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== "success") throw new Error("Agent transaction reverted.");

    const now = new Date();
    await saveStrategy({
      ...strategy,
      lastRunAt: now.toISOString(),
      nextRunAt: new Date(now.getTime() + strategy.cadenceHours * 60 * 60_000).toISOString(),
    });
    const execution: AgentExecution = {
      id: crypto.randomUUID(),
      strategyId: strategy.id,
      strategyName: strategy.name,
      target: strategy.target,
      policyAccount,
      amountEth: strategy.amountEth,
      trigger,
      status: "confirmed",
      transactionHash,
      blockNumber: receipt.blockNumber.toString(),
      createdAt: now.toISOString(),
    };
    return recordExecution(execution);
  } catch (error) {
    return recordFailure(strategy, trigger, "failed", errorText(error));
  } finally {
    await releaseExecutionLock(lock);
  }
}

export async function runDueStrategies() {
  const now = Date.now();
  const strategies = await listStrategies();
  const due = strategies.filter(
    (strategy) => strategy.active && new Date(strategy.nextRunAt).getTime() <= now,
  );
  const executions = [];
  for (const strategy of due.slice(0, 10)) {
    executions.push(await executeStrategy(strategy.id, "schedule"));
  }
  return executions;
}
