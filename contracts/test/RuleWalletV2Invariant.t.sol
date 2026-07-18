// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {RuleWalletPolicyAccountV2} from "../src/RuleWalletPolicyAccountV2.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract RuleWalletV2Handler is Test {
    RuleWalletPolicyAccountV2 public immutable account;
    address public immutable agent;
    address public immutable recipient;
    uint256 public nonce;

    constructor(RuleWalletPolicyAccountV2 account_, address agent_, address recipient_) {
        account = account_;
        agent = agent_;
        recipient = recipient_;
    }

    function executeBounded(uint128 rawAmount) external {
        uint128 amount = uint128(bound(rawAmount, 1, 0.2 ether));
        vm.prank(agent);
        try account.requestNativeTransfer(recipient, amount, uint64(block.timestamp + 1 hours), nonce) {
            nonce += 1;
        } catch {}
    }

    function moveTime(uint32 secondsForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 1, 2 hours));
    }
}

contract RuleWalletV2InvariantTest is StdInvariant, Test {
    RuleWalletPolicyAccountV2 internal account;

    function setUp() public {
        address owner = makeAddr("v2-owner");
        address guardian = makeAddr("v2-guardian");
        address agent = makeAddr("v2-agent");
        address approver = makeAddr("v2-approver");
        address recipient = makeAddr("v2-recipient");
        MockERC20 usdg = new MockERC20();
        address[] memory approvers = new address[](1);
        approvers[0] = approver;

        account = new RuleWalletPolicyAccountV2(owner, guardian, agent, approvers, 1, address(usdg));
        vm.startPrank(owner);
        account.setTrustedRecipient(recipient, true);
        account.setAssetPolicy(address(0), true, 0.2 ether, 1 ether, 0);
        vm.stopPrank();
        vm.deal(address(account), 100 ether);

        RuleWalletV2Handler handler = new RuleWalletV2Handler(account, agent, recipient);
        targetContract(address(handler));
    }

    function invariant_RollingAgentSpendNeverExceedsOwnerLimit() public view {
        assertLe(account.rollingSpent(address(0)), 1 ether);
    }

    function invariant_AccountNeverGrantsUnlimitedSupportedAssetPolicy() public view {
        (bool allowed, uint128 perTransaction, uint128 rolling,) = account.assetPolicies(address(0));
        if (allowed) {
            assertGt(perTransaction, 0);
            assertGe(rolling, perTransaction);
        }
    }
}
