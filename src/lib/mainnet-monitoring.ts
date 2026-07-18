import "server-only";

export type MainnetAlert = {
  severity: "critical" | "high" | "medium";
  code: string;
  summary: string;
  account?: string;
  strategyId?: string;
  transactionHash?: string;
  occurredAt: string;
};

export function mainnetAlertsConfigured() {
  return Boolean(process.env.MAINNET_ALERT_WEBHOOK_URL && process.env.MAINNET_ALERT_WEBHOOK_TOKEN);
}

export async function sendMainnetAlert(alert: MainnetAlert) {
  if (!mainnetAlertsConfigured()) return false;
  const response = await fetch(process.env.MAINNET_ALERT_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MAINNET_ALERT_WEBHOOK_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(alert),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  return response.ok;
}
