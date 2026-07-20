// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RuleWalletPolicyRegistryV3} from "./RuleWalletPolicyRegistryV3.sol";

/// @notice Dedicated CREATE2 deployer keeps registry creation code out of the factory runtime.
contract RuleWalletPolicyRegistryDeployerV3 {
    mapping(address controller => address registry) public registryOf;

    error AlreadyDeployed(address controller, address registry);

    function deploy(address canonicalStablecoin) external returns (RuleWalletPolicyRegistryV3 registry) {
        address existing = registryOf[msg.sender];
        if (existing != address(0)) revert AlreadyDeployed(msg.sender, existing);
        bytes32 salt = keccak256(abi.encode(msg.sender, canonicalStablecoin));
        registry = new RuleWalletPolicyRegistryV3{salt: salt}(msg.sender, canonicalStablecoin);
        registryOf[msg.sender] = address(registry);
    }

    function predict(address controller, address canonicalStablecoin) external view returns (address predicted) {
        bytes32 salt = keccak256(abi.encode(controller, canonicalStablecoin));
        bytes memory creationCode = abi.encodePacked(
            type(RuleWalletPolicyRegistryV3).creationCode, abi.encode(controller, canonicalStablecoin)
        );
        predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(creationCode)))))
        );
    }
}
