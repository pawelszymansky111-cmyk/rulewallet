import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = walletConnectProjectId
  ? [
      injected({ shimDisconnect: true }),
      walletConnect({
        projectId: walletConnectProjectId,
        showQrModal: true,
        metadata: {
          name: "RuleWallet",
          description: "Policy controls for bounded onchain agents",
          url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          icons: [],
        },
      }),
    ]
  : [injected({ shimDisconnect: true })];

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet, robinhoodMainnet],
  connectors,
  ssr: true,
  transports: {
    [robinhoodTestnet.id]: http(`/api/rpc?chainId=${robinhoodTestnet.id}`, {
      batch: true,
      retryCount: 2,
    }),
    [robinhoodMainnet.id]: http(`/api/rpc?chainId=${robinhoodMainnet.id}`, {
      batch: true,
      retryCount: 2,
    }),
  },
});
