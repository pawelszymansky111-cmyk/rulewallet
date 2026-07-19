import { isAddress, keccak256, parseAbi, zeroAddress, type Address, type Hex } from "viem";
import artifact from "@/generated/rulewallet-policy-account.json";

export const ruleWalletAbi = parseAbi([
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function AGENT_ROLE() view returns (bytes32)",
  "function GUARDIAN_ROLE() view returns (bytes32)",
  "function APPROVER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function policyActive() view returns (bool)",
  "function paused() view returns (bool)",
  "function minimumApprovals() view returns (uint8)",
  "function maxDeclaredSlippageBps() view returns (uint16)",
  "function nextNonce(address agent) view returns (uint256)",
  "function rollingSpent(address asset) view returns (uint256)",
  "function allowedTargets(address target) view returns (bool)",
  "function setTargetAllowed(address target, bool allowed)",
  "function assetPolicies(address asset) view returns (bool allowed, uint128 maxPerTransaction, uint128 maxRolling24Hours, uint128 approvalAbove)",
  "function requestNativeCall(address target, uint128 value, bytes data, uint16 declaredSlippageBps, uint64 deadline, uint256 nonce) returns (uint256 requestId)",
  "function approveRequest(uint256 requestId)",
  "function executeApprovedRequest(uint256 requestId)",
  "function pause()",
  "function unpause()",
  "event RequestCreated(uint256 indexed requestId, uint8 indexed kind, address indexed agent, address target, address asset, uint256 amount, uint256 expiresAt, uint16 declaredSlippageBps)",
  "event RequestApproved(uint256 indexed requestId, address indexed approver, uint256 approvals)",
  "event RequestExecuted(uint256 indexed requestId, uint8 indexed kind, address indexed actor, address target, address asset, uint256 amount, bytes32 dataHash)",
  "event TargetPermissionChanged(address indexed target, bool allowed)",
]);

const configuredAddress = process.env.NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS;

export const ruleWalletAddress: Address | undefined =
  configuredAddress && isAddress(configuredAddress)
    ? configuredAddress
    : undefined;

export const nativeAssetAddress = zeroAddress;

export const ruleWalletRuntimeBytecodeHash = artifact.runtimeBytecodeHash as Hex;

// The public beta account predates the current self-service deployment artifact.
// Keep its exact observed runtime hash pinned so existing explorer-backed receipts
// and strategies remain readable without accepting arbitrary contract bytecode.
export const publicBetaRuntimeBytecodeHash = "0x6820f0ca123c7d2e82b2ed913e3266f6899f955ec89d90da11d3506e230c9dad" as Hex;

export const supportedRuleWalletRuntimeBytecodeHashes = [
  ruleWalletRuntimeBytecodeHash,
  publicBetaRuntimeBytecodeHash,
] as const;

export function hasPinnedRuleWalletRuntime(bytecode: Hex | undefined) {
  if (!bytecode || bytecode === "0x") return false;
  const runtimeHash = keccak256(bytecode);
  return supportedRuleWalletRuntimeBytecodeHashes.some((expected) => expected === runtimeHash);
}
