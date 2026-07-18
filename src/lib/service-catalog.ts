export type ServiceCategory = "Exchange" | "Lending" | "Bridge" | "Perpetuals" | "Infrastructure";

export type EcosystemService = {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  website: string;
  source: string;
  permission: "adapter-required" | "read-only";
};

// Discovery metadata only. Contract targets are intentionally not embedded until a
// RuleWallet adapter constrains selectors, tokens, recipients, and minimum output.
export const ecosystemServices: EcosystemService[] = [
  {
    id: "uniswap",
    name: "Uniswap",
    category: "Exchange",
    description: "Public liquidity protocol listed in the Robinhood Chain ecosystem.",
    website: "https://app.uniswap.org/",
    source: "https://docs.robinhood.com/chain/",
    permission: "adapter-required",
  },
  {
    id: "morpho",
    name: "Morpho",
    category: "Lending",
    description: "Lending and borrowing protocol with Robinhood Chain support.",
    website: "https://app.morpho.org/",
    source: "https://docs.morpho.org/get-started/resources/addresses/",
    permission: "adapter-required",
  },
  {
    id: "stargate",
    name: "Stargate",
    category: "Bridge",
    description: "LayerZero-powered cross-chain asset route documented by Robinhood.",
    website: "https://stargate.finance/",
    source: "https://docs.robinhood.com/chain/bridging/",
    permission: "adapter-required",
  },
  {
    id: "transporter",
    name: "Transporter",
    category: "Bridge",
    description: "Chainlink CCIP interface for supported cross-chain transfers.",
    website: "https://app.transporter.io/",
    source: "https://docs.robinhood.com/chain/bridging/",
    permission: "adapter-required",
  },
  {
    id: "lighter",
    name: "Lighter",
    category: "Perpetuals",
    description: "Perpetuals venue listed in the official Robinhood Chain ecosystem.",
    website: "https://robinhoodchain.lighter.xyz/",
    source: "https://docs.robinhood.com/chain/",
    permission: "adapter-required",
  },
  {
    id: "allium",
    name: "Allium",
    category: "Infrastructure",
    description: "Onchain analytics provider; useful without granting spend permission.",
    website: "https://www.allium.so/",
    source: "https://docs.robinhood.com/chain/",
    permission: "read-only",
  },
];
