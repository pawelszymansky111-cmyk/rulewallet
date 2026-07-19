import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL ?? "https://github.com/pawelszymansky111-cmyk/rulewallet";
const xUrl = process.env.NEXT_PUBLIC_X_URL;

export function SiteFooter() {
  return (
    <footer className="border-t border-grid bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="space-y-3">
          <BrandMark />
          <p>Open source. Experimental and unaudited. Not affiliated with Robinhood.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3" aria-label="Footer navigation">
          <Link href="/start" className="hover:text-foreground">Start</Link>
          <Link href="/demo" className="hover:text-foreground">Guided demo</Link>
          <Link href="/hackathon" className="hover:text-foreground">Hackathon</Link>
          <Link href="/activity" className="hover:text-foreground">Activity</Link>
          <Link href="/mainnet" className="hover:text-foreground">Mainnet lab</Link>
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <Link href="/security" className="hover:text-foreground">Security</Link>
          <Link href="/playground" className="hover:text-foreground">Playground</Link>
          <a href="/app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-foreground">Console <ExternalLink className="size-3" /></a>
          <a href={githubUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          {xUrl && <a href={xUrl} target="_blank" rel="noreferrer" className="hover:text-foreground">X</a>}
        </nav>
      </div>
    </footer>
  );
}
