// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";

contract RobinhoodTestnetIntegrationTest is Test {
    function testFork_RobinhoodChainWhenRpcIsConfigured() external {
        string memory rpcUrl = vm.envOr("RH_TESTNET_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) {
            console2.log("RH_TESTNET_RPC_URL not configured; live fork assertion skipped");
            return;
        }

        vm.createSelectFork(rpcUrl);
        assertEq(block.chainid, 46_630);
        assertGt(block.number, 0);
    }
}
