import { formatUnits, getAddress, isAddress, parseAbi, parseUnits, zeroAddress, type Address } from "viem";

export const ROBINHOOD_MAINNET_CHAIN_ID = 4_663;
export const ROBINHOOD_MAINNET_USDG = getAddress("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168");
export const ROBINHOOD_MAINNET_WETH = getAddress("0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73");
export const ROBINHOOD_MAINNET_USDG_DECIMALS = 6;

export type MainnetAssetSymbol = "ETH" | "USDG";

export const canonicalMainnetAssets = {
  ETH: { address: zeroAddress, symbol: "ETH", decimals: 18 },
  USDG: { address: ROBINHOOD_MAINNET_USDG, symbol: "USDG", decimals: ROBINHOOD_MAINNET_USDG_DECIMALS },
} as const;

export function parseMainnetAssetUnits(value: string, asset: MainnetAssetSymbol) {
  return parseUnits(value, canonicalMainnetAssets[asset].decimals);
}

export function formatMainnetAssetUnits(value: bigint, asset: MainnetAssetSymbol) {
  return formatUnits(value, canonicalMainnetAssets[asset].decimals);
}

export function buildMainnetAssetPolicyArgs(
  asset: MainnetAssetSymbol,
  perTransaction: string,
  rolling24Hours: string,
  approvalAbove: string,
) {
  return [
    canonicalMainnetAssets[asset].address,
    true,
    parseMainnetAssetUnits(perTransaction, asset),
    parseMainnetAssetUnits(rolling24Hours, asset),
    approvalAbove.trim() ? parseMainnetAssetUnits(approvalAbove, asset) : BigInt(0),
  ] as const;
}

export const ruleWalletFactoryAbi = parseAbi([
  "function VERSION() view returns (string)",
  "function VERSION_HASH() view returns (bytes32)",
  "function canonicalStablecoin() view returns (address)",
  "function deploymentChainId() view returns (uint256)",
  "function accountVersion(address account) view returns (bytes32)",
  "function accountsOf(address owner) view returns (address[])",
  "function predictAccountAddress(address owner,address guardian,address agent,address[] approvers,uint8 minimumApprovals,bytes32 userSalt) view returns (address)",
  "function deployAccount(address guardian,address agent,address[] approvers,uint8 minimumApprovals,bytes32 userSalt) returns (address account)",
  "event PolicyAccountDeployed(address indexed owner,address indexed account,address indexed agent,address guardian,bytes32 versionHash,bytes32 userSalt)",
]);

export const ruleWalletV2Abi = parseAbi([
  "function OWNER_ROLE() view returns (bytes32)",
  "function AGENT_ROLE() view returns (bytes32)",
  "function APPROVER_ROLE() view returns (bytes32)",
  "function GUARDIAN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function canonicalStablecoin() view returns (address)",
  "function policyActive() view returns (bool)",
  "function paused() view returns (bool)",
  "function minimumApprovals() view returns (uint8)",
  "function trustedRecipients(address recipient) view returns (bool)",
  "function assetPolicies(address asset) view returns (bool allowed,uint128 maxPerTransaction,uint128 maxRolling24Hours,uint128 approvalAbove)",
  "function rollingSpent(address asset) view returns (uint256)",
  "function nextAgentNonce(address agent) view returns (uint256)",
  "function strategyStates(bytes32 digest) view returns (uint64 lastExecutedAt,uint32 executions,bool revoked)",
  "function strategyDigest((uint256 chainId,address account,address asset,address recipient,uint128 amount,uint64 nonce,uint64 expiry,uint32 intervalSeconds,uint32 maxExecutions) strategy) view returns (bytes32)",
  "function executeSignedStrategy((uint256 chainId,address account,address asset,address recipient,uint128 amount,uint64 nonce,uint64 expiry,uint32 intervalSeconds,uint32 maxExecutions) strategy,bytes ownerSignature,uint64 requestDeadline) returns (uint256 requestId)",
  "function setTrustedRecipient(address recipient,bool trusted)",
  "function setAssetPolicy(address asset,bool allowed,uint128 maxPerTransaction,uint128 maxRolling24Hours,uint128 approvalAbove)",
  "function setMinimumApprovals(uint8 newThreshold)",
  "function setPolicyActive(bool active)",
  "function pause()",
  "function unpause()",
  "function withdrawNative(address recipient,uint256 amount)",
  "function withdrawCanonicalStablecoin(address recipient,uint256 amount)",
  "function approveRequest(uint256 requestId)",
  "function executeApprovedRequest(uint256 requestId)",
  "function revokeStrategy(bytes32 digest)",
  "event RecipientPermissionChanged(address indexed recipient,bool trusted)",
  "event AssetPolicyChanged(address indexed asset,bool allowed,uint256 maxPerTransaction,uint256 maxRolling24Hours,uint256 approvalAbove)",
  "event RequestCreated(uint256 indexed requestId,uint8 indexed kind,address indexed agent,address recipient,address asset,uint256 amount,uint256 expiresAt,bytes32 strategyDigest)",
  "event RequestApproved(uint256 indexed requestId,address indexed approver,uint256 approvals)",
  "event RequestExecuted(uint256 indexed requestId,uint8 indexed kind,address indexed actor,address recipient,address asset,uint256 amount,bytes32 strategyDigest)",
  "event OwnerWithdrawal(address indexed asset,address indexed recipient,uint256 amount)",
  "error PolicyInactive()",
  "error RecipientNotTrusted(address recipient)",
  "error AssetNotAllowed(address asset)",
  "error TransactionLimitExceeded(address asset,uint256 amount,uint256 limit)",
  "error RollingLimitExceeded(address asset,uint256 projected,uint256 limit)",
  "error StrategyExpired(bytes32 digest)",
  "error StrategyIsRevoked(bytes32 digest)",
  "error StrategyExhausted(bytes32 digest)",
  "error StrategyNotReady(bytes32 digest,uint256 nextExecutionAt)",
]);

function configuredAddress(value: string | undefined): Address | undefined {
  return value && isAddress(value) ? getAddress(value) : undefined;
}

export const mainnetFactoryAddress = configuredAddress(
  process.env.NEXT_PUBLIC_RULEWALLET_MAINNET_FACTORY_ADDRESS,
);
export const mainnetSharedAccountAddress = configuredAddress(
  process.env.NEXT_PUBLIC_RULEWALLET_MAINNET_ACCOUNT_ADDRESS,
);

export const RULEWALLET_V2_VERSION = "2.1.0-security-beta";

export const experimentalMainnetUiEnabled =
  process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAINNET === "true";
