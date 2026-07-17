// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {RuleWalletPolicyAccount} from "../src/RuleWalletPolicyAccount.sol";

contract RuleWalletHandler is Test {
    RuleWalletPolicyAccount public immutable account;
    address public immutable agent;
    address public immutable recipient;
    uint256 public nonce;

    constructor(RuleWalletPolicyAccount account_, address agent_, address recipient_) {
        account = account_;
        agent = agent_;
        recipient = recipient_;
    }

    function executeBounded(uint128 rawAmount) external {
        uint128 amount = uint128(bound(rawAmount, 1, 0.2 ether));
        vm.prank(agent);
        try account.requestNativeCall(recipient, amount, "", 0, uint64(block.timestamp + 1 hours), nonce) {
            nonce += 1;
        } catch {}
    }

    function moveTime(uint32 secondsForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 1, 2 hours));
    }
}
contract RuleWalletInvariantTest is StdInvariant, Test {
    RuleWalletPolicyAccount internal account;

    function setUp() public {
        address admin = makeAddr("admin");
        address guardian = makeAddr("guardian");
        address agent = makeAddr("agent");
        address approver = makeAddr("approver");
        address recipient = makeAddr("recipient");
        address[] memory approvers = new address[](1);
        approvers[0] = approver;

        account = new RuleWalletPolicyAccount(admin, guardian, agent, approvers, 1);
        vm.startPrank(admin);
        account.setTargetAllowed(recipient, true);
        account.setAssetPolicy(address(0), true, 0.2 ether, 1 ether, 0.2 ether);
        vm.stopPrank();
        vm.deal(address(account), 100 ether);

        RuleWalletHandler handler = new RuleWalletHandler(account, agent, recipient);
        targetContract(address(handler));
    }

    function invariant_RollingSpendNeverExceedsPolicyLimit() public view {
        assertLe(account.rollingSpent(address(0)), 1 ether);
    }

    function invariant_ContractNeverCreatesRequestZero() public view {
        assertGe(account.nextRequestId(), 1);
    }
}
