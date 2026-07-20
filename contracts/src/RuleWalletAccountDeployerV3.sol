// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RuleWalletPolicyAccountV3} from "./RuleWalletPolicyAccountV3.sol";

/// @notice Dedicated CREATE2 deployer keeps account creation code out of the factory runtime.
contract RuleWalletAccountDeployerV3 {
    address public immutable factory;

    error Unauthorized(address caller);

    constructor(address factoryAddress) {
        factory = factoryAddress;
    }

    function deployAccount(
        address owner,
        address guardian,
        address agent,
        address[] calldata approvers,
        uint8 minimumApprovals,
        address canonicalStablecoin,
        address registryDeployer,
        bytes32 salt
    ) external returns (address account) {
        if (msg.sender != factory) revert Unauthorized(msg.sender);
        account = address(
            new RuleWalletPolicyAccountV3{salt: salt}(
                owner, guardian, agent, approvers, minimumApprovals, canonicalStablecoin, registryDeployer
            )
        );
    }

    function predictAccountAddress(
        address owner,
        address guardian,
        address agent,
        address[] calldata approvers,
        uint8 minimumApprovals,
        address canonicalStablecoin,
        address registryDeployer,
        bytes32 salt
    ) external view returns (address predicted) {
        bytes memory creationCode = abi.encodePacked(
            type(RuleWalletPolicyAccountV3).creationCode,
            abi.encode(owner, guardian, agent, approvers, minimumApprovals, canonicalStablecoin, registryDeployer)
        );
        predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(creationCode)))))
        );
    }
}
