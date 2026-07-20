import "server-only";
import { signedWebhookHeaders, webhookSigningSecretConfigured } from "@/lib/signed-webhook";

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
  return Boolean(
    process.env.MAINNET_ALERT_WEBHOOK_URL
      && process.env.MAINNET_ALERT_WEBHOOK_TOKEN
      && webhookSigningSecretConfigured(process.env.MAINNET_ALERT_WEBHOOK_SIGNING_SECRET),
  );
}

export async function sendMainnetAlert(alert: MainnetAlert) {
  if (!mainnetAlertsConfigured()) return false;
  const body = JSON.stringify(alert);
  const response = await fetch(process.env.MAINNET_ALERT_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MAINNET_ALERT_WEBHOOK_TOKEN}`,
      "Content-Type": "application/json",
      ...signedWebhookHeaders({
        body,
        deliveryId: crypto.randomUUID(),
        secret: process.env.MAINNET_ALERT_WEBHOOK_SIGNING_SECRET!,
      }),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  return response.ok;
}
