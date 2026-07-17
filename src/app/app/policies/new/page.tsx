import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PolicyBuilder } from "@/components/policy-builder";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Create policy" };

export default function NewPolicyPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground"><Link href="/app"><ArrowLeft /> Dashboard</Link></Button>
      <h1 className="text-3xl font-semibold tracking-tight">Create a scoped policy</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Start narrow. Increase an agent&apos;s authority only after its behavior is observable.</p>
      <div className="mt-8"><PolicyBuilder /></div>
    </main>
  );
}
