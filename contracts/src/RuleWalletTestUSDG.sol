// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title RuleWallet Test USDG
/// @notice Valueless six-decimal test token for Robinhood Chain testnet demos only.
contract RuleWalletTestUSDG is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 * 1e6;
    uint256 public constant FAUCET_COOLDOWN = 1 days;
    uint256 public immutable deploymentChainId;
    mapping(address account => uint256 timestamp) public nextFaucetAt;

    error MainnetForbidden();
    error WrongChain(uint256 actual, uint256 expected);
    error FaucetCooldown(uint256 nextAvailableAt);

    constructor(uint256 expectedChainId) ERC20("RuleWallet Test USDG", "tUSDG") {
        if (expectedChainId == 4663) revert MainnetForbidden();
        if (block.chainid != expectedChainId) revert WrongChain(block.chainid, expectedChainId);
        deploymentChainId = expectedChainId;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function faucet() external {
        uint256 availableAt = nextFaucetAt[msg.sender];
        if (block.timestamp < availableAt) revert FaucetCooldown(availableAt);
        nextFaucetAt[msg.sender] = block.timestamp + FAUCET_COOLDOWN;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
