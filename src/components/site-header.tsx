"use client";

import Link from "next/link";
import { ExternalLink, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ExperienceModeToggle } from "@/components/experience-mode-toggle";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { Button } from "@/components/ui/button";
import { WalletControl } from "@/components/wallet-control";

const navigation = [
  { href: "/command", simple: "Command center", pro: "Command center" },
  { href: "/start", simple: "How it works", pro: "Onboarding" },
  { href: "/demo", simple: "Try demo", pro: "Demo" },
  { href: "/activity", simple: "What happened", pro: "Activity" },
  { href: "/approvals", simple: "Approvals", pro: "Approval queue" },
  { href: "/docs", simple: "Learn", pro: "Docs" },
] as const;

const xUrl = process.env.NEXT_PUBLIC_X_URL ?? "https://x.com/rulewallet";

export function SiteHeader() {
  const { mode } = useExperienceMode();

  return (
    <header className="sticky top-0 z-40 border-b border-primary/20 bg-background/94 shadow-[0_5px_24px_oklch(0.35_0.08_145/0.07)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <BrandMark />
        <nav
          className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-primary/20 hover:bg-primary/[0.055] hover:text-primary"
            >
              {item[mode]}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ExperienceModeToggle className="hidden sm:flex" />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={xUrl} target="_blank" rel="noreferrer" aria-label="RuleWallet on X">X</a>
          </Button>
          <WalletControl compact />
          <details className="group relative lg:hidden">
            <summary
              className="grid size-9 cursor-pointer list-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </summary>
            <nav
              className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-primary/25 bg-card p-2 shadow-2xl"
              aria-label="Mobile navigation"
            >
              <ExperienceModeToggle className="mb-2 w-full justify-between" />
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {item[mode]}
                </Link>
              ))}
              <Link
                href="/playground"
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {mode === "simple" ? "Try simulator" : "Playground"}
              </Link>
              <a
                href="/app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/10"
              >
                Open console <ExternalLink className="size-3" />
              </a>
              <a
                href={xUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                RuleWallet on X
              </a>
            </nav>
          </details>
          <Button asChild variant="ghost" className="hidden xl:inline-flex">
            <a href="/app" target="_blank" rel="noreferrer">
              Console <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
