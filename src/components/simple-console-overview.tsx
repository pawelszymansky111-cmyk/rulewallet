import Link from "next/link";
import { ArrowRight, BookUser, Bot, CirclePlay, Eye, ShieldCheck, WalletCards } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tasks = [
  { icon: CirclePlay, title: "See how it works", text: "Follow the public demo before connecting or signing.", href: "/demo", action: "Start demo" },
  { icon: WalletCards, title: "Create a test wallet", text: "Deploy a personal testnet policy account with guided wallet prompts.", href: "/app/deploy", action: "Open setup" },
  { icon: BookUser, title: "Choose who can receive", text: "Save a familiar label, verify the address, then enable it onchain.", href: "/app/services", action: "Trusted recipients" },
  { icon: Bot, title: "Turn on bounded automation", text: "Create one small recurring strategy only after limits and recipients are ready.", href: "/app/agent", action: "Agent setup" },
] as const;

export function SimpleConsoleOverview() {
  return (
    <div className="mt-8 space-y-6">
      <Alert className="border-primary/20 bg-primary/[0.04]"><ShieldCheck /><AlertTitle>Simple mode keeps the safe order visible</AlertTitle><AlertDescription>Demo first, configure recipients and limits second, fund last. Switch to Pro mode in the header for raw requests, policy state, and advanced controls.</AlertDescription></Alert>
      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((task, index) => {
          const Icon = task.icon;
          return <Card key={task.title}><CardHeader className="gap-4 sm:grid sm:grid-cols-[44px_1fr]"><span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/[0.06] text-primary"><Icon className="size-5" /></span><div><p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">Step {index + 1}</p><CardTitle className="mt-1">{task.title}</CardTitle><CardDescription className="mt-2 leading-6">{task.text}</CardDescription><Button asChild variant="outline" className="mt-4"><Link href={task.href}>{task.action} <ArrowRight /></Link></Button></div></CardHeader></Card>;
        })}
      </div>
      <Card className="border-grid bg-card/60"><CardHeader><Eye className="mb-2 size-5 text-primary" /><CardTitle>Nothing moves without a wallet prompt</CardTitle><CardDescription>RuleWallet may prepare and simulate a transaction, but the connected wallet remains responsible for showing and signing it.</CardDescription></CardHeader></Card>
    </div>
  );
}
