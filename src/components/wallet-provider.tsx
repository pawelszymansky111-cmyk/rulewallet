"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi-config";
import { PolicyAccountProvider } from "@/components/policy-account-provider";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 12_000,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <PolicyAccountProvider>{children}</PolicyAccountProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
