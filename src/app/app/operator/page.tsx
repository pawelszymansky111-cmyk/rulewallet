import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { V3OperatorSetup } from "@/components/v3-operator-setup";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "V3 operator deployment" };

export default function OperatorPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6"><Link href="/app"><ArrowLeft /> Back to console</Link></Button>
      <div className="mb-8"><p className="eyebrow">Technical console · operator</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Deploy the V3 platform contracts</h1><p className="mt-3 max-w-3xl text-muted-foreground">Prepare the shared testnet or mainnet factory without a raw key, automatic broadcast, or hidden constructor argument.</p></div>
      <V3OperatorSetup />
    </main>
  );
}
