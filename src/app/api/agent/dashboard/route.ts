import { NextRequest, NextResponse } from "next/server";
import { formatEther, getAddress, isAddress } from "viem";
import { agentSignerConfigured, getAgentAccount, getAgentPublicClient } from "@/lib/agent-clients";
import { listExecutions, listStrategies, storageConfigured } from "@/lib/agent-store";
import { remainingRollingLimit, summarizeExecutionStatuses, type PublicMetrics } from "@/lib/public-metrics";
import { checkRateLimit, rateLimitFailure } from "@/lib/rate-limit";
import { hasPinnedRuleWalletRuntime, nativeAssetAddress, ruleWalletAbi, ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimit(
    `agent-dashboard:${request.headers.get("x-forwarded-for") ?? "unknown"}`,
    { limit: 60, windowMs: 60_000 },
  );
  const failure = rateLimitFailure(rateLimit, "Too many dashboard refreshes.");
  if (failure) return NextResponse.json({ error: failure.error }, { status: failure.status });

  const requested = request.nextUrl.searchParams.get("policyAccount");
  if (!requested || !isAddress(requested)) {
    return NextResponse.json({ error: "Enter a valid RuleWallet policy-account address." }, { status: 400 });
  }

  const policyAccount = getAddress(requested);
  try {
    const client = getAgentPublicClient();
    const bytecode = await client.getBytecode({ address: policyAccount });
    if (!hasPinnedRuleWalletRuntime(bytecode)) {
      return NextResponse.json({ error: "This address is not a pinned RuleWallet testnet policy account." }, { status: 400 });
    }

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
      allStrategies,
      allExecutions,
    ] = await Promise.all([
      client.getBlockNumber(),
      client.getBalance({ address: policyAccount }),
      client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "policyActive" }),
      client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "paused" }),
      client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "assetPolicies", args: [nativeAssetAddress] }),
      client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "rollingSpent", args: [nativeAssetAddress] }),
      account
        ? client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "AGENT_ROLE" })
        : Promise.resolve(undefined),
      storageAvailable ? listStrategies() : Promise.resolve([]),
      storageAvailable ? listExecutions(200) : Promise.resolve([]),
    ]);

    const [nativeAllowed, maxPerTransaction, maxRolling24Hours, approvalAbove] = nativePolicy;
    const [roleGranted, nonce, gasBalance] = account && agentRole
      ? await Promise.all([
          client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "hasRole", args: [agentRole, account.address] }),
          client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "nextNonce", args: [account.address] }),
          client.getBalance({ address: account.address }),
        ])
      : [false, BigInt(0), undefined] as const;

    const matchesPolicyAccount = (value?: string) =>
      (value ?? ruleWalletAddress)?.toLowerCase() === policyAccount.toLowerCase();
    const strategies = allStrategies.filter((strategy) => matchesPolicyAccount(strategy.policyAccount));
    const executions = allExecutions.filter((execution) => matchesPolicyAccount(execution.policyAccount));
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
        address: policyAccount,
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
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Policy dashboard is unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
