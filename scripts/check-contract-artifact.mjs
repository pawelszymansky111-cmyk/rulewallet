import { readFile } from "node:fs/promises";
import process from "node:process";
import { keccak256 } from "viem";

const artifacts = [
  ["RuleWalletPolicyAccount.sol/RuleWalletPolicyAccount.json", "rulewallet-policy-account.json"],
  ["RuleWalletPolicyAccountV2.sol/RuleWalletPolicyAccountV2.json", "rulewallet-policy-account-v2.json"],
  ["RuleWalletFactory.sol/RuleWalletFactory.json", "rulewallet-factory.json"],
];

for (const [forgeName, webName] of artifacts) {
  const [forgeArtifact, webArtifact] = await Promise.all([
    readFile(new URL(`../contracts/out/${forgeName}`, import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL(`../src/generated/${webName}`, import.meta.url), "utf8").then(JSON.parse),
  ]);
  const expected = JSON.stringify({
    abi: forgeArtifact.abi,
    bytecode: forgeArtifact.bytecode.object,
    runtimeBytecodeHash: keccak256(forgeArtifact.deployedBytecode.object),
  });
  if (JSON.stringify(webArtifact) !== expected) {
    console.error(`${webName} does not match the current Foundry build.`);
    process.exitCode = 1;
  } else {
    console.log(`${webName} matches the current Foundry build.`);
  }
}
