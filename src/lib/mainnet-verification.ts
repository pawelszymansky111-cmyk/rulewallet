import { keccak256, type Address, type PublicClient } from "viem";
import {
  ROBINHOOD_MAINNET_USDG,
  RULEWALLET_V2_VERSION,
  ruleWalletFactoryAbi,
} from "./mainnet-registry";
import { RULEWALLET_FACTORY_RUNTIME_CODE_HASH } from "./mainnet-factory-deployment";

export async function verifyPinnedMainnetFactory(client: PublicClient, factory: Address) {
  const [code, chainId, canonicalStablecoin, version] = await Promise.all([
    client.getCode({ address: factory }),
    client.readContract({ address: factory, abi: ruleWalletFactoryAbi, functionName: "deploymentChainId" }),
    client.readContract({ address: factory, abi: ruleWalletFactoryAbi, functionName: "canonicalStablecoin" }),
    client.readContract({ address: factory, abi: ruleWalletFactoryAbi, functionName: "VERSION" }),
  ]);
  const runtimeCodeHash = code && code !== "0x" ? keccak256(code) : undefined;
  return {
    verified:
      runtimeCodeHash === RULEWALLET_FACTORY_RUNTIME_CODE_HASH
      && chainId === BigInt(4663)
      && canonicalStablecoin === ROBINHOOD_MAINNET_USDG
      && version === RULEWALLET_V2_VERSION,
    runtimeCodeHash,
    chainId,
    canonicalStablecoin,
    version,
  } as const;
}
