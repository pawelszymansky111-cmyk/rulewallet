import { readFile } from "node:fs/promises";
import process from "node:process";
import { keccak256 } from "viem";

const artifacts = [
  ["RuleWalletPolicyAccount.sol/RuleWalletPolicyAccount.json", "rulewallet-policy-account.json"],
  ["RuleWalletPolicyAccountV2.sol/RuleWalletPolicyAccountV2.json", "rulewallet-policy-account-v2.json"],
  ["RuleWalletFactory.sol/RuleWalletFactory.json", "rulewallet-factory.json"],
  ["RuleWalletPolicyAccountV3.sol/RuleWalletPolicyAccountV3.json", "rulewallet-policy-account-v3.json"],
  ["RuleWalletPolicyRegistryV3.sol/RuleWalletPolicyRegistryV3.json", "rulewallet-policy-registry-v3.json"],
  ["RuleWalletFactoryV3.sol/RuleWalletFactoryV3.json", "rulewallet-factory-v3.json"],
  ["RuleWalletAccountDeployerV3.sol/RuleWalletAccountDeployerV3.json", "rulewallet-account-deployer-v3.json"],
  ["RuleWalletPolicyRegistryDeployerV3.sol/RuleWalletPolicyRegistryDeployerV3.json", "rulewallet-registry-deployer-v3.json"],
  ["RuleWalletTestUSDG.sol/RuleWalletTestUSDG.json", "rulewallet-test-usdg.json"],
];

function immutableReferencesByName(forgeArtifact) {
  const references = forgeArtifact.deployedBytecode.immutableReferences ?? {};
  const namedReferences = {};
  for (const contract of forgeArtifact.ast?.nodes ?? []) {
    if (contract.nodeType !== "ContractDefinition") continue;
    for (const node of contract.nodes ?? []) {
      const id = String(node.id);
      if (node.nodeType === "VariableDeclaration" && node.mutability === "immutable" && references[id]) {
        namedReferences[node.name] = references[id];
      }
    }
  }
  return namedReferences;
}

for (const [forgeName, webName] of artifacts) {
  const [forgeArtifact, webArtifact] = await Promise.all([
    readFile(new URL(`../contracts/out/${forgeName}`, import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL(`../src/generated/${webName}`, import.meta.url), "utf8").then(JSON.parse),
  ]);
  const expected = JSON.stringify({
    abi: forgeArtifact.abi,
    bytecode: forgeArtifact.bytecode.object,
    runtimeBytecode: forgeArtifact.deployedBytecode.object,
    immutableReferences: immutableReferencesByName(forgeArtifact),
    runtimeBytecodeHash: keccak256(forgeArtifact.deployedBytecode.object),
  });
  if (JSON.stringify(webArtifact) !== expected) {
    console.error(`${webName} does not match the current Foundry build.`);
    process.exitCode = 1;
  } else {
    console.log(`${webName} matches the current Foundry build.`);
  }
}
