import type { Metadata } from "next";
import Image from "next/image";
import { GuidedDemo } from "@/components/guided-demo";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Guided public testnet demo",
  description: "Verify RuleWallet's live policy account, autonomous receipt, simulator, and operator controls in two minutes without using real funds.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <section className="border-b border-grid">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8 lg:py-20">
            <div><p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">Two-minute public testnet walkthrough</p><h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">See bounded autonomy working onchain.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Follow one real strategy from policy state to confirmed receipt, then test the guardrails yourself. Mainnet and real funds are disabled.</p></div>
            <div className="overflow-hidden rounded-2xl border border-primary/15 bg-card"><Image src="/social/rulewallet-testnet-launch.png" width={1729} height={910} priority alt="Abstract policy shield protecting a wallet and routing transaction paths" className="h-auto w-full" /></div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20"><GuidedDemo /></section>
      </main>
      <SiteFooter />
    </div>
  );
}
