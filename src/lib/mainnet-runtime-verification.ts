import { parseAbi } from "viem";
import { robinhoodMainnet } from "@/lib/chains";
import { getMainnetPublicClient } from "@/lib/mainnet-clients";
import { ROBINHOOD_MAINNET_USDG } from "@/lib/mainnet-registry";
import type { MainnetRuntimeVerification } from "@/lib/mainnet-safety";
import { mainnetSignerStatus, verifyMainnetSignerIdentity } from "@/lib/secure-agent-signer";
import { mainnetFactoryV3Address, verifyFactoryV3 } from "@/lib/v3-factory";

const erc20MetadataAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

/**
 * Runs the shared, fail-closed onchain and signer checks used by both health
 * reporting and the detailed mainnet status endpoint.
 */
export async function verifyMainnetRuntime() {
  const client = getMainnetPublicClient();
  const signer = mainnetSignerStatus();
  const [blockNumber, factoryVerification, usdgSymbol, usdgDecimals, signerIdentity] = await Promise.all([
    client.getBlockNumber().catch(() => undefined),
    mainnetFactoryV3Address
      ? verifyFactoryV3(client, mainnetFactoryV3Address, {
          chainId: robinhoodMainnet.id,
          canonicalStablecoin: ROBINHOOD_MAINNET_USDG,
        }).catch(() => undefined)
      : Promise.resolve(undefined),
    client.readContract({
      address: ROBINHOOD_MAINNET_USDG,
      abi: erc20MetadataAbi,
      functionName: "symbol",
    }).catch(() => undefined),
    client.readContract({
      address: ROBINHOOD_MAINNET_USDG,
      abi: erc20MetadataAbi,
      functionName: "decimals",
    }).catch(() => undefined),
    signer.configured ? verifyMainnetSignerIdentity().catch(() => undefined) : Promise.resolve(undefined),
  ]);
  const canonicalUsdgVerified = usdgSymbol === "USDG" && usdgDecimals === 6;
  const runtimeVerification: MainnetRuntimeVerification = {
    factoryVerified: factoryVerification?.verified ?? false,
    canonicalAssetVerified: canonicalUsdgVerified,
    signerIdentityVerified: Boolean(signerIdentity),
  };

  return {
    chainId: robinhoodMainnet.id,
    blockNumber,
    factoryAddress: mainnetFactoryV3Address,
    factoryVerification,
    canonicalUsdgVerified,
    canonicalUsdgDecimals: usdgDecimals,
    signer,
    signerIdentity,
    runtimeVerification,
  };
}
