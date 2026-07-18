import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StartExperience } from "@/components/start-experience";

export const metadata: Metadata = {
  title: "Start with RuleWallet",
  description: "Understand RuleWallet, watch the demo, and set up a policy account with a guided Simple mode or advanced Pro controls.",
};

export default function StartPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <StartExperience />
      <SiteFooter />
    </div>
  );
}
