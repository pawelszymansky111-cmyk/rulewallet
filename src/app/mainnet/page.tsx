import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { MainnetStrategyPanel } from "@/components/mainnet-strategy-panel";
import { V3AccountManager } from "@/components/v3-account-manager";
import { V3PolicyWorkspace } from "@/components/v3-policy-workspace";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Experimental mainnet",
  description:
    "RuleWallet V3 commerce accounts and production-gated autonomy on Robinhood Chain mainnet.",
};

export default function MainnetPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Badge
              variant="outline"
              className="border-red-500/30 bg-red-50 text-red-800"
            >
              Experimental mainnet · production-gated autonomy
            </Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Robinhood Chain mainnet
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Deploy a personal V3 commerce account, configure bounded agent
              authority, and run exact owner-signed strategies through a
              verified non-exportable signer when every production gate passes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/start">
                <ArrowLeft /> Testnet start
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://robinhoodchain.blockscout.com"
                target="_blank"
                rel="noreferrer"
              >
                Blockscout <ExternalLink />
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/docs">
                <BookOpen /> Docs
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-10"><V3AccountManager initialChainId={4663} /></div>
        <div className="mt-10"><V3PolicyWorkspace initialChainId={4663} /></div>
        <div className="mt-10">
          <MainnetStrategyPanel />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
