import { readFile } from "node:fs/promises";
import process from "node:process";

const forgeArtifactUrl = new URL(
  "../contracts/out/RuleWalletPolicyAccount.sol/RuleWalletPolicyAccount.json",
  import.meta.url,
);
const webArtifactUrl = new URL(
  "../src/generated/rulewallet-policy-account.json",
  import.meta.url,
);

const [forgeArtifact, webArtifact] = await Promise.all([
  readFile(forgeArtifactUrl, "utf8").then(JSON.parse),
  readFile(webArtifactUrl, "utf8").then(JSON.parse),
]);

const expected = JSON.stringify({
  abi: forgeArtifact.abi,
  bytecode: forgeArtifact.bytecode.object,
});
const actual = JSON.stringify(webArtifact);

if (actual !== expected) {
  console.error(
    "Generated web deployment artifact does not match the current Foundry build.",
  );
  process.exitCode = 1;
} else {
  console.log("Web deployment artifact matches the current Foundry build.");
}
