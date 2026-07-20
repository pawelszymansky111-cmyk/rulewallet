import { mkdir, readFile, writeFile } from "node:fs/promises";
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

await mkdir(new URL("../src/generated/", import.meta.url), { recursive: true });

function immutableReferenceNames(forgeArtifact) {
  const references = forgeArtifact.deployedBytecode.immutableReferences ?? {};
  const names = {};
  for (const contract of forgeArtifact.ast?.nodes ?? []) {
    if (contract.nodeType !== "ContractDefinition") continue;
    for (const node of contract.nodes ?? []) {
      const id = String(node.id);
      if (node.nodeType === "VariableDeclaration" && node.mutability === "immutable" && references[id]) {
        names[node.name] = id;
      }
    }
  }
  return names;
}

for (const [forgeName, webName] of artifacts) {
  const forgeArtifact = JSON.parse(
    await readFile(new URL(`../contracts/out/${forgeName}`, import.meta.url), "utf8"),
  );
  await writeFile(
    new URL(`../src/generated/${webName}`, import.meta.url),
    `${JSON.stringify({
      abi: forgeArtifact.abi,
      bytecode: forgeArtifact.bytecode.object,
      runtimeBytecode: forgeArtifact.deployedBytecode.object,
      immutableReferences: forgeArtifact.deployedBytecode.immutableReferences ?? {},
      immutableReferenceNames: immutableReferenceNames(forgeArtifact),
      runtimeBytecodeHash: keccak256(forgeArtifact.deployedBytecode.object),
    })}\n`,
  );
}

console.log(`Generated ${artifacts.length} contract artifacts.`);
