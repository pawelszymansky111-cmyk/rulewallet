import Image from "next/image";
import Link from "next/link";

export function BrandMark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5"
      aria-label="RuleWallet home"
    >
      <Image
        src="/brand/rulewallet-3d.png"
        alt=""
        width={36}
        height={36}
        priority
        className="size-9 shrink-0 rounded-xl border border-primary/20 object-cover shadow-sm transition-transform duration-200 group-hover:scale-[1.04]"
      />
      <span className="text-[15px] font-semibold tracking-[-0.025em] text-foreground">
        RuleWallet
      </span>
    </Link>
  );
}
