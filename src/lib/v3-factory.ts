import factoryArtifact from "../generated/rulewallet-factory-v3.json";
import accountDeployerArtifact from "../generated/rulewallet-account-deployer-v3.json";
import registryDeployerArtifact from "../generated/rulewallet-registry-deployer-v3.json";
import {
  getAddress,
  getContractAddress,
  isAddress,
  keccak256,
  numberToHex,
  padHex,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

export const RULEWALLET_V3_VERSION = "3.0.0-commerce-beta";
export const ruleWalletFactoryV3Abi = factoryArtifact.abi as Abi;
export const ruleWalletFactoryV3Bytecode = factoryArtifact.bytecode as Hex;

type ImmutableReference = { start: number; length: number };
type ImmutableReferences = Record<string, ImmutableReference[]>;
type ImmutableReferenceNames = Record<string, string>;

const factoryReferences = factoryArtifact.immutableReferences as ImmutableReferences;
const accountDeployerReferences = accountDeployerArtifact.immutableReferences as ImmutableReferences;
const factoryReferenceNames = factoryArtifact.immutableReferenceNames as ImmutableReferenceNames;
const accountDeployerReferenceNames = accountDeployerArtifact.immutableReferenceNames as ImmutableReferenceNames;

const factoryImmutableIds = {
  canonicalStablecoin: factoryReferenceNames.canonicalStablecoin,
  deploymentChainId: factoryReferenceNames.deploymentChainId,
  accountDeployer: factoryReferenceNames.accountDeployer,
  registryDeployer: factoryReferenceNames.registryDeployer,
} as const;
const accountDeployerFactoryImmutableId = accountDeployerReferenceNames.factory;

function replaceImmutable(runtime: Hex, references: ImmutableReference[], value: Hex) {
  let code = runtime.slice(2);
  for (const reference of references) {
    if (reference.length !== 32) throw new Error("Unexpected V3 immutable width.");
    const encoded = padHex(value, { size: reference.length }).slice(2);
    const start = reference.start * 2;
    code = `${code.slice(0, start)}${encoded}${code.slice(start + reference.length * 2)}`;
  }
  return `0x${code}` as Hex;
}

function requiredReferences(references: ImmutableReferences, id: string | undefined) {
  if (!id) throw new Error("Generated artifact is missing an immutable reference name.");
  const value = references[id];
  if (!value?.length) throw new Error(`Missing pinned immutable reference ${id}.`);
  return value;
}

export function v3HelperAddresses(factory: Address) {
  return {
    registryDeployer: getContractAddress({ from: factory, nonce: BigInt(1) }),
    accountDeployer: getContractAddress({ from: factory, nonce: BigInt(2) }),
  } as const;
}

export function buildExpectedFactoryV3Runtime(input: {
  factory: Address;
  chainId: number;
  canonicalStablecoin: Address;
}) {
  const helpers = v3HelperAddresses(input.factory);
  let runtime = factoryArtifact.runtimeBytecode as Hex;
  runtime = replaceImmutable(
    runtime,
    requiredReferences(factoryReferences, factoryImmutableIds.canonicalStablecoin),
    input.canonicalStablecoin,
  );
  runtime = replaceImmutable(
    runtime,
    requiredReferences(factoryReferences, factoryImmutableIds.deploymentChainId),
    numberToHex(input.chainId),
  );
  runtime = replaceImmutable(
    runtime,
    requiredReferences(factoryReferences, factoryImmutableIds.accountDeployer),
    helpers.accountDeployer,
  );
  runtime = replaceImmutable(
    runtime,
    requiredReferences(factoryReferences, factoryImmutableIds.registryDeployer),
    helpers.registryDeployer,
  );
  return { runtime, runtimeHash: keccak256(runtime), ...helpers } as const;
}

export function buildExpectedAccountDeployerV3Runtime(factory: Address) {
  const runtime = replaceImmutable(
    accountDeployerArtifact.runtimeBytecode as Hex,
    requiredReferences(accountDeployerReferences, accountDeployerFactoryImmutableId),
    factory,
  );
  return { runtime, runtimeHash: keccak256(runtime) } as const;
}

export async function verifyFactoryV3(
  client: PublicClient,
  factory: Address,
  expected: { chainId: number; canonicalStablecoin: Address },
) {
  const pinned = buildExpectedFactoryV3Runtime({
    factory,
    chainId: expected.chainId,
    canonicalStablecoin: expected.canonicalStablecoin,
  });
  const pinnedAccountDeployer = buildExpectedAccountDeployerV3Runtime(factory);
  const [factoryCode, accountDeployerCode, registryDeployerCode, version, chainId, stablecoin] =
    await Promise.all([
      client.getCode({ address: factory }),
      client.getCode({ address: pinned.accountDeployer }),
      client.getCode({ address: pinned.registryDeployer }),
      client.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "VERSION" }),
      client.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "deploymentChainId" }),
      client.readContract({ address: factory, abi: ruleWalletFactoryV3Abi, functionName: "canonicalStablecoin" }),
    ]);
  const factoryRuntimeHash = factoryCode && factoryCode !== "0x" ? keccak256(factoryCode) : undefined;
  const accountDeployerRuntimeHash =
    accountDeployerCode && accountDeployerCode !== "0x" ? keccak256(accountDeployerCode) : undefined;
  const registryDeployerRuntimeHash =
    registryDeployerCode && registryDeployerCode !== "0x" ? keccak256(registryDeployerCode) : undefined;
  const verified =
    factoryRuntimeHash === pinned.runtimeHash &&
    accountDeployerRuntimeHash === pinnedAccountDeployer.runtimeHash &&
    registryDeployerRuntimeHash === registryDeployerArtifact.runtimeBytecodeHash &&
    version === RULEWALLET_V3_VERSION &&
    chainId === BigInt(expected.chainId) &&
    String(stablecoin).toLowerCase() === expected.canonicalStablecoin.toLowerCase();
  return {
    verified,
    version: String(version),
    chainId: BigInt(chainId as bigint),
    canonicalStablecoin: getAddress(String(stablecoin)),
    factoryRuntimeHash,
    accountDeployerRuntimeHash,
    registryDeployerRuntimeHash,
    expectedFactoryRuntimeHash: pinned.runtimeHash,
    expectedAccountDeployerRuntimeHash: pinnedAccountDeployer.runtimeHash,
    expectedRegistryDeployerRuntimeHash: registryDeployerArtifact.runtimeBytecodeHash as Hex,
    accountDeployer: pinned.accountDeployer,
    registryDeployer: pinned.registryDeployer,
  } as const;
}

function configuredAddress(value: string | undefined) {
  return value && isAddress(value) ? getAddress(value) : undefined;
}

export const testnetFactoryV3Address = configuredAddress(
  process.env.NEXT_PUBLIC_RULEWALLET_TESTNET_V3_FACTORY_ADDRESS,
);
export const testnetV3StablecoinAddress = configuredAddress(
  process.env.NEXT_PUBLIC_RULEWALLET_TESTNET_STABLECOIN_ADDRESS,
);
export const mainnetFactoryV3Address = configuredAddress(
  process.env.NEXT_PUBLIC_RULEWALLET_MAINNET_V3_FACTORY_ADDRESS,
);
