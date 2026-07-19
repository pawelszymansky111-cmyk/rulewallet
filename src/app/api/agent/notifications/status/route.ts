import { NextResponse } from "next/server";
import { testnetNotificationsConfigured } from "@/lib/notification-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = testnetNotificationsConfigured();
  return NextResponse.json({
    configured,
    adapter: configured ? "authenticated-webhook" : "disabled",
    topics: ["execution", "approval", "failure", "unusual-spending"],
    destinations: ["email", "Telegram", "Slack", "incident systems"],
    message: configured
      ? "Authenticated testnet event delivery is configured."
      : "In-app receipts are active. Add an authenticated HTTPS webhook to deliver external alerts.",
  });
}
