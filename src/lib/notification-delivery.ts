import "server-only";
import type { NotificationEvent } from "@/lib/notification-events";

export type NotificationDeliveryResult = {
  configured: boolean;
  delivered: boolean;
  adapter: "authenticated-webhook" | "disabled";
};

function webhookConfiguration() {
  const url = process.env.TESTNET_NOTIFICATION_WEBHOOK_URL;
  const token = process.env.TESTNET_NOTIFICATION_WEBHOOK_TOKEN;
  if (!url || !token) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || token.length < 16) return undefined;
    return { url: parsed.toString(), token };
  } catch {
    return undefined;
  }
}

export function testnetNotificationsConfigured() {
  return Boolean(webhookConfiguration());
}

export async function deliverTestnetNotification(
  event: NotificationEvent,
): Promise<NotificationDeliveryResult> {
  const configuration = webhookConfiguration();
  if (!configuration) {
    return { configured: false, delivered: false, adapter: "disabled" };
  }

  try {
    const response = await fetch(configuration.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.token}`,
        "Content-Type": "application/json",
        "X-RuleWallet-Event": event.topic,
      },
      body: JSON.stringify(event),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return {
      configured: true,
      delivered: response.ok,
      adapter: "authenticated-webhook",
    };
  } catch {
    return {
      configured: true,
      delivered: false,
      adapter: "authenticated-webhook",
    };
  }
}
