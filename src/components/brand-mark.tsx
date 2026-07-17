import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="RuleWallet home">
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-lg border border-primary/30 bg-primary/10 font-mono text-sm font-bold text-primary">
        R/
        <span className="absolute inset-x-1 bottom-0 h-px bg-primary/70" />
      </span>
      <span className="font-semibold tracking-tight">RuleWallet</span>
    </Link>
  );
}
