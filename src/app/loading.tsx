import { LoaderCircle, ShieldCheck } from "lucide-react";

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[62vh] max-w-7xl items-center justify-center px-5 py-16" aria-live="polite">
      <div className="launch-shell w-full max-w-lg rounded-3xl border border-primary/20 bg-card/85 p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"><ShieldCheck className="size-6" /></span>
        <h1 className="mt-5 text-xl font-semibold">Preparing RuleWallet</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading the interface without requesting a wallet signature.</p>
        <LoaderCircle className="mx-auto mt-5 size-5 animate-spin text-primary" />
      </div>
    </main>
  );
}
