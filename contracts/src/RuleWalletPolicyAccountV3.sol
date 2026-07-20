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
import {RuleWalletPolicyRegistryV3} from "./RuleWalletPolicyRegistryV3.sol";

interface IRuleWalletPolicyRegistryDeployerV3 {
    function deploy(address canonicalStablecoin) external returns (RuleWalletPolicyRegistryV3 registry);
}

/// @title RuleWalletPolicyAccountV3
/// @notice Non-upgradeable funds account for policy-bounded agent commerce.
/// @dev Transfers are limited to native ETH and one immutable canonical stablecoin.
contract RuleWalletPolicyAccountV3 is AccessControlDefaultAdminRules, EIP712, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    bytes32 public constant STRATEGY_TYPEHASH = keccak256(
        "Strategy(uint256 chainId,address account,address asset,address recipient,uint128 amount,uint8 category,bytes32 intentHash,uint64 nonce,uint64 expiry,uint32 intervalSeconds,uint32 maxExecutions)"
    );
    bytes32 public constant APPROVAL_TYPEHASH = keccak256(
        "Approval(uint256 chainId,address account,uint256 requestId,address approver,uint256 nonce,uint64 expiry)"
    );
    uint256 public constant ADMIN_TRANSFER_DELAY = 2 days;
    uint32 public constant MIN_STRATEGY_INTERVAL = 5 minutes;

    enum ActionKind {
        NativeTransfer,
        TokenTransfer
    }

    struct Strategy {
        uint256 chainId;
        address account;
        address asset;
        address recipient;
        uint128 amount;
        uint8 category;
        bytes32 intentHash;
        uint64 nonce;
        uint64 expiry;
        uint32 intervalSeconds;
        uint32 maxExecutions;
    }

    struct Approval {
        uint256 chainId;
        address account;
        uint256 requestId;
        address approver;
        uint256 nonce;
        uint64 expiry;
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
        uint8 category;
        bytes32 intentHash;
        uint64 createdAt;
        uint64 expiresAt;
        uint32 approvals;
        bool executed;
        bool cancelled;
        bytes32 strategyDigest;
        uint64 strategyExpiry;
    }

    error ZeroAddress();
    error PolicyInactive();
    error InvalidDeadline(uint256 deadline);
    error InvalidNonce(address signer, uint256 supplied, uint256 expected);
    error InvalidApprovalThreshold();
    error InvalidApprovalAuthorization();
    error RequestNotFound(uint256 requestId);
    error RequestAlreadyFinalized(uint256 requestId);
    error RequestExpired(uint256 requestId);
    error ApprovalAlreadyRecorded(uint256 requestId, address approver);
    error InsufficientApprovals(uint256 requestId, uint256 actual, uint256 required);
    error UnauthorizedCancellation(uint256 requestId, address caller);
    error UnauthorizedPause(address caller);
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
    error OperationalRoleCollision(address account, bytes32 requestedRole);
    error DuplicateApprover(address approver);
    error ApprovalThresholdExceedsActiveApprovers(uint256 threshold, uint256 activeApprovers);
    error RequestAgentNoLongerAuthorized(uint256 requestId, address agent);

    event FundsReceived(address indexed sender, uint256 amount);
    event PolicyStatusChanged(bool active, address indexed actor);
    event ApprovalThresholdChanged(uint8 previousThreshold, uint8 newThreshold);
    event RequestCreated(
        uint256 indexed requestId,
        ActionKind indexed kind,
        address indexed agent,
        address recipient,
        address asset,
        uint256 amount,
        uint8 category,
        bytes32 intentHash,
        uint256 expiresAt,
        bytes32 strategyDigest
    );
    event RequestApproved(uint256 indexed requestId, address indexed approver, uint256 approvals);
    event RequestRejected(uint256 indexed requestId, address indexed approver);
    event RequestCancelled(uint256 indexed requestId, address indexed actor);
    event RequestExecuted(
        uint256 indexed requestId,
        ActionKind indexed kind,
        address indexed actor,
        address recipient,
        address asset,
        uint256 amount,
        uint8 category,
        bytes32 intentHash,
        bytes32 strategyDigest
    );
    event StrategyActivated(bytes32 indexed digest, address indexed owner, uint64 indexed nonce);
    event StrategyRevoked(bytes32 indexed digest, address indexed actor);
    event AgentSessionsRevoked(address indexed actor, uint256 count);
    event OwnerWithdrawal(address indexed asset, address indexed recipient, uint256 amount);

    address public immutable canonicalStablecoin;
    RuleWalletPolicyRegistryV3 public immutable policyRegistry;
    bool public policyActive = true;
    uint8 public minimumApprovals;
    uint64 public maxRequestLifetime = 24 hours;
    uint256 public nextRequestId = 1;
    uint256 public activeApproverCount;

    mapping(address agent => uint256 nonce) public nextAgentNonce;
    mapping(address approver => uint256 nonce) public nextApprovalNonce;
    mapping(uint256 requestId => ExecutionRequest request) private _requests;
    mapping(uint256 requestId => mapping(address approver => bool approved)) public hasApproved;
    mapping(uint256 requestId => address[] approvers) private _requestApprovers;
    mapping(bytes32 digest => StrategyState state) public strategyStates;
    mapping(address owner => mapping(uint64 nonce => bytes32 digest)) public strategyDigestByNonce;
    address[] private _activeAgents;
    mapping(address agent => uint256 indexPlusOne) private _activeAgentIndex;

    constructor(
        address initialOwner,
        address initialGuardian,
        address initialAgent,
        address[] memory initialApprovers,
        uint8 initialMinimumApprovals,
        address canonicalStablecoinAddress,
        address registryDeployer
    ) AccessControlDefaultAdminRules(uint48(ADMIN_TRANSFER_DELAY), initialOwner) EIP712("RuleWallet", "3") {
        if (
            initialOwner == address(0) || initialGuardian == address(0) || initialAgent == address(0)
                || canonicalStablecoinAddress == address(0)
        ) revert ZeroAddress();
        if (initialMinimumApprovals == 0 || initialMinimumApprovals > initialApprovers.length) {
            revert InvalidApprovalThreshold();
        }

        _requireDistinctOperationalRole(initialOwner, OWNER_ROLE);
        _requireDistinctOperationalRole(initialGuardian, GUARDIAN_ROLE);
        _requireDistinctOperationalRole(initialAgent, AGENT_ROLE);

        canonicalStablecoin = canonicalStablecoinAddress;
        if (registryDeployer == address(0)) revert ZeroAddress();
        policyRegistry = IRuleWalletPolicyRegistryDeployerV3(registryDeployer).deploy(canonicalStablecoinAddress);
        _grantRole(OWNER_ROLE, initialOwner);
        _grantRole(GUARDIAN_ROLE, initialGuardian);
        _grantRole(AGENT_ROLE, initialAgent);
        for (uint256 i; i < initialApprovers.length; ++i) {
            if (initialApprovers[i] == address(0)) revert ZeroAddress();
            _requireDistinctOperationalRole(initialApprovers[i], APPROVER_ROLE);
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
                    strategy.category,
                    strategy.intentHash,
                    strategy.nonce,
                    strategy.expiry,
                    strategy.intervalSeconds,
                    strategy.maxExecutions
                )
            )
        );
    }

    function approvalDigest(Approval calldata approval) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(
                abi.encode(
                    APPROVAL_TYPEHASH,
                    approval.chainId,
                    approval.account,
                    approval.requestId,
                    approval.approver,
                    approval.nonce,
                    approval.expiry
                )
            )
        );
    }

    function setPolicyActive(bool active) external onlyRole(OWNER_ROLE) {
        policyActive = active;
        emit PolicyStatusChanged(active, msg.sender);
    }

    function setMinimumApprovals(uint8 newThreshold) external onlyRole(OWNER_ROLE) {
        if (newThreshold == 0) revert InvalidApprovalThreshold();
        if (newThreshold > activeApproverCount) {
            revert ApprovalThresholdExceedsActiveApprovers(newThreshold, activeApproverCount);
        }
        uint8 previous = minimumApprovals;
        minimumApprovals = newThreshold;
        emit ApprovalThresholdChanged(previous, newThreshold);
    }

    function setMaxRequestLifetime(uint64 newLifetime) external onlyRole(OWNER_ROLE) {
        if (newLifetime < 5 minutes || newLifetime > 7 days) revert InvalidDeadline(newLifetime);
        maxRequestLifetime = newLifetime;
    }

    function grantRole(bytes32 role, address account) public override {
        if (role == OWNER_ROLE || role == AGENT_ROLE || role == APPROVER_ROLE || role == GUARDIAN_ROLE) {
            _requireDistinctOperationalRole(account, role);
        }
        super.grantRole(role, account);
    }

    function revokeAgentSessions(address[] calldata agents) external onlyRole(OWNER_ROLE) {
        uint256 revoked;
        for (uint256 i; i < agents.length; ++i) {
            if (_revokeRole(AGENT_ROLE, agents[i])) ++revoked;
        }
        emit AgentSessionsRevoked(msg.sender, revoked);
    }

    /// @notice Returns every address that currently holds AGENT_ROLE so owners can revoke all sessions atomically.
    function activeAgents() external view returns (address[] memory agents) {
        agents = _activeAgents;
    }

    function pause() external {
        if (!hasRole(GUARDIAN_ROLE, msg.sender) && !hasRole(OWNER_ROLE, msg.sender)) {
            revert UnauthorizedPause(msg.sender);
        }
        _pause();
        emit PolicyStatusChanged(false, msg.sender);
    }

    function unpause() external onlyRole(OWNER_ROLE) {
        _unpause();
        emit PolicyStatusChanged(policyActive, msg.sender);
    }

    function requestNativeTransfer(
        address recipient,
        uint128 amount,
        uint8 category,
        bytes32 intentHash,
        uint64 deadline,
        uint256 nonce
    ) external onlyRole(AGENT_ROLE) whenNotPaused nonReentrant returns (uint256 requestId) {
        requestId = _requestTransfer(
            recipient, address(0), amount, category, intentHash, deadline, nonce, bytes32(0), 0
        );
    }

    function requestTokenTransfer(
        address recipient,
        uint128 amount,
        uint8 category,
        bytes32 intentHash,
        uint64 deadline,
        uint256 nonce
    ) external onlyRole(AGENT_ROLE) whenNotPaused nonReentrant returns (uint256 requestId) {
        requestId = _requestTransfer(
            recipient, canonicalStablecoin, amount, category, intentHash, deadline, nonce, bytes32(0), 0
        );
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
        requestId = _requestSignedStrategyTransfer(strategy, requestDeadline, digest);
    }

    function revokeStrategy(bytes32 digest) external onlyRole(OWNER_ROLE) {
        strategyStates[digest].revoked = true;
        emit StrategyRevoked(digest, msg.sender);
    }

    function approveRequest(uint256 requestId) external onlyRole(APPROVER_ROLE) {
        _recordApproval(requestId, msg.sender);
    }

    function approveRequestWithSignature(Approval calldata approval, bytes calldata signature) external {
        if (
            approval.chainId != block.chainid || approval.account != address(this) || approval.expiry < block.timestamp
                || approval.nonce != nextApprovalNonce[approval.approver]
        ) revert InvalidApprovalAuthorization();
        address signer = ECDSA.recover(approvalDigest(approval), signature);
        if (signer != approval.approver || !hasRole(APPROVER_ROLE, signer)) {
            revert InvalidApprovalAuthorization();
        }
        nextApprovalNonce[signer] = approval.nonce + 1;
        _recordApproval(approval.requestId, signer);
    }

    function rejectRequest(uint256 requestId) external onlyRole(APPROVER_ROLE) {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        pending.cancelled = true;
        emit RequestRejected(requestId, msg.sender);
    }

    function executeApprovedRequest(uint256 requestId) external whenNotPaused nonReentrant {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        if (!hasRole(AGENT_ROLE, pending.agent)) {
            revert RequestAgentNoLongerAuthorized(requestId, pending.agent);
        }
        if (pending.strategyDigest != bytes32(0)) {
            if (strategyStates[pending.strategyDigest].revoked) revert StrategyIsRevoked(pending.strategyDigest);
            if (pending.strategyExpiry < block.timestamp) revert StrategyExpired(pending.strategyDigest);
        }
        uint256 activeApprovals = _activeApprovalCount(requestId);
        if (activeApprovals < minimumApprovals) {
            revert InsufficientApprovals(requestId, activeApprovals, minimumApprovals);
        }
        _requireActivePolicy();
        policyRegistry.validateAndRecordPayment(pending.recipient, pending.asset, pending.amount, pending.category);
        pending.executed = true;
        _executeTransfer(pending.asset, pending.recipient, pending.amount);
        emit RequestExecuted(
            requestId,
            pending.kind,
            msg.sender,
            pending.recipient,
            pending.asset,
            pending.amount,
            pending.category,
            pending.intentHash,
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
        uint8 category,
        bytes32 intentHash,
        uint64 deadline,
        uint256 nonce,
        bytes32 signedStrategyDigest,
        uint64 signedStrategyExpiry
    ) private returns (uint256 requestId) {
        _requireActivePolicy();
        uint256 expectedNonce = nextAgentNonce[msg.sender];
        if (nonce != expectedNonce) revert InvalidNonce(msg.sender, nonce, expectedNonce);
        if (deadline < block.timestamp || deadline > block.timestamp + maxRequestLifetime) {
            revert InvalidDeadline(deadline);
        }
        bool requiresApproval = policyRegistry.validatePayment(recipient, asset, amount, category);
        nextAgentNonce[msg.sender] = expectedNonce + 1;

        if (!requiresApproval) {
            policyRegistry.validateAndRecordPayment(recipient, asset, amount, category);
            _executeTransfer(asset, recipient, amount);
            emit RequestExecuted(
                0,
                asset == address(0) ? ActionKind.NativeTransfer : ActionKind.TokenTransfer,
                msg.sender,
                recipient,
                asset,
                amount,
                category,
                intentHash,
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
            category: category,
            intentHash: intentHash,
            createdAt: uint64(block.timestamp),
            expiresAt: deadline,
            approvals: 0,
            executed: false,
            cancelled: false,
            strategyDigest: signedStrategyDigest,
            strategyExpiry: signedStrategyExpiry
        });
        emit RequestCreated(
            requestId,
            asset == address(0) ? ActionKind.NativeTransfer : ActionKind.TokenTransfer,
            msg.sender,
            recipient,
            asset,
            amount,
            category,
            intentHash,
            deadline,
            signedStrategyDigest
        );
    }

    function _requestSignedStrategyTransfer(Strategy calldata strategy, uint64 requestDeadline, bytes32 digest)
        private
        returns (uint256 requestId)
    {
        requestId = _requestTransfer(
            strategy.recipient,
            strategy.asset,
            strategy.amount,
            strategy.category,
            strategy.intentHash,
            requestDeadline,
            nextAgentNonce[msg.sender],
            digest,
            strategy.expiry
        );
    }

    function _recordApproval(uint256 requestId, address approver) private {
        ExecutionRequest storage pending = _pendingRequest(requestId);
        if (hasApproved[requestId][approver]) revert ApprovalAlreadyRecorded(requestId, approver);
        hasApproved[requestId][approver] = true;
        _requestApprovers[requestId].push(approver);
        pending.approvals += 1;
        emit RequestApproved(requestId, approver, pending.approvals);
    }

    function _pendingRequest(uint256 requestId) private view returns (ExecutionRequest storage pending) {
        pending = _requests[requestId];
        if (pending.agent == address(0)) revert RequestNotFound(requestId);
        if (pending.executed || pending.cancelled) revert RequestAlreadyFinalized(requestId);
        if (pending.expiresAt < block.timestamp) revert RequestExpired(requestId);
    }

    function _requireActivePolicy() private view {
        if (!policyActive) revert PolicyInactive();
    }

    function _executeTransfer(address asset, address recipient, uint256 amount) private {
        if (asset == address(0)) {
            uint256 nativeAvailable = address(this).balance;
            if (amount > nativeAvailable) revert InsufficientBalance(asset, amount, nativeAvailable);
            (bool success, bytes memory result) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed(result);
            return;
        }
        uint256 tokenAvailable = IERC20(asset).balanceOf(address(this));
        if (amount > tokenAvailable) revert InsufficientBalance(asset, amount, tokenAvailable);
        IERC20(asset).safeTransfer(recipient, amount);
    }

    function _activeApprovalCount(uint256 requestId) private view returns (uint256 count) {
        address[] storage approvers = _requestApprovers[requestId];
        for (uint256 i; i < approvers.length; ++i) {
            if (hasRole(APPROVER_ROLE, approvers[i])) ++count;
        }
    }

    function _requireDistinctOperationalRole(address account, bytes32 requestedRole) private view {
        if (
            hasRole(OWNER_ROLE, account) || hasRole(AGENT_ROLE, account) || hasRole(APPROVER_ROLE, account)
                || hasRole(GUARDIAN_ROLE, account)
        ) {
            if (requestedRole == APPROVER_ROLE && hasRole(APPROVER_ROLE, account)) {
                revert DuplicateApprover(account);
            }
            revert OperationalRoleCollision(account, requestedRole);
        }
    }

    function _grantRole(bytes32 role, address account) internal override returns (bool granted) {
        granted = super._grantRole(role, account);
        if (granted && role == APPROVER_ROLE) ++activeApproverCount;
        if (granted && role == AGENT_ROLE) {
            _activeAgentIndex[account] = _activeAgents.length + 1;
            _activeAgents.push(account);
        }
    }

    function _revokeRole(bytes32 role, address account) internal override returns (bool revoked) {
        if (role == APPROVER_ROLE && hasRole(role, account) && activeApproverCount - 1 < minimumApprovals) {
            revert ApprovalThresholdExceedsActiveApprovers(minimumApprovals, activeApproverCount - 1);
        }
        revoked = super._revokeRole(role, account);
        if (revoked && role == APPROVER_ROLE) --activeApproverCount;
        if (revoked && role == AGENT_ROLE) {
            uint256 index = _activeAgentIndex[account] - 1;
            uint256 lastIndex = _activeAgents.length - 1;
            if (index != lastIndex) {
                address moved = _activeAgents[lastIndex];
                _activeAgents[index] = moved;
                _activeAgentIndex[moved] = index + 1;
            }
            _activeAgents.pop();
            delete _activeAgentIndex[account];
        }
    }
}
