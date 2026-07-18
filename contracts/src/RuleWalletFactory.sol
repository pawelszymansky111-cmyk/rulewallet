// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {RuleWalletPolicyAccountV2} from "./RuleWalletPolicyAccountV2.sol";

/// @title RuleWalletFactory
/// @notice Versioned factory for personal, non-upgradeable RuleWallet V2 accounts.
contract RuleWalletFactory {
    string public constant VERSION = "2.0.0-experimental";
    bytes32 public constant VERSION_HASH = keccak256(bytes(VERSION));

    address public immutable canonicalStablecoin;
    uint256 public immutable deploymentChainId;

    mapping(address owner => address[] accounts) private _accountsByOwner;
    mapping(address account => bytes32 versionHash) public accountVersion;

    error WrongChain(uint256 actual, uint256 expected);
    error ZeroAddress();

    event PolicyAccountDeployed(
        address indexed owner,
        address indexed account,
        address indexed agent,
        address guardian,
        bytes32 versionHash,
        bytes32 userSalt
    );

    constructor(uint256 expectedChainId, address canonicalStablecoinAddress) {
        if (canonicalStablecoinAddress == address(0)) revert ZeroAddress();
        deploymentChainId = expectedChainId;
        canonicalStablecoin = canonicalStablecoinAddress;
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
        account = address(
            new RuleWalletPolicyAccountV2{salt: salt}(
                msg.sender, guardian, agent, approvers, minimumApprovals, canonicalStablecoin
            )
        );
        _accountsByOwner[msg.sender].push(account);
        accountVersion[account] = VERSION_HASH;
        emit PolicyAccountDeployed(msg.sender, account, agent, guardian, VERSION_HASH, userSalt);
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
        bytes memory creationCode = abi.encodePacked(
            type(RuleWalletPolicyAccountV2).creationCode,
            abi.encode(owner, guardian, agent, approvers, minimumApprovals, canonicalStablecoin)
        );
        predicted = address(
            uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(creationCode)))))
        );
    }
}
