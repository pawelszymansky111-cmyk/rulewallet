import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex min-h-[65vh] max-w-4xl items-center justify-center px-5 py-16 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><Compass className="size-7" /></span>
          <p className="mt-6 font-mono text-xs tracking-[0.18em] text-primary uppercase">404 / route not found</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">This RuleWallet page does not exist.</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">No wallet action was attempted. Return to the launch page or open the guided demo.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild><Link href="/"><ArrowLeft /> Back home</Link></Button>
            <Button asChild variant="outline"><Link href="/demo">Open demo</Link></Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
