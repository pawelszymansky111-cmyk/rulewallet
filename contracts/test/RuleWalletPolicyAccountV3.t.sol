// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RuleWalletFactoryV3} from "../src/RuleWalletFactoryV3.sol";
import {RuleWalletPolicyAccountV3} from "../src/RuleWalletPolicyAccountV3.sol";
import {RuleWalletPolicyRegistryV3} from "../src/RuleWalletPolicyRegistryV3.sol";
import {FalseReturnToken, MockERC20} from "./mocks/MockERC20.sol";

contract RuleWalletPolicyAccountV3Test is Test {
    uint8 internal constant TRAVEL = 1;
    bytes32 internal constant INTENT_HASH = keccak256("quote:travel:one");
    uint256 internal ownerKey = 0xA11CE;
    uint256 internal approverOneKey = 0xB0B;
    address internal owner;
    address internal guardian = makeAddr("v3-guardian");
    address internal agent = makeAddr("v3-agent");
    address internal approverOne;
    address internal approverTwo = makeAddr("v3-approver-two");
    address internal merchant = makeAddr("v3-travel-merchant");

    MockERC20 internal usdg;
    RuleWalletFactoryV3 internal factory;
    RuleWalletPolicyAccountV3 internal account;
    RuleWalletPolicyRegistryV3 internal registry;

    function setUp() public {
        owner = vm.addr(ownerKey);
        approverOne = vm.addr(approverOneKey);
        usdg = new MockERC20();
        factory = new RuleWalletFactoryV3(block.chainid, address(usdg));
        address[] memory approvers = new address[](2);
        approvers[0] = approverOne;
        approvers[1] = approverTwo;

        vm.prank(owner);
        account = RuleWalletPolicyAccountV3(
            payable(factory.deployAccount(guardian, agent, approvers, 2, keccak256("v3-personal")))
        );
        registry = account.policyRegistry();
        _configureNativePolicies(true, 0.25 ether, 2 ether, 5 ether, 10 ether);
        _configureTokenPolicies();
        vm.deal(address(account), 20 ether);
        usdg.mint(address(account), 20_000e18);
    }

    function testFactoryDeploysPredictedAccountAndPairedRegistry() public view {
        address[] memory approvers = new address[](2);
        approvers[0] = approverOne;
        approvers[1] = approverTwo;
        address predicted =
            factory.predictAccountAddress(owner, guardian, agent, approvers, 2, keccak256("v3-personal"));
        assertEq(predicted, address(account));
        assertEq(registry.controller(), address(account));
        assertEq(registry.canonicalStablecoin(), address(usdg));
        assertEq(factory.accountVersion(address(account)), factory.VERSION_HASH());
        assertEq(factory.accountsOf(owner).length, 1);
        address[] memory agents = account.activeAgents();
        assertEq(agents.length, 1);
        assertEq(agents[0], agent);
    }

    function testOwnerCanDiscoverAndRevokeEveryActiveAgentSession() public {
        address secondAgent = makeAddr("v3-second-agent");
        bytes32 agentRole = account.AGENT_ROLE();
        vm.prank(owner);
        account.grantRole(agentRole, secondAgent);

        address[] memory active = account.activeAgents();
        assertEq(active.length, 2);
        vm.prank(owner);
        account.revokeAgentSessions(active);
        assertEq(account.activeAgents().length, 0);
        assertFalse(account.hasRole(agentRole, agent));
        assertFalse(account.hasRole(agentRole, secondAgent));
    }

    function testAllDeploymentRuntimeSizesRemainDeployable() public view {
        assertLt(address(account).code.length, 24_576);
        assertLt(address(registry).code.length, 24_576);
        assertLt(address(factory).code.length, 24_576);
        assertLt(address(factory.accountDeployer()).code.length, 24_576);
        assertLt(address(factory.registryDeployer()).code.length, 24_576);
    }

    function testAutonomousMerchantPaymentEnforcesAndRecordsEveryBudget() public {
        uint256 beforeBalance = merchant.balance;
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(
            merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0
        );

        assertEq(requestId, 0);
        assertEq(merchant.balance - beforeBalance, 0.1 ether);
        assertEq(registry.rollingSpent(address(0)), 0.1 ether);
        (uint256 assetDaily, uint256 assetWeekly, uint256 assetMonthly) = registry.assetPeriodSpend(address(0));
        (uint256 categoryDaily, uint256 categoryWeekly, uint256 categoryMonthly) =
            registry.categoryPeriodSpend(TRAVEL, address(0));
        (uint256 merchantDaily, uint256 merchantCount) = registry.merchantDailySpend(merchant, address(0));
        assertEq(assetDaily, 0.1 ether);
        assertEq(assetWeekly, 0.1 ether);
        assertEq(assetMonthly, 0.1 ether);
        assertEq(categoryDaily, 0.1 ether);
        assertEq(categoryWeekly, 0.1 ether);
        assertEq(categoryMonthly, 0.1 ether);
        assertEq(merchantDaily, 0.1 ether);
        assertEq(merchantCount, 1);
    }

    function testCanonicalStablecoinUsesIndependentPolicies() public {
        uint256 beforeBalance = usdg.balanceOf(merchant);
        vm.prank(agent);
        account.requestTokenTransfer(merchant, 100e18, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);
        assertEq(usdg.balanceOf(merchant) - beforeBalance, 100e18);
        assertEq(registry.rollingSpent(address(usdg)), 100e18);
    }

    function testMaliciousCanonicalTokenCannotReportSuccessfulPayment() public {
        FalseReturnToken malicious = new FalseReturnToken();
        RuleWalletFactoryV3 maliciousFactory = new RuleWalletFactoryV3(block.chainid, address(malicious));
        address[] memory approvers = new address[](1);
        approvers[0] = approverOne;
        vm.prank(owner);
        RuleWalletPolicyAccountV3 maliciousAccount = RuleWalletPolicyAccountV3(
            payable(maliciousFactory.deployAccount(guardian, agent, approvers, 1, keccak256("malicious-token")))
        );
        RuleWalletPolicyRegistryV3 maliciousRegistry = maliciousAccount.policyRegistry();
        uint64 expiry = uint64(block.timestamp + 30 days);
        vm.startPrank(owner);
        maliciousRegistry.setAssetPolicy(
            address(malicious), RuleWalletPolicyRegistryV3.AssetPolicy(true, 100, 500, 0, 200, 500, 1_000, expiry)
        );
        maliciousRegistry.setMerchantPolicy(
            merchant, RuleWalletPolicyRegistryV3.MerchantPolicy(true, true, TRAVEL, expiry)
        );
        maliciousRegistry.setMerchantAssetPolicy(
            merchant, address(malicious), RuleWalletPolicyRegistryV3.MerchantAssetPolicy(true, 100, 200, 10)
        );
        maliciousRegistry.setCategoryBudget(
            TRAVEL, address(malicious), RuleWalletPolicyRegistryV3.CategoryBudget(true, 200, 500, 1_000, expiry)
        );
        vm.stopPrank();
        malicious.mint(address(maliciousAccount), 1_000);

        vm.prank(agent);
        vm.expectRevert();
        maliciousAccount.requestTokenTransfer(merchant, 100, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);
        assertEq(maliciousRegistry.rollingSpent(address(malicious)), 0);
        assertEq(maliciousAccount.nextAgentNonce(agent), 0);
    }

    function testInsufficientBalanceRollsBackSpendAndNonce() public {
        vm.deal(address(account), 0);
        vm.prank(agent);
        vm.expectRevert(
            abi.encodeWithSelector(RuleWalletPolicyAccountV3.InsufficientBalance.selector, address(0), 0.1 ether, 0)
        );
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);
        assertEq(registry.rollingSpent(address(0)), 0);
        assertEq(account.nextAgentNonce(agent), 0);
    }

    function testUntrustedMerchantAndCategoryMismatchFailClosed() public {
        address unknown = makeAddr("unknown-merchant");
        vm.prank(agent);
        vm.expectPartialRevert(RuleWalletPolicyRegistryV3.PolicyViolation.selector);
        account.requestNativeTransfer(unknown, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);

        vm.prank(agent);
        vm.expectPartialRevert(RuleWalletPolicyRegistryV3.PolicyViolation.selector);
        account.requestNativeTransfer(merchant, 0.1 ether, 2, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);
    }

    function testMerchantCanRequireApprovalBelowAssetThreshold() public {
        _setMerchantAutonomy(false);
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(
            merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0
        );
        assertEq(requestId, 1);
        assertEq(merchant.balance, 0);
    }

    function testHighValueRequestAcceptsSingleUseExpiringApprovalSignature() public {
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(
            merchant, 0.5 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 2 hours), 0
        );

        RuleWalletPolicyAccountV3.Approval memory authorization = RuleWalletPolicyAccountV3.Approval({
            chainId: block.chainid,
            account: address(account),
            requestId: requestId,
            approver: approverOne,
            nonce: 0,
            expiry: uint64(block.timestamp + 30 minutes)
        });
        bytes memory signature = _signApproval(authorization);
        account.approveRequestWithSignature(authorization, signature);

        vm.expectRevert(RuleWalletPolicyAccountV3.InvalidApprovalAuthorization.selector);
        account.approveRequestWithSignature(authorization, signature);
        vm.prank(approverTwo);
        account.approveRequest(requestId);

        uint256 beforeBalance = merchant.balance;
        account.executeApprovedRequest(requestId);
        assertEq(merchant.balance - beforeBalance, 0.5 ether);
    }

    function testExpiredAndWrongChainApprovalSignaturesFail() public {
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(
            merchant, 0.5 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 2 hours), 0
        );
        RuleWalletPolicyAccountV3.Approval memory authorization = RuleWalletPolicyAccountV3.Approval({
            chainId: block.chainid + 1,
            account: address(account),
            requestId: requestId,
            approver: approverOne,
            nonce: 0,
            expiry: uint64(block.timestamp + 1 minutes)
        });
        bytes memory wrongChainSignature = _signApproval(authorization);
        vm.expectRevert(RuleWalletPolicyAccountV3.InvalidApprovalAuthorization.selector);
        account.approveRequestWithSignature(authorization, wrongChainSignature);

        authorization.chainId = block.chainid;
        authorization.expiry = uint64(block.timestamp - 1);
        bytes memory expiredSignature = _signApproval(authorization);
        vm.expectRevert(RuleWalletPolicyAccountV3.InvalidApprovalAuthorization.selector);
        account.approveRequestWithSignature(authorization, expiredSignature);
    }

    function testApproverCanRejectPendingPurchase() public {
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(
            merchant, 0.5 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 2 hours), 0
        );
        vm.prank(approverOne);
        account.rejectRequest(requestId);
        vm.prank(approverTwo);
        vm.expectRevert(abi.encodeWithSelector(RuleWalletPolicyAccountV3.RequestAlreadyFinalized.selector, requestId));
        account.approveRequest(requestId);
    }

    function testDailyWeeklyAndMonthlyAssetBudgetsAreEnforced() public {
        _configureNativePolicies(true, 0, 0.15 ether, 0.15 ether, 0.15 ether);
        vm.prank(agent);
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);

        vm.warp(block.timestamp + 1 days);
        vm.prank(agent);
        vm.expectPartialRevert(RuleWalletPolicyRegistryV3.PolicyViolation.selector);
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 1);

        vm.warp(block.timestamp + 7 days);
        vm.prank(agent);
        vm.expectPartialRevert(RuleWalletPolicyRegistryV3.PolicyViolation.selector);
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 1);

        vm.warp(block.timestamp + 30 days);
        vm.prank(agent);
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 1);
    }

    function testCategoryAndMerchantBudgetsAreIndependent() public {
        uint64 expiresAt = uint64(block.timestamp + 365 days);
        vm.startPrank(owner);
        registry.setCategoryBudget(
            TRAVEL,
            address(0),
            RuleWalletPolicyRegistryV3.CategoryBudget(true, 0.15 ether, 0.15 ether, 0.15 ether, expiresAt)
        );
        registry.setMerchantAssetPolicy(
            merchant, address(0), RuleWalletPolicyRegistryV3.MerchantAssetPolicy(true, 0.15 ether, 0.15 ether, 1)
        );
        vm.stopPrank();

        vm.prank(agent);
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);
        vm.prank(agent);
        vm.expectPartialRevert(RuleWalletPolicyRegistryV3.PolicyViolation.selector);
        account.requestNativeTransfer(merchant, 0.05 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 1);
    }

    function testMerchantTimeWindowAndWeekdayAreEnforced() public {
        vm.prank(owner);
        registry.setMerchantTimePolicy(merchant, RuleWalletPolicyRegistryV3.TimePolicy(true, 0x7f, 600, 660));
        vm.warp(block.timestamp - (block.timestamp % 1 days) + 9 hours);
        vm.prank(agent);
        vm.expectPartialRevert(RuleWalletPolicyRegistryV3.PolicyViolation.selector);
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);

        vm.warp(block.timestamp - (block.timestamp % 1 days) + 10 hours + 30 minutes);
        vm.prank(agent);
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);
    }

    function testExpiredPoliciesCannotExecuteQueuedRequests() public {
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(
            merchant, 0.5 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 2 hours), 0
        );
        vm.prank(approverOne);
        account.approveRequest(requestId);
        vm.prank(approverTwo);
        account.approveRequest(requestId);
        vm.prank(owner);
        registry.setMerchantPolicy(
            merchant,
            RuleWalletPolicyRegistryV3.MerchantPolicy(true, true, TRAVEL, uint64(block.timestamp + 30 minutes))
        );
        vm.warp(block.timestamp + 31 minutes);

        vm.expectPartialRevert(RuleWalletPolicyRegistryV3.PolicyViolation.selector);
        account.executeApprovedRequest(requestId);
    }

    function testRevokedAgentCannotExecuteQueuedRequestAndBatchRevokeWorks() public {
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(
            merchant, 0.5 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 2 hours), 0
        );
        vm.prank(approverOne);
        account.approveRequest(requestId);
        vm.prank(approverTwo);
        account.approveRequest(requestId);

        address[] memory agents = new address[](1);
        agents[0] = agent;
        vm.prank(owner);
        account.revokeAgentSessions(agents);
        vm.expectRevert(
            abi.encodeWithSelector(RuleWalletPolicyAccountV3.RequestAgentNoLongerAuthorized.selector, requestId, agent)
        );
        account.executeApprovedRequest(requestId);
    }

    function testSignedStrategyBindsMerchantCategoryIntentAndReplayNonce() public {
        RuleWalletPolicyAccountV3.Strategy memory strategy = _strategy(7, 2);
        bytes32 digest = account.strategyDigest(strategy);
        bytes memory signature = _signOwnerDigest(digest);

        vm.prank(agent);
        account.executeSignedStrategy(strategy, signature, uint64(block.timestamp + 1 hours));
        vm.prank(agent);
        vm.expectRevert();
        account.executeSignedStrategy(strategy, signature, uint64(block.timestamp + 1 hours));

        vm.warp(block.timestamp + 1 days);
        RuleWalletPolicyAccountV3.Strategy memory conflict = strategy;
        conflict.intentHash = keccak256("different-cart");
        bytes memory conflictSignature = _signOwnerDigest(account.strategyDigest(conflict));
        vm.prank(agent);
        vm.expectRevert();
        account.executeSignedStrategy(conflict, conflictSignature, uint64(block.timestamp + 1 hours));
    }

    function testOwnerAndGuardianCanPauseButOnlyOwnerCanUnpauseAndWithdraw() public {
        vm.prank(guardian);
        account.pause();
        vm.prank(agent);
        vm.expectRevert();
        account.requestNativeTransfer(merchant, 0.1 ether, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);

        uint256 ownerBefore = owner.balance;
        vm.prank(owner);
        account.withdrawNative(payable(owner), 2 ether);
        assertEq(owner.balance - ownerBefore, 2 ether);
        vm.prank(guardian);
        vm.expectRevert();
        account.unpause();
        vm.prank(owner);
        account.unpause();

        vm.prank(owner);
        account.pause();
        assertTrue(account.paused());
    }

    function testOnlyCurrentOwnerCanConfigureRegistry() public {
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(RuleWalletPolicyRegistryV3.Unauthorized.selector, agent));
        registry.setMerchantPolicy(
            merchant, RuleWalletPolicyRegistryV3.MerchantPolicy(true, true, TRAVEL, uint64(block.timestamp + 1 days))
        );
    }

    function testFuzz_AutonomousPaymentNeverExceedsConfiguredCaps(uint128 rawAmount) public {
        uint128 amount = uint128(bound(rawAmount, 1, 0.25 ether));
        vm.prank(agent);
        account.requestNativeTransfer(merchant, amount, TRAVEL, INTENT_HASH, uint64(block.timestamp + 1 hours), 0);
        assertLe(registry.rollingSpent(address(0)), 3 ether);
        (uint256 daily,,) = registry.assetPeriodSpend(address(0));
        assertLe(daily, 2 ether);
    }

    function _configureNativePolicies(
        bool autonomous,
        uint128 approvalAbove,
        uint128 daily,
        uint128 weekly,
        uint128 monthly
    ) private {
        uint64 expiresAt = uint64(block.timestamp + 365 days);
        vm.startPrank(owner);
        uint128 maxPerTransaction = daily < 1 ether ? daily : uint128(1 ether);
        registry.setAssetPolicy(
            address(0),
            RuleWalletPolicyRegistryV3.AssetPolicy(
                true, maxPerTransaction, 3 ether, approvalAbove, daily, weekly, monthly, expiresAt
            )
        );
        registry.setMerchantPolicy(
            merchant, RuleWalletPolicyRegistryV3.MerchantPolicy(true, autonomous, TRAVEL, expiresAt)
        );
        registry.setMerchantAssetPolicy(
            merchant, address(0), RuleWalletPolicyRegistryV3.MerchantAssetPolicy(true, maxPerTransaction, daily, 20)
        );
        registry.setCategoryBudget(
            TRAVEL, address(0), RuleWalletPolicyRegistryV3.CategoryBudget(true, daily, weekly, monthly, expiresAt)
        );
        vm.stopPrank();
    }

    function _configureTokenPolicies() private {
        uint64 expiresAt = uint64(block.timestamp + 365 days);
        vm.startPrank(owner);
        registry.setAssetPolicy(
            address(usdg),
            RuleWalletPolicyRegistryV3.AssetPolicy(
                true, 1_000e18, 3_000e18, 250e18, 2_000e18, 5_000e18, 10_000e18, expiresAt
            )
        );
        registry.setMerchantAssetPolicy(
            merchant, address(usdg), RuleWalletPolicyRegistryV3.MerchantAssetPolicy(true, 1_000e18, 2_000e18, 20)
        );
        registry.setCategoryBudget(
            TRAVEL,
            address(usdg),
            RuleWalletPolicyRegistryV3.CategoryBudget(true, 2_000e18, 5_000e18, 10_000e18, expiresAt)
        );
        vm.stopPrank();
    }

    function _setMerchantAutonomy(bool autonomous) private {
        vm.prank(owner);
        registry.setMerchantPolicy(
            merchant,
            RuleWalletPolicyRegistryV3.MerchantPolicy(true, autonomous, TRAVEL, uint64(block.timestamp + 365 days))
        );
    }

    function _strategy(uint64 nonce, uint32 maxExecutions)
        private
        view
        returns (RuleWalletPolicyAccountV3.Strategy memory)
    {
        return RuleWalletPolicyAccountV3.Strategy({
            chainId: block.chainid,
            account: address(account),
            asset: address(0),
            recipient: merchant,
            amount: 0.1 ether,
            category: TRAVEL,
            intentHash: INTENT_HASH,
            nonce: nonce,
            expiry: uint64(block.timestamp + 7 days),
            intervalSeconds: 1 days,
            maxExecutions: maxExecutions
        });
    }

    function _signApproval(RuleWalletPolicyAccountV3.Approval memory authorization)
        private
        view
        returns (bytes memory)
    {
        return _signDigest(approverOneKey, account.approvalDigest(authorization));
    }

    function _signOwnerDigest(bytes32 digest) private view returns (bytes memory) {
        return _signDigest(ownerKey, digest);
    }

    function _signDigest(uint256 key, bytes32 digest) private view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }
}
