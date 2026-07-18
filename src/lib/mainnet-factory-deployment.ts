import factoryArtifact from "../generated/rulewallet-factory.json";
import {
  encodeDeployData,
  getAddress,
  getContractAddress,
  keccak256,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { ROBINHOOD_MAINNET_USDG } from "./mainnet-registry";

export const ROBINHOOD_MAINNET_CHAIN_ID = 4663;
export const RULEWALLET_FACTORY_VERSION = "2.0.0-experimental";
export const RULEWALLET_FACTORY_INIT_CODE_HASH =
  "0xa878628ad64c1f77bdb0a6fb2550ed0cc543ae0a25de446dad335e53557c2445" as const;

export const ruleWalletFactoryDeploymentAbi = factoryArtifact.abi as Abi;
export const ruleWalletFactoryBytecode = factoryArtifact.bytecode as Hex;

export function buildMainnetFactoryDeployment(deployer: Address, nonce: bigint) {
  const normalizedDeployer = getAddress(deployer);
  const data = encodeDeployData({
    abi: ruleWalletFactoryDeploymentAbi,
    bytecode: ruleWalletFactoryBytecode,
    args: [BigInt(ROBINHOOD_MAINNET_CHAIN_ID), ROBINHOOD_MAINNET_USDG],
  });

  return {
    chainId: ROBINHOOD_MAINNET_CHAIN_ID,
    deployer: normalizedDeployer,
    nonce,
    to: undefined,
    value: BigInt(0),
    data,
    dataHash: keccak256(data),
    predictedAddress: getContractAddress({ from: normalizedDeployer, nonce }),
    expectedVersion: RULEWALLET_FACTORY_VERSION,
    canonicalStablecoin: ROBINHOOD_MAINNET_USDG,
  } as const;
}
