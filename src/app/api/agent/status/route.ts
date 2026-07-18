import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { agentSignerConfigured, getAgentAccount, getAgentPublicClient } from "@/lib/agent-clients";
import { storageConfigured } from "@/lib/agent-store";
import { ruleWalletAbi, ruleWalletAddress } from "@/lib/rulewallet-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const signerConfigured = agentSignerConfigured();
  if (!signerConfigured || !ruleWalletAddress) {
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
    const [balance, role] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.readContract({ address: ruleWalletAddress, abi: ruleWalletAbi, functionName: "AGENT_ROLE" }),
    ]);
    const roleGranted = await client.readContract({
      address: ruleWalletAddress,
      abi: ruleWalletAbi,
      functionName: "hasRole",
      args: [role, account.address],
    });
    return NextResponse.json({
      signerConfigured: true,
      storageConfigured: storageConfigured(),
      schedulerConfigured: Boolean(process.env.CRON_SECRET),
      address: account.address,
      balanceEth: formatEther(balance),
      roleGranted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent status unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
