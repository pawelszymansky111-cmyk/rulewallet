// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title RuleWalletPolicyAccount
/// @notice Testnet-first policy account for scoped agents and human approvers.
/// @dev This contract is non-upgradeable. It deliberately supports only native calls to
///      explicitly allowed targets and direct ERC-20 transfers. Router-specific swaps
///      require a separately audited adapter that can verify calldata and realized output.
contract RuleWalletPolicyAccount is AccessControlDefaultAdminRules, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant ADMIN_TRANSFER_DELAY = 2 days;
    uint256 public constant SPEND_BUCKET_SECONDS = 1 hours;
    /// @dev The current bucket plus the previous 24 buckets are retained so a
    ///      transaction can never fall out before it is a full 24 hours old.
    ///      This intentionally over-counts for at most one hour at the boundary.
    uint256 public constant SPEND_BUCKET_COUNT = 25;

    enum ActionKind {
        NativeCall,
        TokenTransfer
    }

    struct AssetPolicy {
        bool allowed;
        uint128 maxPerTransaction;
        uint128 maxRolling24Hours;
        uint128 approvalAbove;
    }

    struct ExecutionRequest {
        ActionKind kind;
        address agent;
        address target;
        address asset;
        uint128 amount;
        uint64 createdAt;
        uint64 expiresAt;
        uint32 approvals;
        uint16 declaredSlippageBps;
        bool executed;
        bool cancelled;
        bytes data;
    }

    error ZeroAddress();
    error PolicyInactive();
    error TargetNotAllowed(address target);
    error AssetNotAllowed(address asset);
    error TransactionLimitExceeded(address asset, uint256 amount, uint256 limit);
    error RollingLimitExceeded(address asset, uint256 projected, uint256 limit);
    error InvalidDeadline(uint256 deadline);
    error InvalidNonce(address agent, uint256 supplied, uint256 expected);
    error SlippageLimitExceeded(uint256 suppliedBps, uint256 limitBps);
    error InvalidApprovalThreshold();
    error RequestNotFound(uint256 requestId);
    error RequestAlreadyFinalized(uint256 requestId);
    error RequestExpired(uint256 requestId);
    error ApprovalAlreadyRecorded(uint256 requestId, address approver);
    error InsufficientApprovals(uint256 requestId, uint256 actual, uint256 required);
    error UnauthorizedCancellation(uint256 requestId, address caller);
    error ExternalCallFailed(bytes returnData);
    error InsufficientBalance(address asset, uint256 required, uint256 available);

    event FundsReceived(address indexed sender, uint256 amount);
    event PolicyStatusChanged(bool active, address indexed actor);
    event TargetPermissionChanged(address indexed target, bool allowed);
    event AssetPolicyChanged(
        address indexed asset, bool allowed, uint256 maxPerTransaction, uint256 maxRolling24Hours, uint256 approvalAbove
    );
    event SlippageLimitChanged(uint16 previousBps, uint16 newBps);
    event ApprovalThresholdChanged(uint8 previousThreshold, uint8 newThreshold);
    event RequestCreated(
        uint256 indexed requestId,
        ActionKind indexed kind,
        address indexed agent,
        address target,
        address asset,
        uint256 amount,
        uint256 expiresAt,
        uint16 declaredSlippageBps
    );
    event RequestApproved(uint256 indexed requestId, address indexed approver, uint256 approvals);
    event RequestCancelled(uint256 indexed requestId, address indexed actor);
    event RequestExecuted(
        uint256 indexed requestId,
        ActionKind indexed kind,
        address indexed actor,
        address target,
        address asset,
        uint256 amount,
        bytes32 dataHash
    );
    event EmergencyWithdrawal(address indexed asset, address indexed recipient, uint256 amount);

    bool public policyActive = true;
    uint8 public minimumApprovals;
    uint16 public maxDeclaredSlippageBps = 100;
    uint64 public maxRequestLifetime = 24 hours;
    uint256 public nextRequestId = 1;

    mapping(address asset => AssetPolicy policy) public assetPolicies;
    mapping(address target => bool allowed) public allowedTargets;
    mapping(address agent => uint256 nonce) public nextNonce;
    mapping(uint256 requestId => ExecutionRequest request) private _requests;
    mapping(uint256 requestId => mapping(address approver => bool approved)) public hasApproved;
    mapping(address asset => mapping(uint256 hourBucket => uint256 amount)) private _hourlySpend;

    constructor(
        address initialAdmin,
        address initialGuardian,
        address initialAgent,
        address[] memory initialApprovers,
        uint8 initialMinimumApprovals
    ) AccessControlDefaultAdminRules(uint48(ADMIN_TRANSFER_DELAY), initialAdmin) {
        if (initialAdmin == address(0) || initialGuardian == address(0) || initialAgent == address(0)) {
            revert ZeroAddress();
        }
        if (initialMinimumApprovals == 0 || initialMinimumApprovals > initialApprovers.length) {
            revert InvalidApprovalThreshold();
        }

        _grantRole(GUARDIAN_ROLE, initialGuardian);
        _grantRole(AGENT_ROLE, initialAgent);
        for (uint256 i = 0; i < initialApprovers.length; i++) {
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

    function rollingSpent(address asset) public view returns (uint256 spent) {
        uint256 currentBucket = block.timestamp / SPEND_BUCKET_SECONDS;
        for (uint256 i = 0; i < SPEND_BUCKET_COUNT; i++) {
            if (currentBucket < i) break;
            spent += _hourlySpend[asset][currentBucket - i];
        }
    }

    function setPolicyActive(bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        policyActive = active;
        emit PolicyStatusChanged(active, msg.sender);
    }

    function setTargetAllowed(address target, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (target == address(0)) revert ZeroAddress();
        allowedTargets[target] = allowed;
        emit TargetPermissionChanged(target, allowed);
    }

    function setAssetPolicy(
        address asset,
        bool allowed,
        uint128 maxPerTransaction,
        uint128 maxRolling24Hours,
        uint128 approvalAbove
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (
            allowed
                && (maxPerTransaction == 0
                    || maxRolling24Hours < maxPerTransaction
                    || approvalAbove > maxPerTransaction)
        ) revert TransactionLimitExceeded(asset, maxPerTransaction, maxRolling24Hours);

        assetPolicies[asset] = AssetPolicy({
            allowed: allowed,
            maxPerTransaction: maxPerTransaction,
            maxRolling24Hours: maxRolling24Hours,
            approvalAbove: approvalAbove
        });
        emit AssetPolicyChanged(asset, allowed, maxPerTransaction, maxRolling24Hours, approvalAbove);
    }

    function setMaxDeclaredSlippageBps(uint16 newLimitBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newLimitBps > 10_000) revert SlippageLimitExceeded(newLimitBps, 10_000);
        uint16 previous = maxDeclaredSlippageBps;
        maxDeclaredSlippageBps = newLimitBps;
        emit SlippageLimitChanged(previous, newLimitBps);
    }

    function setMinimumApprovals(uint8 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newThreshold == 0) revert InvalidApprovalThreshold();
        uint8 previous = minimumApprovals;
        minimumApprovals = newThreshold;
        emit ApprovalThresholdChanged(previous, newThreshold);
    }

    function setMaxRequestLifetime(uint64 newLifetime) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newLifetime < 5 minutes || newLifetime > 7 days) revert InvalidDeadline(newLifetime);
        maxRequestLifetime = newLifetime;
    }

    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
        emit PolicyStatusChanged(false, msg.sender);
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit PolicyStatusChanged(policyActive, msg.sender);
    }

    function requestNativeCall(
        address target,
        uint128 value,
        bytes calldata data,
        uint16 declaredSlippageBps,
        uint64 deadline,
        uint256 nonce
    ) external onlyRole(AGENT_ROLE) whenNotPaused nonReentrant returns (uint256 requestId) {
        _validateCommon(target, address(0), value, declaredSlippageBps, deadline, nonce);
        AssetPolicy memory policy = assetPolicies[address(0)];

        if (value <= policy.approvalAbove) {
            _recordSpend(address(0), value);
            _executeNative(target, value, data);
            emit RequestExecuted(0, ActionKind.NativeCall, msg.sender, target, address(0), value, keccak256(data));
            return 0;
        }

        requestId = _storeRequest(ActionKind.NativeCall, target, address(0), value, data, declaredSlippageBps, deadline);
    }

    function requestTokenTransfer(address token, address recipient, uint128 amount, uint64 deadline, uint256 nonce)
        external
        onlyRole(AGENT_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 requestId)
    {
        if (token == address(0)) revert ZeroAddress();
        _validateCommon(recipient, token, amount, 0, deadline, nonce);
        AssetPolicy memory policy = assetPolicies[token];

        if (amount <= policy.approvalAbove) {
            _recordSpend(token, amount);
            _executeToken(token, recipient, amount);
            emit RequestExecuted(0, ActionKind.TokenTransfer, msg.sender, recipient, token, amount, bytes32(0));
            return 0;
        }

        requestId = _storeRequest(ActionKind.TokenTransfer, recipient, token, amount, bytes(""), 0, deadline);
    }

    function approveRequest(uint256 requestId) external onlyRole(APPROVER_ROLE) {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        if (hasApproved[requestId][msg.sender]) {
            revert ApprovalAlreadyRecorded(requestId, msg.sender);
        }
        hasApproved[requestId][msg.sender] = true;
        pending.approvals += 1;
        emit RequestApproved(requestId, msg.sender, pending.approvals);
    }

    function executeApprovedRequest(uint256 requestId) external whenNotPaused nonReentrant {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        if (pending.approvals < minimumApprovals) {
            revert InsufficientApprovals(requestId, pending.approvals, minimumApprovals);
        }

        _validatePolicyAndLimits(pending.target, pending.asset, pending.amount, pending.declaredSlippageBps);
        pending.executed = true;
        _recordSpend(pending.asset, pending.amount);

        if (pending.kind == ActionKind.NativeCall) {
            _executeNative(pending.target, pending.amount, pending.data);
        } else {
            _executeToken(pending.asset, pending.target, pending.amount);
        }

        emit RequestExecuted(
            requestId, pending.kind, msg.sender, pending.target, pending.asset, pending.amount, keccak256(pending.data)
        );
    }

    function cancelRequest(uint256 requestId) external {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        bool authorized = msg.sender == pending.agent || hasRole(GUARDIAN_ROLE, msg.sender)
            || hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (!authorized) revert UnauthorizedCancellation(requestId, msg.sender);
        pending.cancelled = true;
        emit RequestCancelled(requestId, msg.sender);
    }

    function emergencyWithdrawNative(address payable recipient, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenPaused
        nonReentrant
    {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 available = address(this).balance;
        if (amount > available) revert InsufficientBalance(address(0), amount, available);
        (bool success, bytes memory result) = recipient.call{value: amount}("");
        if (!success) revert ExternalCallFailed(result);
        emit EmergencyWithdrawal(address(0), recipient, amount);
    }

    function emergencyWithdrawToken(address token, address recipient, uint256 amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenPaused
        nonReentrant
    {
        if (token == address(0) || recipient == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(recipient, amount);
        emit EmergencyWithdrawal(token, recipient, amount);
    }

    function _storeRequest(
        ActionKind kind,
        address target,
        address asset,
        uint128 amount,
        bytes memory data,
        uint16 declaredSlippageBps,
        uint64 deadline
    ) private returns (uint256 requestId) {
        requestId = nextRequestId++;
        _requests[requestId] = ExecutionRequest({
            kind: kind,
            agent: msg.sender,
            target: target,
            asset: asset,
            amount: amount,
            createdAt: uint64(block.timestamp),
            expiresAt: deadline,
            approvals: 0,
            declaredSlippageBps: declaredSlippageBps,
            executed: false,
            cancelled: false,
            data: data
        });
        emit RequestCreated(requestId, kind, msg.sender, target, asset, amount, deadline, declaredSlippageBps);
    }

    function _validateCommon(
        address target,
        address asset,
        uint128 amount,
        uint16 declaredSlippageBps,
        uint64 deadline,
        uint256 nonce
    ) private {
        uint256 expectedNonce = nextNonce[msg.sender];
        if (nonce != expectedNonce) revert InvalidNonce(msg.sender, nonce, expectedNonce);
        if (deadline < block.timestamp || deadline > block.timestamp + maxRequestLifetime) {
            revert InvalidDeadline(deadline);
        }
        _validatePolicyAndLimits(target, asset, amount, declaredSlippageBps);
        nextNonce[msg.sender] = expectedNonce + 1;
    }

    function _validatePolicyAndLimits(address target, address asset, uint256 amount, uint16 declaredSlippageBps)
        private
        view
    {
        if (!policyActive) revert PolicyInactive();
        if (!allowedTargets[target]) revert TargetNotAllowed(target);
        AssetPolicy memory policy = assetPolicies[asset];
        if (!policy.allowed) revert AssetNotAllowed(asset);
        if (amount > policy.maxPerTransaction) {
            revert TransactionLimitExceeded(asset, amount, policy.maxPerTransaction);
        }
        uint256 projected = rollingSpent(asset) + amount;
        if (projected > policy.maxRolling24Hours) {
            revert RollingLimitExceeded(asset, projected, policy.maxRolling24Hours);
        }
        if (declaredSlippageBps > maxDeclaredSlippageBps) {
            revert SlippageLimitExceeded(declaredSlippageBps, maxDeclaredSlippageBps);
        }
    }

    function _pendingRequest(uint256 requestId) private view returns (ExecutionRequest storage pending) {
        pending = _requests[requestId];
        if (pending.agent == address(0)) revert RequestNotFound(requestId);
        if (pending.executed || pending.cancelled) revert RequestAlreadyFinalized(requestId);
        if (pending.expiresAt < block.timestamp) revert RequestExpired(requestId);
    }

    function _recordSpend(address asset, uint256 amount) private {
        uint256 bucket = block.timestamp / SPEND_BUCKET_SECONDS;
        _hourlySpend[asset][bucket] += amount;
    }

    function _executeNative(address target, uint256 value, bytes memory data) private {
        uint256 available = address(this).balance;
        if (value > available) revert InsufficientBalance(address(0), value, available);
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) revert ExternalCallFailed(result);
    }

    function _executeToken(address token, address recipient, uint256 amount) private {
        uint256 available = IERC20(token).balanceOf(address(this));
        if (amount > available) revert InsufficientBalance(token, amount, available);
        IERC20(token).safeTransfer(recipient, amount);
    }
}
