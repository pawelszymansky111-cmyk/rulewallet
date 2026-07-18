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
export const RULEWALLET_FACTORY_VERSION = "2.1.0-security-beta";
export const RULEWALLET_FACTORY_INIT_CODE_HASH =
  "0x62100ea86a79ac148a08a5897cd8227aeb95e8da6a2dcaef573876047a6dd2df" as const;
export const RULEWALLET_FACTORY_RUNTIME_CODE_HASH =
  "0x852fd105d0cbf2c8d740f896cbab0059151989d47736e9522b1759d9e4ce4a16" as const;

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
