import type { Metadata } from "next";
import { NotificationCenter } from "@/components/notification-center";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Configure policy-aware RuleWallet execution and safety alerts.",
};

export default function NotificationsPage() {
  return <NotificationCenter />;
}
