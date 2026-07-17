import type { Metadata } from "next";
import { PolicyPlayground } from "@/components/policy-playground";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Policy playground",
  description: "Test RuleWallet policies against safe, review, and blocked agent transaction scenarios.",
};

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-14 lg:px-8 lg:py-20">
        <Badge variant="outline" className="border-primary/25 text-primary">Interactive demo</Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Break the policy before an agent does.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">Change the request or load an unsafe scenario. The evaluator returns deterministic evidence for every decision.</p>
        <div className="mt-10"><PolicyPlayground /></div>
      </main>
      <SiteFooter />
    </div>
  );
}
