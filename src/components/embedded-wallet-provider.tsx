"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chains";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyClientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

export function EmbeddedWalletProvider({ children }: { children: React.ReactNode }) {
  if (!privyAppId) return children;

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId}
      config={{
        loginMethods: ["passkey", "email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#16a34a",
          showWalletLoginFirst: false,
        },
        defaultChain: robinhoodTestnet,
        supportedChains: [robinhoodTestnet, robinhoodMainnet],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
export function embeddedWalletsConfigured() {
  return Boolean(privyAppId);
}
