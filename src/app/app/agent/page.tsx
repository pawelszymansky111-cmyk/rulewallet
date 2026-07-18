import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bot, LockKeyhole } from "lucide-react";
import { AgentControlCenter } from "@/components/agent-control-center";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Autonomous agent" };

export default function AgentPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6"><Link href="/app"><ArrowLeft /> Back to dashboard</Link></Button>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Automation / testnet</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight"><Bot className="size-7 text-primary" /> Autonomous agent</h1><p className="mt-2 max-w-2xl text-muted-foreground">Schedule policy-bound recurring transfers, keep human revocation controls, and publish verifiable receipts.</p></div>
        <Badge variant="outline" className="border-amber-300/25 text-amber-200"><LockKeyhole /> Testnet signer only</Badge>
      </div>
      <AgentControlCenter />
    </main>
  );
}
