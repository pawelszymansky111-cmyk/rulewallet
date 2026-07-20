// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RuleWalletTestUSDG} from "../src/RuleWalletTestUSDG.sol";

contract RuleWalletTestUSDGTest is Test {
    RuleWalletTestUSDG internal token;
    address internal user = makeAddr("user");

    function setUp() public {
        token = new RuleWalletTestUSDG(block.chainid);
    }

    function testUsesSixDecimalsAndValuelessTestIdentity() public view {
        assertEq(token.name(), "RuleWallet Test USDG");
        assertEq(token.symbol(), "tUSDG");
        assertEq(token.decimals(), 6);
        assertEq(token.deploymentChainId(), block.chainid);
    }

    function testFaucetIsRateLimitedPerAddress() public {
        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), 1_000e6);

        vm.expectPartialRevert(RuleWalletTestUSDG.FaucetCooldown.selector);
        vm.prank(user);
        token.faucet();

        vm.warp(block.timestamp + 1 days);
        vm.prank(user);
        token.faucet();
        assertEq(token.balanceOf(user), 2_000e6);
    }

    function testCannotBeConstructedForRobinhoodMainnet() public {
        vm.expectRevert(RuleWalletTestUSDG.MainnetForbidden.selector);
        new RuleWalletTestUSDG(4663);
    }
}
