import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { agentSignerConfigured, getAgentAccount, getAgentPublicClient } from "@/lib/agent-clients";
import { listExecutions, listStrategies, storageConfigured } from "@/lib/agent-store";
import { remainingRollingLimit, summarizeExecutionStatuses, type PublicMetrics } from "@/lib/public-metrics";
import { nativeAssetAddress, ruleWalletAbi, ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!ruleWalletAddress) {
    return NextResponse.json({ error: "The public testnet contract is not configured." }, { status: 503 });
  }

  try {
    const client = getAgentPublicClient();
    const account = agentSignerConfigured() ? getAgentAccount() : undefined;
    const storageAvailable = storageConfigured();
    const [
      blockNumber,
      contractBalance,
      policyActive,
      paused,
      nativePolicy,
      rollingSpent,
      agentRole,
      strategies,
      executions,
    ] = await Promise.all([
      client.getBlockNumber(),
      client.getBalance({ address: ruleWalletAddress }),
      client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "policyActive" }),
      client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "paused" }),
      client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "assetPolicies", args: [nativeAssetAddress] }),
      client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "rollingSpent", args: [nativeAssetAddress] }),
      account
        ? client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "AGENT_ROLE" })
        : Promise.resolve(undefined),
      storageAvailable ? listStrategies() : Promise.resolve([]),
      storageAvailable ? listExecutions(200) : Promise.resolve([]),
    ]);

    const [nativeAllowed, maxPerTransaction, maxRolling24Hours, approvalAbove] = nativePolicy;
    const [roleGranted, nonce, gasBalance] = account && agentRole
      ? await Promise.all([
          client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "hasRole", args: [agentRole, account.address] }),
          client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "nextNonce", args: [account.address] }),
          client.getBalance({ address: account.address }),
        ])
      : [false, BigInt(0), undefined] as const;
    const statusCounts = summarizeExecutionStatuses(executions);
    const activeStrategies = strategies.filter((strategy) => strategy.active);
    const nextScheduledRun = activeStrategies
      .map((strategy) => strategy.nextRunAt)
      .sort((left, right) => left.localeCompare(right))[0];

    const response: PublicMetrics = {
      network: "Robinhood Chain Testnet",
      chainId: 46630,
      capturedAt: new Date().toISOString(),
      blockNumber: blockNumber.toString(),
      contract: {
        address: ruleWalletAddress,
        balanceEth: formatEther(contractBalance),
        policyActive: policyActive && nativeAllowed,
        paused,
      },
      nativePolicy: {
        maxPerTransactionEth: formatEther(maxPerTransaction),
        rollingLimit24HoursEth: formatEther(maxRolling24Hours),
        approvalAboveEth: formatEther(approvalAbove),
        rollingSpentEth: formatEther(rollingSpent),
        remainingRollingEth: formatEther(remainingRollingLimit(maxRolling24Hours, rollingSpent)),
      },
      agent: {
        address: account?.address,
        roleGranted,
        nonce: nonce.toString(),
        gasBalanceEth: gasBalance === undefined ? undefined : formatEther(gasBalance),
      },
      automation: {
        activeStrategies: activeStrategies.length,
        totalStrategies: strategies.length,
        confirmedExecutions: statusCounts.confirmed,
        blockedExecutions: statusCounts.blocked,
        failedExecutions: statusCounts.failed,
        lastExecution: executions[0],
        nextScheduledRun,
      },
      safety: { mainnetEnabled: false, realFundsEnabled: false },
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live metrics are unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
