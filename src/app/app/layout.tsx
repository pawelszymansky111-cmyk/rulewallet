import { SiteHeader } from "@/components/site-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="border-b border-amber-400/15 bg-amber-400/[0.05] px-5 py-2 text-center text-xs text-amber-200">
        Robinhood Chain testnet only · Contract code is unaudited · Never deposit mainnet funds
      </div>
      {children}
    </div>
  );
}
