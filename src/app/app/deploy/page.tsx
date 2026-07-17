import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { TestnetDeploymentWizard } from "@/components/testnet-deployment-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Deploy on testnet" };

export default function DeployPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
        <Link href="/app"><ArrowLeft /> Back to dashboard</Link>
      </Button>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Testnet launch</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Deploy RuleWallet</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Launch the tested policy account from MetaMask, then apply conservative demo limits.</p>
        </div>
        <Badge variant="outline" className="border-amber-300/25 text-amber-200"><LockKeyhole /> No mainnet</Badge>
      </div>
      <TestnetDeploymentWizard />
    </main>
  );
}
