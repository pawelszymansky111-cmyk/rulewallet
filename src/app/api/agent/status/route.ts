import { NextRequest, NextResponse } from "next/server";
import { formatEther, getAddress, isAddress } from "viem";
import { agentSignerConfigured, getAgentAccount, getAgentPublicClient } from "@/lib/agent-clients";
import { storageConfigured } from "@/lib/agent-store";
import { hasPinnedRuleWalletRuntime, ruleWalletAbi, ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const signerConfigured = agentSignerConfigured();
  const requestedAccount = request.nextUrl.searchParams.get("policyAccount");
  const policyAccount = requestedAccount && isAddress(requestedAccount)
    ? getAddress(requestedAccount)
    : ruleWalletAddress;
  if (!signerConfigured || !policyAccount) {
    return NextResponse.json({
      signerConfigured,
      storageConfigured: storageConfigured(),
      schedulerConfigured: Boolean(process.env.CRON_SECRET),
      roleGranted: false,
    });
  }
  try {
    const account = getAgentAccount();
    const client = getAgentPublicClient();
    const [balance, role, bytecode] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.readContract({ address: policyAccount, abi: ruleWalletAbi, functionName: "AGENT_ROLE" }),
      client.getBytecode({ address: policyAccount }),
    ]);
    if (!hasPinnedRuleWalletRuntime(bytecode)) {
      return NextResponse.json({ error: "This address is not a pinned RuleWallet testnet policy account." }, { status: 400 });
    }
    const roleGranted = await client.readContract({
      address: policyAccount,
      abi: ruleWalletAbi,
      functionName: "hasRole",
      args: [role, account.address],
    });
    return NextResponse.json({
      signerConfigured: true,
      storageConfigured: storageConfigured(),
      schedulerConfigured: Boolean(process.env.CRON_SECRET),
      address: account.address,
      policyAccount,
      balanceEth: formatEther(balance),
      roleGranted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent status unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
