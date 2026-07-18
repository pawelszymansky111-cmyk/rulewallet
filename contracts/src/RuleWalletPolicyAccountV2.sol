// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title RuleWalletPolicyAccountV2
/// @notice Non-upgradeable policy account for bounded, owner-authorized direct transfers.
/// @dev Agents can transfer only native ETH or the immutable canonical stablecoin. The
///      contract intentionally has no arbitrary-call, approval, swap, router, or bridge path.
contract RuleWalletPolicyAccountV2 is AccessControlDefaultAdminRules, EIP712, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant STRATEGY_TYPEHASH = keccak256(
        "Strategy(uint256 chainId,address account,address asset,address recipient,uint128 amount,uint64 nonce,uint64 expiry,uint32 intervalSeconds,uint32 maxExecutions)"
    );
    uint256 public constant ADMIN_TRANSFER_DELAY = 2 days;
    uint256 public constant SPEND_BUCKET_SECONDS = 1 hours;
    uint256 public constant SPEND_BUCKET_COUNT = 25;
    uint32 public constant MIN_STRATEGY_INTERVAL = 5 minutes;

    enum ActionKind {
        NativeTransfer,
        TokenTransfer
    }

    struct AssetPolicy {
        bool allowed;
        uint128 maxPerTransaction;
        uint128 maxRolling24Hours;
        uint128 approvalAbove;
    }

    struct Strategy {
        uint256 chainId;
        address account;
        address asset;
        address recipient;
        uint128 amount;
        uint64 nonce;
        uint64 expiry;
        uint32 intervalSeconds;
        uint32 maxExecutions;
    }

    struct StrategyState {
        uint64 lastExecutedAt;
        uint32 executions;
        bool revoked;
    }

    struct ExecutionRequest {
        ActionKind kind;
        address agent;
        address recipient;
        address asset;
        uint128 amount;
        uint64 createdAt;
        uint64 expiresAt;
        uint32 approvals;
        bool executed;
        bool cancelled;
        bytes32 strategyDigest;
    }

    error ZeroAddress();
    error UnsupportedAsset(address asset);
    error PolicyInactive();
    error RecipientNotTrusted(address recipient);
    error AssetNotAllowed(address asset);
    error InvalidAssetPolicy(address asset);
    error TransactionLimitExceeded(address asset, uint256 amount, uint256 limit);
    error RollingLimitExceeded(address asset, uint256 projected, uint256 limit);
    error InvalidDeadline(uint256 deadline);
    error InvalidNonce(address agent, uint256 supplied, uint256 expected);
    error InvalidApprovalThreshold();
    error RequestNotFound(uint256 requestId);
    error RequestAlreadyFinalized(uint256 requestId);
    error RequestExpired(uint256 requestId);
    error ApprovalAlreadyRecorded(uint256 requestId, address approver);
    error InsufficientApprovals(uint256 requestId, uint256 actual, uint256 required);
    error UnauthorizedCancellation(uint256 requestId, address caller);
    error TransferFailed(bytes returnData);
    error InsufficientBalance(address asset, uint256 required, uint256 available);
    error InvalidStrategyChain(uint256 supplied, uint256 expected);
    error InvalidStrategyAccount(address supplied, address expected);
    error InvalidStrategySigner(address signer);
    error InvalidStrategyInterval(uint256 supplied);
    error StrategyExpired(bytes32 digest);
    error StrategyIsRevoked(bytes32 digest);
    error StrategyExhausted(bytes32 digest);
    error StrategyNotReady(bytes32 digest, uint256 nextExecutionAt);
    error StrategyNonceConflict(address owner, uint64 nonce, bytes32 expected, bytes32 supplied);

    event FundsReceived(address indexed sender, uint256 amount);
    event PolicyStatusChanged(bool active, address indexed actor);
    event RecipientPermissionChanged(address indexed recipient, bool trusted);
    event AssetPolicyChanged(
        address indexed asset, bool allowed, uint256 maxPerTransaction, uint256 maxRolling24Hours, uint256 approvalAbove
    );
    event ApprovalThresholdChanged(uint8 previousThreshold, uint8 newThreshold);
    event RequestCreated(
        uint256 indexed requestId,
        ActionKind indexed kind,
        address indexed agent,
        address recipient,
        address asset,
        uint256 amount,
        uint256 expiresAt,
        bytes32 strategyDigest
    );
    event RequestApproved(uint256 indexed requestId, address indexed approver, uint256 approvals);
    event RequestCancelled(uint256 indexed requestId, address indexed actor);
    event RequestExecuted(
        uint256 indexed requestId,
        ActionKind indexed kind,
        address indexed actor,
        address recipient,
        address asset,
        uint256 amount,
        bytes32 strategyDigest
    );
    event StrategyActivated(bytes32 indexed digest, address indexed owner, uint64 indexed nonce);
    event StrategyRevoked(bytes32 indexed digest, address indexed actor);
    event OwnerWithdrawal(address indexed asset, address indexed recipient, uint256 amount);

    address public immutable canonicalStablecoin;
    bool public policyActive = true;
    uint8 public minimumApprovals;
    uint64 public maxRequestLifetime = 24 hours;
    uint256 public nextRequestId = 1;

    mapping(address asset => AssetPolicy policy) public assetPolicies;
    mapping(address recipient => bool trusted) public trustedRecipients;
    mapping(address agent => uint256 nonce) public nextAgentNonce;
    mapping(uint256 requestId => ExecutionRequest request) private _requests;
    mapping(uint256 requestId => mapping(address approver => bool approved)) public hasApproved;
    mapping(address asset => mapping(uint256 hourBucket => uint256 amount)) private _hourlySpend;
    mapping(bytes32 digest => StrategyState state) public strategyStates;
    mapping(address owner => mapping(uint64 nonce => bytes32 digest)) public strategyDigestByNonce;

    constructor(
        address initialOwner,
        address initialGuardian,
        address initialAgent,
        address[] memory initialApprovers,
        uint8 initialMinimumApprovals,
        address canonicalStablecoinAddress
    ) AccessControlDefaultAdminRules(uint48(ADMIN_TRANSFER_DELAY), initialOwner) EIP712("RuleWallet", "2") {
        if (
            initialOwner == address(0) || initialGuardian == address(0) || initialAgent == address(0)
                || canonicalStablecoinAddress == address(0)
        ) revert ZeroAddress();
        if (initialMinimumApprovals == 0 || initialMinimumApprovals > initialApprovers.length) {
            revert InvalidApprovalThreshold();
        }

        canonicalStablecoin = canonicalStablecoinAddress;
        _grantRole(OWNER_ROLE, initialOwner);
        _grantRole(GUARDIAN_ROLE, initialGuardian);
        _grantRole(AGENT_ROLE, initialAgent);
        for (uint256 i; i < initialApprovers.length; ++i) {
            if (initialApprovers[i] == address(0)) revert ZeroAddress();
            _grantRole(APPROVER_ROLE, initialApprovers[i]);
        }
        minimumApprovals = initialMinimumApprovals;
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    function request(uint256 requestId) external view returns (ExecutionRequest memory) {
        ExecutionRequest storage stored = _requests[requestId];
        if (stored.agent == address(0)) revert RequestNotFound(requestId);
        return stored;
    }

    function strategyDigest(Strategy calldata strategy) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    STRATEGY_TYPEHASH,
                    strategy.chainId,
                    strategy.account,
                    strategy.asset,
                    strategy.recipient,
                    strategy.amount,
                    strategy.nonce,
                    strategy.expiry,
                    strategy.intervalSeconds,
                    strategy.maxExecutions
                )
            )
        );
    }

    function rollingSpent(address asset) public view returns (uint256 spent) {
        uint256 currentBucket = block.timestamp / SPEND_BUCKET_SECONDS;
        for (uint256 i; i < SPEND_BUCKET_COUNT; ++i) {
            if (currentBucket < i) break;
            spent += _hourlySpend[asset][currentBucket - i];
        }
    }

    function setPolicyActive(bool active) external onlyRole(OWNER_ROLE) {
        policyActive = active;
        emit PolicyStatusChanged(active, msg.sender);
    }

    function setTrustedRecipient(address recipient, bool trusted) external onlyRole(OWNER_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        trustedRecipients[recipient] = trusted;
        emit RecipientPermissionChanged(recipient, trusted);
    }

    function setAssetPolicy(
        address asset,
        bool allowed,
        uint128 maxPerTransaction,
        uint128 maxRolling24Hours,
        uint128 approvalAbove
    ) external onlyRole(OWNER_ROLE) {
        _validateSupportedAsset(asset);
        if (
            allowed
                && (maxPerTransaction == 0
                    || maxRolling24Hours < maxPerTransaction
                    || (approvalAbove != 0 && approvalAbove > maxPerTransaction))
        ) revert InvalidAssetPolicy(asset);

        assetPolicies[asset] = AssetPolicy(allowed, maxPerTransaction, maxRolling24Hours, approvalAbove);
        emit AssetPolicyChanged(asset, allowed, maxPerTransaction, maxRolling24Hours, approvalAbove);
    }

    function setMinimumApprovals(uint8 newThreshold) external onlyRole(OWNER_ROLE) {
        if (newThreshold == 0) revert InvalidApprovalThreshold();
        uint8 previous = minimumApprovals;
        minimumApprovals = newThreshold;
        emit ApprovalThresholdChanged(previous, newThreshold);
    }

    function setMaxRequestLifetime(uint64 newLifetime) external onlyRole(OWNER_ROLE) {
        if (newLifetime < 5 minutes || newLifetime > 7 days) revert InvalidDeadline(newLifetime);
        maxRequestLifetime = newLifetime;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit PolicyStatusChanged(false, msg.sender);
    }

    function unpause() external onlyRole(OWNER_ROLE) {
        _unpause();
        emit PolicyStatusChanged(policyActive, msg.sender);
    }

    function requestNativeTransfer(address recipient, uint128 amount, uint64 deadline, uint256 nonce)
        external
        onlyRole(AGENT_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 requestId)
    {
        requestId = _requestTransfer(recipient, address(0), amount, deadline, nonce, bytes32(0));
    }

    function requestTokenTransfer(address recipient, uint128 amount, uint64 deadline, uint256 nonce)
        external
        onlyRole(AGENT_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 requestId)
    {
        requestId = _requestTransfer(recipient, canonicalStablecoin, amount, deadline, nonce, bytes32(0));
    }

    function executeSignedStrategy(Strategy calldata strategy, bytes calldata ownerSignature, uint64 requestDeadline)
        external
        onlyRole(AGENT_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 requestId)
    {
        bytes32 digest = strategyDigest(strategy);
        if (strategy.chainId != block.chainid) revert InvalidStrategyChain(strategy.chainId, block.chainid);
        if (strategy.account != address(this)) revert InvalidStrategyAccount(strategy.account, address(this));
        if (strategy.expiry < block.timestamp) revert StrategyExpired(digest);
        if (strategy.intervalSeconds < MIN_STRATEGY_INTERVAL) revert InvalidStrategyInterval(strategy.intervalSeconds);
        if (strategy.maxExecutions == 0) revert StrategyExhausted(digest);

        address signer = ECDSA.recover(digest, ownerSignature);
        if (!hasRole(OWNER_ROLE, signer)) revert InvalidStrategySigner(signer);

        bytes32 boundDigest = strategyDigestByNonce[signer][strategy.nonce];
        if (boundDigest == bytes32(0)) {
            strategyDigestByNonce[signer][strategy.nonce] = digest;
            emit StrategyActivated(digest, signer, strategy.nonce);
        } else if (boundDigest != digest) {
            revert StrategyNonceConflict(signer, strategy.nonce, boundDigest, digest);
        }

        StrategyState storage state = strategyStates[digest];
        if (state.revoked) revert StrategyIsRevoked(digest);
        if (state.executions >= strategy.maxExecutions) revert StrategyExhausted(digest);
        uint256 nextExecutionAt = uint256(state.lastExecutedAt) + strategy.intervalSeconds;
        if (state.lastExecutedAt != 0 && block.timestamp < nextExecutionAt) {
            revert StrategyNotReady(digest, nextExecutionAt);
        }

        state.lastExecutedAt = uint64(block.timestamp);
        state.executions += 1;
        requestId = _requestTransfer(
            strategy.recipient, strategy.asset, strategy.amount, requestDeadline, nextAgentNonce[msg.sender], digest
        );
    }

    function revokeStrategy(bytes32 digest) external onlyRole(OWNER_ROLE) {
        strategyStates[digest].revoked = true;
        emit StrategyRevoked(digest, msg.sender);
    }

    function approveRequest(uint256 requestId) external onlyRole(APPROVER_ROLE) {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        if (hasApproved[requestId][msg.sender]) revert ApprovalAlreadyRecorded(requestId, msg.sender);
        hasApproved[requestId][msg.sender] = true;
        pending.approvals += 1;
        emit RequestApproved(requestId, msg.sender, pending.approvals);
    }

    function executeApprovedRequest(uint256 requestId) external whenNotPaused nonReentrant {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        if (pending.approvals < minimumApprovals) {
            revert InsufficientApprovals(requestId, pending.approvals, minimumApprovals);
        }
        _validatePolicyAndLimits(pending.recipient, pending.asset, pending.amount);
        pending.executed = true;
        _recordSpend(pending.asset, pending.amount);
        _executeTransfer(pending.asset, pending.recipient, pending.amount);
        emit RequestExecuted(
            requestId,
            pending.kind,
            msg.sender,
            pending.recipient,
            pending.asset,
            pending.amount,
            pending.strategyDigest
        );
    }

    function cancelRequest(uint256 requestId) external {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        bool authorized =
            msg.sender == pending.agent || hasRole(GUARDIAN_ROLE, msg.sender) || hasRole(OWNER_ROLE, msg.sender);
        if (!authorized) revert UnauthorizedCancellation(requestId, msg.sender);
        pending.cancelled = true;
        emit RequestCancelled(requestId, msg.sender);
    }

    /// @notice Owner withdrawals are never subject to agent policy limits.
    /// @dev This is an explicit owner-wallet transaction and cannot be called by an agent or backend.
    function withdrawNative(address payable recipient, uint256 amount) external onlyRole(OWNER_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 available = address(this).balance;
        if (amount > available) revert InsufficientBalance(address(0), amount, available);
        (bool success, bytes memory result) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed(result);
        emit OwnerWithdrawal(address(0), recipient, amount);
    }

    function withdrawCanonicalStablecoin(address recipient, uint256 amount) external onlyRole(OWNER_ROLE) nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        IERC20(canonicalStablecoin).safeTransfer(recipient, amount);
        emit OwnerWithdrawal(canonicalStablecoin, recipient, amount);
    }

    function _requestTransfer(
        address recipient,
        address asset,
        uint128 amount,
        uint64 deadline,
        uint256 nonce,
        bytes32 signedStrategyDigest
    ) private returns (uint256 requestId) {
        uint256 expectedNonce = nextAgentNonce[msg.sender];
        if (nonce != expectedNonce) revert InvalidNonce(msg.sender, nonce, expectedNonce);
        if (deadline < block.timestamp || deadline > block.timestamp + maxRequestLifetime) {
            revert InvalidDeadline(deadline);
        }
        _validatePolicyAndLimits(recipient, asset, amount);
        nextAgentNonce[msg.sender] = expectedNonce + 1;

        AssetPolicy memory policy = assetPolicies[asset];
        if (policy.approvalAbove == 0 || amount <= policy.approvalAbove) {
            _recordSpend(asset, amount);
            _executeTransfer(asset, recipient, amount);
            emit RequestExecuted(
                0,
                asset == address(0) ? ActionKind.NativeTransfer : ActionKind.TokenTransfer,
                msg.sender,
                recipient,
                asset,
                amount,
                signedStrategyDigest
            );
            return 0;
        }

        requestId = nextRequestId++;
        _requests[requestId] = ExecutionRequest({
            kind: asset == address(0) ? ActionKind.NativeTransfer : ActionKind.TokenTransfer,
            agent: msg.sender,
            recipient: recipient,
            asset: asset,
            amount: amount,
            createdAt: uint64(block.timestamp),
            expiresAt: deadline,
            approvals: 0,
            executed: false,
            cancelled: false,
            strategyDigest: signedStrategyDigest
        });
        emit RequestCreated(
            requestId,
            asset == address(0) ? ActionKind.NativeTransfer : ActionKind.TokenTransfer,
            msg.sender,
            recipient,
            asset,
            amount,
            deadline,
            signedStrategyDigest
        );
    }

    function _validatePolicyAndLimits(address recipient, address asset, uint256 amount) private view {
        if (!policyActive) revert PolicyInactive();
        if (!trustedRecipients[recipient]) revert RecipientNotTrusted(recipient);
        _validateSupportedAsset(asset);
        AssetPolicy memory policy = assetPolicies[asset];
        if (!policy.allowed) revert AssetNotAllowed(asset);
        if (amount > policy.maxPerTransaction) {
            revert TransactionLimitExceeded(asset, amount, policy.maxPerTransaction);
        }
        uint256 projected = rollingSpent(asset) + amount;
        if (projected > policy.maxRolling24Hours) {
            revert RollingLimitExceeded(asset, projected, policy.maxRolling24Hours);
        }
    }

    function _validateSupportedAsset(address asset) private view {
        if (asset != address(0) && asset != canonicalStablecoin) revert UnsupportedAsset(asset);
    }

    function _pendingRequest(uint256 requestId) private view returns (ExecutionRequest storage pending) {
        pending = _requests[requestId];
        if (pending.agent == address(0)) revert RequestNotFound(requestId);
        if (pending.executed || pending.cancelled) revert RequestAlreadyFinalized(requestId);
        if (pending.expiresAt < block.timestamp) revert RequestExpired(requestId);
    }

    function _recordSpend(address asset, uint256 amount) private {
        _hourlySpend[asset][block.timestamp / SPEND_BUCKET_SECONDS] += amount;
    }

    function _executeTransfer(address asset, address recipient, uint256 amount) private {
        if (asset == address(0)) {
            uint256 nativeAvailable = address(this).balance;
            if (amount > nativeAvailable) revert InsufficientBalance(asset, amount, nativeAvailable);
            (bool success, bytes memory result) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed(result);
            return;
        }

        uint256 available = IERC20(asset).balanceOf(address(this));
        if (amount > available) revert InsufficientBalance(asset, amount, available);
        IERC20(asset).safeTransfer(recipient, amount);
    }
}
