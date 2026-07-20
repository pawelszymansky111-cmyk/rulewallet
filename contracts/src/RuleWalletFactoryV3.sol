// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RuleWalletAccountDeployerV3} from "./RuleWalletAccountDeployerV3.sol";
import {RuleWalletPolicyAccountV3} from "./RuleWalletPolicyAccountV3.sol";
import {RuleWalletPolicyRegistryDeployerV3} from "./RuleWalletPolicyRegistryDeployerV3.sol";

/// @title RuleWalletFactoryV3
/// @notice Versioned factory for personal, non-upgradeable RuleWallet commerce accounts.
contract RuleWalletFactoryV3 {
    string public constant VERSION = "3.1.0-commerce-beta";
    bytes32 public constant VERSION_HASH = keccak256(bytes(VERSION));

    address public immutable canonicalStablecoin;
    uint256 public immutable deploymentChainId;
    RuleWalletAccountDeployerV3 public immutable accountDeployer;
    RuleWalletPolicyRegistryDeployerV3 public immutable registryDeployer;

    mapping(address owner => address[] accounts) private _accountsByOwner;
    mapping(address account => bytes32 versionHash) public accountVersion;

    error WrongChain(uint256 actual, uint256 expected);
    error ZeroAddress();

    event PolicyAccountDeployed(
        address indexed owner,
        address indexed account,
        address indexed registry,
        address agent,
        address guardian,
        bytes32 versionHash,
        bytes32 userSalt
    );

    constructor(uint256 expectedChainId, address canonicalStablecoinAddress) {
        if (canonicalStablecoinAddress == address(0)) revert ZeroAddress();
        deploymentChainId = expectedChainId;
        canonicalStablecoin = canonicalStablecoinAddress;
        registryDeployer = new RuleWalletPolicyRegistryDeployerV3();
        accountDeployer = new RuleWalletAccountDeployerV3(address(this));
    }

    function deployAccount(
        address guardian,
        address agent,
        address[] calldata approvers,
        uint8 minimumApprovals,
        bytes32 userSalt
    ) external returns (address account) {
        if (block.chainid != deploymentChainId) {
            revert WrongChain(block.chainid, deploymentChainId);
        }
        bytes32 salt = keccak256(abi.encode(msg.sender, userSalt, VERSION_HASH));
        account = accountDeployer.deployAccount(
            msg.sender,
            guardian,
            agent,
            approvers,
            minimumApprovals,
            canonicalStablecoin,
            address(registryDeployer),
            salt
        );
        _accountsByOwner[msg.sender].push(account);
        accountVersion[account] = VERSION_HASH;
        emit PolicyAccountDeployed(
            msg.sender,
            account,
            address(RuleWalletPolicyAccountV3(payable(account)).policyRegistry()),
            agent,
            guardian,
            VERSION_HASH,
            userSalt
        );
    }

    function accountsOf(address owner) external view returns (address[] memory) {
        return _accountsByOwner[owner];
    }

    function predictAccountAddress(
        address owner,
        address guardian,
        address agent,
        address[] calldata approvers,
        uint8 minimumApprovals,
        bytes32 userSalt
    ) external view returns (address predicted) {
        bytes32 salt = keccak256(abi.encode(owner, userSalt, VERSION_HASH));
        predicted = accountDeployer.predictAccountAddress(
            owner, guardian, agent, approvers, minimumApprovals, canonicalStablecoin, address(registryDeployer), salt
        );
    }
}
