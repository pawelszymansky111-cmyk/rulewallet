import { isAddress, parseAbi, zeroAddress, type Address } from "viem";

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
