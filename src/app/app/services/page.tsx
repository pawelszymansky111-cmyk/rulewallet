import type { Metadata } from "next";
import { ServiceDirectory } from "@/components/service-directory";

export const metadata: Metadata = { title: "Trusted addresses & services" };

export default function ServicesPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">Policy account / permissions</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Trusted addresses & services</h1>
        <p className="mt-3 text-muted-foreground">Build a personal recipient allowlist, verify every onchain permission, and discover services that need dedicated adapters before autonomous use.</p>
      </div>
      <div className="mt-8"><ServiceDirectory /></div>
    </main>
  );
}
