import { mkdir, readFile, writeFile } from "node:fs/promises";

const artifacts = [
  ["RuleWalletPolicyAccount.sol/RuleWalletPolicyAccount.json", "rulewallet-policy-account.json"],
  ["RuleWalletPolicyAccountV2.sol/RuleWalletPolicyAccountV2.json", "rulewallet-policy-account-v2.json"],
  ["RuleWalletFactory.sol/RuleWalletFactory.json", "rulewallet-factory.json"],
];

await mkdir(new URL("../src/generated/", import.meta.url), { recursive: true });

for (const [forgeName, webName] of artifacts) {
  const forgeArtifact = JSON.parse(
    await readFile(new URL(`../contracts/out/${forgeName}`, import.meta.url), "utf8"),
  );
  await writeFile(
    new URL(`../src/generated/${webName}`, import.meta.url),
    `${JSON.stringify({ abi: forgeArtifact.abi, bytecode: forgeArtifact.bytecode.object })}\n`,
  );
}

console.log(`Generated ${artifacts.length} contract artifacts.`);
