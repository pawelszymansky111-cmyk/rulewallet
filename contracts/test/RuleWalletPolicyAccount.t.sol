// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RuleWalletPolicyAccount} from "../src/RuleWalletPolicyAccount.sol";
import {MockERC20, FalseReturnToken} from "./mocks/MockERC20.sol";
import {ReentrantRecipient} from "./mocks/ReentrantRecipient.sol";

contract RuleWalletPolicyAccountTest is Test {
    RuleWalletPolicyAccount internal account;
    MockERC20 internal token;

    address internal admin = makeAddr("admin");
    address internal guardian = makeAddr("guardian");
    address internal agent = makeAddr("agent");
    address internal approverOne = makeAddr("approver-one");
    address internal approverTwo = makeAddr("approver-two");
    address internal recipient = makeAddr("recipient");

    function setUp() public {
        address[] memory approvers = new address[](2);
        approvers[0] = approverOne;
        approvers[1] = approverTwo;
        account = new RuleWalletPolicyAccount(admin, guardian, agent, approvers, 2);
        token = new MockERC20();

        vm.startPrank(admin);
        account.setTargetAllowed(recipient, true);
        account.setAssetPolicy(address(0), true, 1 ether, 3 ether, 0.25 ether);
        account.setAssetPolicy(address(token), true, 1_000e18, 3_000e18, 250e18);
        vm.stopPrank();

        vm.deal(address(account), 10 ether);
        token.mint(address(account), 10_000e18);
    }

    function testAgentExecutesAllowedNativeCallBelowApprovalThreshold() public {
        uint256 beforeBalance = recipient.balance;
        vm.prank(agent);
        uint256 requestId =
            account.requestNativeCall(recipient, 0.1 ether, "", 50, uint64(block.timestamp + 1 hours), 0);

        assertEq(requestId, 0);
        assertEq(recipient.balance - beforeBalance, 0.1 ether);
        assertEq(account.rollingSpent(address(0)), 0.1 ether);
        assertEq(account.nextNonce(agent), 1);
    }

    function testUnknownTargetIsBlockedOnchain() public {
        vm.prank(agent);
        vm.expectRevert(abi.encodeWithSelector(RuleWalletPolicyAccount.TargetNotAllowed.selector, address(0xBEEF)));
        account.requestNativeCall(address(0xBEEF), 0.1 ether, "", 0, uint64(block.timestamp + 1 hours), 0);
    }

    function testPerTransactionLimitIsEnforced() public {
        vm.prank(agent);
        vm.expectRevert();
        account.requestNativeCall(recipient, 1.1 ether, "", 0, uint64(block.timestamp + 1 hours), 0);
    }

    function testRollingLimitIsEnforcedAcrossExecutions() public {
        vm.prank(admin);
        account.setAssetPolicy(address(0), true, 2 ether, 2 ether, 2 ether);

        vm.prank(agent);
        account.requestNativeCall(recipient, 1.5 ether, "", 0, uint64(block.timestamp + 1 hours), 0);

        vm.prank(agent);
        vm.expectRevert();
        account.requestNativeCall(recipient, 0.6 ether, "", 0, uint64(block.timestamp + 1 hours), 1);
    }

    function testRollingSpendExpiresAfterTwentyFiveBuckets() public {
        vm.prank(agent);
        account.requestNativeCall(recipient, 0.2 ether, "", 0, uint64(block.timestamp + 1 hours), 0);
        assertEq(account.rollingSpent(address(0)), 0.2 ether);

        vm.warp(block.timestamp + 25 hours);
        assertEq(account.rollingSpent(address(0)), 0);
    }

    function testRollingSpendCannotFallOutBeforeFullTwentyFourHours() public {
        vm.warp(100 hours + 59 minutes);
        vm.prank(agent);
        account.requestNativeCall(recipient, 0.2 ether, "", 0, uint64(block.timestamp + 1 hours), 0);

        vm.warp(block.timestamp + 23 hours + 2 minutes);
        assertEq(account.rollingSpent(address(0)), 0.2 ether);
    }

    function testHighValueRequestRequiresTwoHumanApprovals() public {
        uint256 beforeBalance = recipient.balance;
        vm.prank(agent);
        uint256 requestId =
            account.requestNativeCall(recipient, 0.5 ether, "", 25, uint64(block.timestamp + 2 hours), 0);

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

    function testDuplicateApprovalIsRejected() public {
        vm.prank(agent);
        uint256 requestId = account.requestNativeCall(recipient, 0.5 ether, "", 0, uint64(block.timestamp + 1 hours), 0);
        vm.startPrank(approverOne);
        account.approveRequest(requestId);
        vm.expectRevert();
        account.approveRequest(requestId);
        vm.stopPrank();
    }

    function testNonceReplayIsRejected() public {
        vm.prank(agent);
        account.requestNativeCall(recipient, 0.1 ether, "", 0, uint64(block.timestamp + 1 hours), 0);

        vm.prank(agent);
        vm.expectRevert();
        account.requestNativeCall(recipient, 0.1 ether, "", 0, uint64(block.timestamp + 1 hours), 0);
    }

    function testExpiredRequestCannotBeApproved() public {
        vm.prank(agent);
        uint256 requestId =
            account.requestNativeCall(recipient, 0.5 ether, "", 0, uint64(block.timestamp + 10 minutes), 0);
        vm.warp(block.timestamp + 11 minutes);
        vm.prank(approverOne);
        vm.expectRevert();
        account.approveRequest(requestId);
    }

    function testGuardianCanPauseButCannotUnpause() public {
        vm.prank(guardian);
        account.pause();

        vm.prank(agent);
        vm.expectRevert();
        account.requestNativeCall(recipient, 0.1 ether, "", 0, uint64(block.timestamp + 1 hours), 0);

        vm.prank(guardian);
        vm.expectRevert();
        account.unpause();

        vm.prank(admin);
        account.unpause();
        assertFalse(account.paused());
    }

    function testEmergencyWithdrawalRequiresPauseAndAdmin() public {
        vm.prank(admin);
        vm.expectRevert();
        account.emergencyWithdrawNative(payable(admin), 1 ether);

        vm.prank(guardian);
        account.pause();
        uint256 beforeBalance = admin.balance;
        vm.prank(admin);
        account.emergencyWithdrawNative(payable(admin), 1 ether);
        assertEq(admin.balance - beforeBalance, 1 ether);
    }

    function testDirectTokenTransferUsesAssetSpecificLimits() public {
        uint256 beforeBalance = token.balanceOf(recipient);
        vm.prank(agent);
        uint256 requestId =
            account.requestTokenTransfer(address(token), recipient, 100e18, uint64(block.timestamp + 1 hours), 0);
        assertEq(requestId, 0);
        assertEq(token.balanceOf(recipient) - beforeBalance, 100e18);
    }

    function testFalseReturnTokenCannotReportSuccessfulTransfer() public {
        FalseReturnToken falseToken = new FalseReturnToken();
        falseToken.mint(address(account), 1_000e18);
        vm.prank(admin);
        account.setAssetPolicy(address(falseToken), true, 1_000e18, 2_000e18, 1_000e18);

        vm.prank(agent);
        vm.expectRevert();
        account.requestTokenTransfer(address(falseToken), recipient, 100e18, uint64(block.timestamp + 1 hours), 0);
    }

    function testReentrantRecipientCannotReenterAgentExecution() public {
        ReentrantRecipient attacker = new ReentrantRecipient(account);
        vm.prank(admin);
        account.setTargetAllowed(address(attacker), true);

        vm.prank(agent);
        account.requestNativeCall(address(attacker), 0.1 ether, "", 0, uint64(block.timestamp + 1 hours), 0);
        assertTrue(attacker.attempted());
        assertFalse(attacker.reentrySucceeded());
    }

    function testFuzz_AllowedNativeValueNeverExceedsConfiguredCap(uint128 value) public {
        value = uint128(bound(value, 1, 0.25 ether));
        uint256 beforeBalance = recipient.balance;
        vm.prank(agent);
        account.requestNativeCall(recipient, value, "", 0, uint64(block.timestamp + 1 hours), 0);
        assertEq(recipient.balance - beforeBalance, value);
        assertLe(account.rollingSpent(address(0)), 3 ether);
    }
}
