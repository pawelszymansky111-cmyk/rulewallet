// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RuleWalletFactory} from "../src/RuleWalletFactory.sol";
import {RuleWalletPolicyAccountV2} from "../src/RuleWalletPolicyAccountV2.sol";

interface IERC20Metadata {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

contract RobinhoodMainnetForkTest is Test {
    uint256 internal constant ROBINHOOD_MAINNET_CHAIN_ID = 4663;
    address internal constant CANONICAL_USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    function testMainnetForkCanonicalAssetAndFactory() public {
        string memory rpcUrl = vm.envOr("RH_MAINNET_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) return;

        vm.createSelectFork(rpcUrl);
        assertEq(block.chainid, ROBINHOOD_MAINNET_CHAIN_ID);
        assertGt(CANONICAL_USDG.code.length, 0, "official USDG must have deployed code");
        assertEq(IERC20Metadata(CANONICAL_USDG).symbol(), "USDG");
        assertEq(IERC20Metadata(CANONICAL_USDG).decimals(), 6);

        RuleWalletFactory factory = new RuleWalletFactory(ROBINHOOD_MAINNET_CHAIN_ID, CANONICAL_USDG);
        address owner = makeAddr("fork-owner");
        address guardian = makeAddr("fork-guardian");
        address agent = makeAddr("fork-agent");
        address[] memory approvers = new address[](1);
        approvers[0] = makeAddr("fork-approver");
        vm.prank(owner);
        address deployed = factory.deployAccount(guardian, agent, approvers, 1, keccak256("fork"));

        RuleWalletPolicyAccountV2 account = RuleWalletPolicyAccountV2(payable(deployed));
        assertEq(account.canonicalStablecoin(), CANONICAL_USDG);
        assertTrue(account.hasRole(account.OWNER_ROLE(), owner));
        assertTrue(account.hasRole(account.AGENT_ROLE(), agent));
    }
}
