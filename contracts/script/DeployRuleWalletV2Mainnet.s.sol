// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RuleWalletFactory} from "../src/RuleWalletFactory.sol";

/// @notice Deploys only the versioned factory. The CLI must supply a hardware
/// wallet, keystore, or other external signer; this script never reads a key.
contract DeployRuleWalletV2Mainnet is Script {
    uint256 internal constant ROBINHOOD_MAINNET_CHAIN_ID = 4663;
    address internal constant CANONICAL_USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    error WrongChain(uint256 actual);

    function run() external returns (RuleWalletFactory factory) {
        if (block.chainid != ROBINHOOD_MAINNET_CHAIN_ID) revert WrongChain(block.chainid);

        // The signer comes exclusively from explicit Foundry CLI arguments.
        vm.startBroadcast();
        factory = new RuleWalletFactory(ROBINHOOD_MAINNET_CHAIN_ID, CANONICAL_USDG);
        vm.stopBroadcast();

        console2.log("RuleWalletFactory V2", address(factory));
        console2.log("Chain ID", block.chainid);
        console2.log("Canonical USDG", CANONICAL_USDG);
    }
}
