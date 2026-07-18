import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pawelszymansky111-cmyk/rulewallet";

export function SiteFooter() {
  return (
    <footer className="border-t border-grid bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="space-y-3">
          <BrandMark />
          <p>Open-source testnet software. Not affiliated with Robinhood Markets.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer navigation">
          <Link href="/demo" className="hover:text-foreground">Guided demo</Link>
          <Link href="/activity" className="hover:text-foreground">Activity</Link>
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <Link href="/security" className="hover:text-foreground">Security</Link>
          <Link href="/playground" className="hover:text-foreground">Playground</Link>
          <a href={githubUrl} className="hover:text-foreground">GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
