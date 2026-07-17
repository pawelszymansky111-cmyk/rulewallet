// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RuleWalletPolicyAccount} from "../../src/RuleWalletPolicyAccount.sol";

contract ReentrantRecipient {
    RuleWalletPolicyAccount public immutable account;
    bool public attempted;
    bool public reentrySucceeded;

    constructor(RuleWalletPolicyAccount account_) {
        account = account_;
    }

    receive() external payable {
        attempted = true;
        try account.requestNativeCall(address(this), 1, "", 0, uint64(block.timestamp + 1 hours), 1) {
            reentrySucceeded = true;
        } catch {
            reentrySucceeded = false;
        }
    }
}
