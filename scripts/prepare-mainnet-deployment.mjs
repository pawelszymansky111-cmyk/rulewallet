import { readFile } from "node:fs/promises";
import { encodeDeployData, keccak256 } from "viem";

const artifact = JSON.parse(
  await readFile(new URL("../src/generated/rulewallet-factory.json", import.meta.url), "utf8"),
);
const chainId = 4663;
const canonicalUsdg = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
const calldata = encodeDeployData({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [BigInt(chainId), canonicalUsdg],
});

console.log(JSON.stringify({
  network: "Robinhood Chain mainnet",
  chainId,
  transactionType: "contract creation",
  to: null,
  valueWei: "0",
  constructor: {
    signature: "constructor(uint256 expectedChainId,address canonicalStablecoinAddress)",
    args: [String(chainId), canonicalUsdg],
  },
  calldata,
  calldataHash: keccak256(calldata),
  expectedResult: {
    contract: "RuleWalletFactory",
    version: "2.1.0-security-beta",
    deploymentChainId: String(chainId),
    canonicalStablecoin: canonicalUsdg,
  },
  warning: "PREPARATION ONLY. Do not broadcast before an explicit human review and hardware-wallet signature.",
}, null, 2));
