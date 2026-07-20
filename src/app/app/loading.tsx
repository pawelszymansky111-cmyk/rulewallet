import { LoaderCircle } from "lucide-react";

export default function ConsoleLoading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8" aria-live="polite">
      <div className="h-48 animate-pulse rounded-[1.75rem] border border-primary/15 bg-card/70" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-grid bg-card/60" />)}
      </div>
      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" /> Reading live testnet state…</div>
    </main>
  );
}
