import Link from "next/link";
import { Code2, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { WalletControl } from "@/components/wallet-control";

const navigation = [
  { href: "/start", label: "Start" },
  { href: "/demo", label: "Demo" },
  { href: "/activity", label: "Activity" },
  { href: "/hackathon", label: "Hackathon" },
  { href: "/docs", label: "Docs" },
];

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pawelszymansky111-cmyk/rulewallet";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-grid bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
            <a href={githubUrl} aria-label="GitHub repository">
              <Code2 />
            </a>
          </Button>
          <WalletControl compact />
          <details className="group relative lg:hidden">
            <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden" aria-label="Open navigation">
              <Menu className="size-4" />
            </summary>
            <nav className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-grid bg-card p-2 shadow-2xl" aria-label="Mobile navigation">
              {navigation.map((item) => <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{item.label}</Link>)}
              <Link href="/playground" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Playground</Link>
              <Link href="/security" className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Security</Link>
            </nav>
          </details>
          <Button asChild variant="ghost" className="hidden xl:inline-flex">
            <Link href="/app">Console</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
