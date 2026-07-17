// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USD", "mUSD") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}
contract FalseReturnToken {
    mapping(address => uint256) public balanceOf;

    function mint(address recipient, uint256 amount) external {
        balanceOf[recipient] += amount;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }
}
