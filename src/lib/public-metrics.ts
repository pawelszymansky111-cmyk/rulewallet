import type { AgentExecution } from "@/lib/agent-types";

export type PublicMetrics = {
  network: "Robinhood Chain Testnet";
  chainId: 46630;
  capturedAt: string;
  blockNumber: string;
  contract: {
    address: string;
    balanceEth: string;
    policyActive: boolean;
    paused: boolean;
  };
  nativePolicy: {
    maxPerTransactionEth: string;
    rollingLimit24HoursEth: string;
    approvalAboveEth: string;
    rollingSpentEth: string;
    remainingRollingEth: string;
  };
  agent: {
    address?: string;
    roleGranted: boolean;
    nonce: string;
    gasBalanceEth?: string;
  };
  automation: {
    activeStrategies: number;
    totalStrategies: number;
    confirmedExecutions: number;
    blockedExecutions: number;
    failedExecutions: number;
    lastExecution?: AgentExecution;
    nextScheduledRun?: string;
  };
  safety: {
    mainnetEnabled: false;
    realFundsEnabled: false;
  };
};

export function remainingRollingLimit(limit: bigint, spent: bigint) {
  return limit > spent ? limit - spent : BigInt(0);
}

export function summarizeExecutionStatuses(executions: AgentExecution[]) {
  return executions.reduce(
    (summary, execution) => {
      summary[execution.status] += 1;
      return summary;
    },
    { confirmed: 0, blocked: 0, failed: 0 },
  );
}
