// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RuleWalletPolicyAccount} from "../src/RuleWalletPolicyAccount.sol";

contract DeployRuleWallet is Script {
    function run() external returns (RuleWalletPolicyAccount account) {
        address admin = vm.envAddress("RULEWALLET_ADMIN");
        address guardian = vm.envAddress("RULEWALLET_GUARDIAN");
        address agent = vm.envAddress("RULEWALLET_AGENT");
        address approverOne = vm.envAddress("RULEWALLET_APPROVER_ONE");
        address approverTwo = vm.envAddress("RULEWALLET_APPROVER_TWO");

        address[] memory approvers = new address[](2);
        approvers[0] = approverOne;
        approvers[1] = approverTwo;

        // The signer comes from the Foundry CLI (hardware wallet, keystore, or
        // interactive wallet). No deployer key is read by this script.
        vm.startBroadcast();
        account = new RuleWalletPolicyAccount(admin, guardian, agent, approvers, 2);
        vm.stopBroadcast();

        console2.log("RuleWalletPolicyAccount", address(account));
    }
}
