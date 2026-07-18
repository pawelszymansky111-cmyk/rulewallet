import Link from "next/link";

export function BrandMark() {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5"
      aria-label="RuleWallet home"
    >
      <svg
        viewBox="0 0 64 64"
        className="size-9 shrink-0 text-primary transition-transform duration-200 group-hover:scale-[1.04]"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="16"
          className="fill-primary/8 stroke-primary/40"
          strokeWidth="2"
        />
        <path
          d="M20 46V18H32C39.2 18 44 22 44 28C44 34 39.2 38 32 38H20M32 38L44 46"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.025em] text-foreground">
        RuleWallet
      </span>
    </Link>
  );
}
