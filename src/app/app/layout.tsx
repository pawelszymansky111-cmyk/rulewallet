import { SiteHeader } from "@/components/site-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="border-b border-amber-500/20 bg-amber-50 px-5 py-2 text-center text-xs text-amber-800">
        This console is the Robinhood Chain testnet V1 demo · Experimental mainnet V2 is isolated at /mainnet
      </div>
      {children}
    </div>
  );
}
