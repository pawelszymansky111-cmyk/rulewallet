import { defineChain } from "viem";

export const robinhoodTestnet = defineChain({
  id: 46_630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.chain.robinhood.com"],
      webSocket: ["wss://feed.testnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Testnet Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

export const robinhoodMainnetReference = {
  id: 4_663,
  name: "Robinhood Chain",
  explorer: "https://robinhoodchain.blockscout.com",
} as const;
