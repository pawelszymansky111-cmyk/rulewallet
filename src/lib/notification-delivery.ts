import "server-only";
import type { NotificationEvent } from "@/lib/notification-events";
import { signedWebhookHeaders, webhookSigningSecretConfigured } from "@/lib/signed-webhook";

export type NotificationDeliveryResult = {
  configured: boolean;
  delivered: boolean;
  adapter: "authenticated-webhook" | "disabled";
};

function webhookConfiguration() {
  const url = process.env.TESTNET_NOTIFICATION_WEBHOOK_URL;
  const token = process.env.TESTNET_NOTIFICATION_WEBHOOK_TOKEN;
  const signingSecret = process.env.TESTNET_NOTIFICATION_WEBHOOK_SIGNING_SECRET;
  if (!url || !token || !webhookSigningSecretConfigured(signingSecret)) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || token.length < 16) return undefined;
    return { url: parsed.toString(), token, signingSecret: signingSecret! };
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
    const body = JSON.stringify(event);
    const response = await fetch(configuration.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${configuration.token}`,
        "Content-Type": "application/json",
        "X-RuleWallet-Event": event.topic,
        ...signedWebhookHeaders({
          body,
          deliveryId: event.id,
          secret: configuration.signingSecret,
        }),
      },
      body,
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
