import Link from "next/link";
import { Code2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { WalletControl } from "@/components/wallet-control";

const navigation = [
  { href: "/activity", label: "Activity" },
  { href: "/playground", label: "Playground" },
  { href: "/docs", label: "Docs" },
  { href: "/security", label: "Security" },
];

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pawelszymansky111-cmyk/rulewallet";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-grid bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <BrandMark />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Primary navigation">
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
          <Button asChild variant="ghost" className="hidden lg:inline-flex">
            <Link href="/app">Console</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
