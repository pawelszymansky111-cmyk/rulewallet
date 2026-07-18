import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookUser, ExternalLink, FlaskConical, Fuel, Network, Rocket, ShieldAlert, Wallet } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Start on testnet",
  description: "Set up Robinhood Chain testnet and deploy a personal RuleWallet policy account safely.",
};

const steps = [
  { icon: Network, title: "Add Robinhood Chain testnet", text: "Connect MetaMask from the header. RuleWallet will offer chain ID 46630 when a protected action needs it.", action: "Open network instructions", href: "https://docs.robinhood.com/chain/connecting/", external: true },
  { icon: Fuel, title: "Get valueless test ETH", text: "Use the official faucet for gas and demo funding. Testnet ETH cannot be sold and has no real value.", action: "Open official faucet", href: "https://faucet.testnet.chain.robinhood.com/", external: true },
  { icon: Rocket, title: "Deploy your policy account", text: "Deploy the committed contract bytecode and approve conservative testnet limits as separate wallet transactions.", action: "Open deploy wizard", href: "/app/deploy", external: false },
  { icon: BookUser, title: "Add a trusted recipient", text: "Verify admin control, label a recipient locally, simulate the exact allowlist change, and sign it in your wallet.", action: "Manage trusted addresses", href: "/app/services", external: false },
  { icon: FlaskConical, title: "Run a canary and verify it", text: "Use a tiny testnet amount, inspect the public receipt, and practice pause and revoke before scheduling anything.", action: "Open agent console", href: "/app/agent", external: false },
] as const;

export default function StartPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-20">
        <Badge variant="outline" className="border-primary/25 text-primary"><Wallet /> Owner onboarding</Badge>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">From zero to a personal testnet policy account.</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">Follow these steps in order. RuleWallet never asks for a seed phrase or private key; administrative changes are simulated and signed inside your wallet.</p>

        <Alert className="mt-8 border-amber-300/20 bg-amber-300/[0.04] text-amber-100"><ShieldAlert /><AlertTitle>This onboarding is testnet only</AlertTitle><AlertDescription className="text-amber-100/75">Use only faucet-issued testnet ETH in this V1 flow. Experimental mainnet V2 is isolated at <Link href="/mainnet" className="underline">/mainnet</Link> and has separate risk gates.</AlertDescription></Alert>

        <div className="mt-10 space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardHeader className="gap-5 sm:grid sm:grid-cols-[52px_1fr_auto] sm:items-center">
                  <span className="grid size-12 place-items-center rounded-xl border border-primary/20 bg-primary/[0.06] text-primary"><Icon className="size-5" /></span>
                  <div><p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">Step {index + 1}</p><CardTitle className="mt-1">{step.title}</CardTitle><CardDescription className="mt-2 max-w-2xl leading-6">{step.text}</CardDescription></div>
                  <Button asChild variant={index === 2 ? "default" : "outline"} className="w-fit">
                    {step.external ? <a href={step.href} target="_blank" rel="noreferrer">{step.action} <ExternalLink /></a> : <Link href={step.href}>{step.action} <ArrowRight /></Link>}
                  </Button>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3"><Button asChild size="lg"><Link href="/demo">See the 2-minute demo <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link href="/hackathon">Read the submission</Link></Button></div>
      </main>
      <SiteFooter />
    </div>
  );
}
