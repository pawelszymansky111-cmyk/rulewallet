// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RuleWalletFactory} from "../src/RuleWalletFactory.sol";
import {RuleWalletPolicyAccountV2} from "../src/RuleWalletPolicyAccountV2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract RuleWalletPolicyAccountV2Test is Test {
    uint256 internal ownerKey = 0xA11CE;
    address internal owner;
    address internal guardian = makeAddr("guardian");
    address internal agent = makeAddr("agent");
    address internal approverOne = makeAddr("approver-one");
    address internal approverTwo = makeAddr("approver-two");
    address internal recipient = makeAddr("recipient");

    MockERC20 internal usdg;
    RuleWalletPolicyAccountV2 internal account;

    function setUp() public {
        owner = vm.addr(ownerKey);
        usdg = new MockERC20();
        address[] memory approvers = new address[](2);
        approvers[0] = approverOne;
        approvers[1] = approverTwo;
        account = new RuleWalletPolicyAccountV2(owner, guardian, agent, approvers, 2, address(usdg));

        vm.startPrank(owner);
        account.setTrustedRecipient(recipient, true);
        account.setAssetPolicy(address(0), true, 1 ether, 3 ether, 0.25 ether);
        account.setAssetPolicy(address(usdg), true, 1_000e18, 3_000e18, 250e18);
        vm.stopPrank();

        vm.deal(address(account), 10 ether);
        usdg.mint(address(account), 10_000e18);
    }

    function testFactoryDeploysPredictedNonUpgradeablePersonalAccount() public {
        RuleWalletFactory factory = new RuleWalletFactory(block.chainid, address(usdg));
        address[] memory approvers = new address[](1);
        approvers[0] = owner;
        bytes32 salt = keccak256("personal-account");
        address predicted = factory.predictAccountAddress(owner, guardian, agent, approvers, 1, salt);

        vm.prank(owner);
        address deployed = factory.deployAccount(guardian, agent, approvers, 1, salt);

        assertEq(deployed, predicted);
        assertEq(factory.accountsOf(owner).length, 1);
        assertEq(factory.accountVersion(deployed), factory.VERSION_HASH());
        assertTrue(RuleWalletPolicyAccountV2(payable(deployed)).hasRole(account.OWNER_ROLE(), owner));
    }

    function testAgentExecutesOnlyDirectNativeTransferInsideLimits() public {
        uint256 beforeBalance = recipient.balance;
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(recipient, 0.1 ether, uint64(block.timestamp + 1 hours), 0);

        assertEq(requestId, 0);
        assertEq(recipient.balance - beforeBalance, 0.1 ether);
        assertEq(account.rollingSpent(address(0)), 0.1 ether);
        assertEq(account.nextAgentNonce(agent), 1);
    }

    function testAgentCannotUseUnsupportedToken() public {
        MockERC20 other = new MockERC20();
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(RuleWalletPolicyAccountV2.UnsupportedAsset.selector, address(other)));
        account.setAssetPolicy(address(other), true, 1, 1, 0);
    }

    function testAgentAlwaysNeedsConfiguredPositiveLimits() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(RuleWalletPolicyAccountV2.InvalidAssetPolicy.selector, address(0)));
        account.setAssetPolicy(address(0), true, 0, 1 ether, 0);
    }

    function testHighValueTransferRequiresConfiguredHumanApprovals() public {
        uint256 beforeBalance = recipient.balance;
        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(recipient, 0.5 ether, uint64(block.timestamp + 1 hours), 0);
        assertEq(recipient.balance, beforeBalance);

        vm.prank(approverOne);
        account.approveRequest(requestId);
        vm.expectRevert();
        account.executeApprovedRequest(requestId);

        vm.prank(approverTwo);
        account.approveRequest(requestId);
        account.executeApprovedRequest(requestId);
        assertEq(recipient.balance - beforeBalance, 0.5 ether);
    }

    function testZeroApprovalThresholdMakesApprovalOptional() public {
        vm.prank(owner);
        account.setAssetPolicy(address(0), true, 1 ether, 3 ether, 0);

        vm.prank(agent);
        uint256 requestId = account.requestNativeTransfer(recipient, 0.75 ether, uint64(block.timestamp + 1 hours), 0);
        assertEq(requestId, 0);
    }

    function testOwnerCanWithdrawAnyAvailableAmountWithoutAgentLimit() public {
        vm.prank(owner);
        account.setAssetPolicy(address(0), true, 0.1 ether, 0.2 ether, 0);
        uint256 ownerBefore = owner.balance;

        vm.prank(owner);
        account.withdrawNative(payable(owner), 4 ether);

        assertEq(owner.balance - ownerBefore, 4 ether);
        assertEq(account.rollingSpent(address(0)), 0);
    }

    function testAgentCannotWithdrawOwnerFunds() public {
        vm.prank(agent);
        vm.expectRevert();
        account.withdrawNative(payable(agent), 1 ether);
    }

    function testCanonicalStablecoinDirectTransferUsesIndependentLimit() public {
        uint256 beforeBalance = usdg.balanceOf(recipient);
        vm.prank(agent);
        account.requestTokenTransfer(recipient, 100e18, uint64(block.timestamp + 1 hours), 0);
        assertEq(usdg.balanceOf(recipient) - beforeBalance, 100e18);
        assertEq(account.rollingSpent(address(usdg)), 100e18);
    }

    function testSignedRecurringStrategyEnforcesOwnerSignatureIntervalAndReplayBinding() public {
        RuleWalletPolicyAccountV2.Strategy memory strategy = _strategy(7, 3);
        bytes32 digest = account.strategyDigest(strategy);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(agent);
        account.executeSignedStrategy(strategy, signature, uint64(block.timestamp + 1 hours));
        assertEq(recipient.balance, 0.1 ether);

        vm.prank(agent);
        vm.expectRevert();
        account.executeSignedStrategy(strategy, signature, uint64(block.timestamp + 1 hours));

        vm.warp(block.timestamp + 1 days);
        vm.prank(agent);
        account.executeSignedStrategy(strategy, signature, uint64(block.timestamp + 1 hours));
        assertEq(recipient.balance, 0.2 ether);

        RuleWalletPolicyAccountV2.Strategy memory conflict = strategy;
        conflict.amount = 0.2 ether;
        bytes32 conflictDigest = account.strategyDigest(conflict);
        (v, r, s) = vm.sign(ownerKey, conflictDigest);
        vm.prank(agent);
        vm.expectRevert();
        account.executeSignedStrategy(conflict, abi.encodePacked(r, s, v), uint64(block.timestamp + 1 hours));
    }

    function testOwnerCanRevokeSignedStrategy() public {
        RuleWalletPolicyAccountV2.Strategy memory strategy = _strategy(8, 2);
        bytes32 digest = account.strategyDigest(strategy);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);

        vm.prank(owner);
        account.revokeStrategy(digest);
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(RuleWalletPolicyAccountV2.StrategyIsRevoked.selector, digest));
        account.executeSignedStrategy(strategy, abi.encodePacked(r, s, v), uint64(block.timestamp + 1 hours));
    }

    function testWrongChainAndExpiredSignedStrategiesFail() public {
        RuleWalletPolicyAccountV2.Strategy memory strategy = _strategy(9, 1);
        strategy.chainId = block.chainid + 1;
        bytes32 digest = account.strategyDigest(strategy);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, digest);
        vm.prank(agent);
        vm.expectRevert();
        account.executeSignedStrategy(strategy, abi.encodePacked(r, s, v), uint64(block.timestamp + 1 hours));

        strategy = _strategy(10, 1);
        strategy.expiry = uint64(block.timestamp - 1);
        digest = account.strategyDigest(strategy);
        (v, r, s) = vm.sign(ownerKey, digest);
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(RuleWalletPolicyAccountV2.StrategyExpired.selector, digest));
        account.executeSignedStrategy(strategy, abi.encodePacked(r, s, v), uint64(block.timestamp + 1 hours));
    }

    function testGuardianPauseBlocksAgentButNotOwnerWithdrawal() public {
        vm.prank(guardian);
        account.pause();
        vm.prank(agent);
        vm.expectRevert();
        account.requestNativeTransfer(recipient, 0.1 ether, uint64(block.timestamp + 1 hours), 0);

        vm.prank(owner);
        account.withdrawNative(payable(owner), 1 ether);
        vm.prank(owner);
        account.unpause();
        assertFalse(account.paused());
    }

    function testFuzz_AgentTransferNeverExceedsConfiguredNativeCap(uint128 amount) public {
        amount = uint128(bound(amount, 1, 0.25 ether));
        vm.prank(agent);
        account.requestNativeTransfer(recipient, amount, uint64(block.timestamp + 1 hours), 0);
        assertLe(account.rollingSpent(address(0)), 3 ether);
    }

    function _strategy(uint64 nonce, uint32 maxExecutions)
        private
        view
        returns (RuleWalletPolicyAccountV2.Strategy memory)
    {
        return RuleWalletPolicyAccountV2.Strategy({
            chainId: block.chainid,
            account: address(account),
            asset: address(0),
            recipient: recipient,
            amount: 0.1 ether,
            nonce: nonce,
            expiry: uint64(block.timestamp + 7 days),
            intervalSeconds: 1 days,
            maxExecutions: maxExecutions
        });
    }
}
