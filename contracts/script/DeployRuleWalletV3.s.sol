// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {RuleWalletFactoryV3} from "../src/RuleWalletFactoryV3.sol";

/// @notice Builds the exact V3 deployment transaction for an interactive signer.
/// @dev The script never reads a private key. Use a hardware wallet or connected
///      wallet and omit --broadcast for the mandatory dry run.
contract DeployRuleWalletV3 is Script {
    uint256 private constant MAINNET_CHAIN_ID = 4663;
    uint256 private constant TESTNET_CHAIN_ID = 46630;
    address private constant MAINNET_USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    error UnsupportedChain(uint256 chainId);
    error InvalidStablecoin(address stablecoin);

    function run() external returns (RuleWalletFactoryV3 factory) {
        address stablecoin;
        if (block.chainid == MAINNET_CHAIN_ID) {
            stablecoin = MAINNET_USDG;
        } else if (block.chainid == TESTNET_CHAIN_ID) {
            stablecoin = vm.envAddress("RULEWALLET_TESTNET_STABLECOIN_ADDRESS");
        } else {
            revert UnsupportedChain(block.chainid);
        }
        if (stablecoin == address(0)) revert InvalidStablecoin(stablecoin);

        vm.startBroadcast();
        factory = new RuleWalletFactoryV3(block.chainid, stablecoin);
        vm.stopBroadcast();
    }
}
