// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {RuleWalletFactoryV3} from "../src/RuleWalletFactoryV3.sol";
import {RuleWalletPolicyAccountV3} from "../src/RuleWalletPolicyAccountV3.sol";
import {RuleWalletPolicyRegistryV3} from "../src/RuleWalletPolicyRegistryV3.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract RuleWalletV3Handler is Test {
    RuleWalletPolicyAccountV3 public immutable account;
    address public immutable agent;
    address public immutable merchant;
    uint256 public nonce;

    constructor(RuleWalletPolicyAccountV3 account_, address agent_, address merchant_) {
        account = account_;
        agent = agent_;
        merchant = merchant_;
    }

    function executeBounded(uint128 rawAmount) external {
        uint128 amount = uint128(bound(rawAmount, 1, 0.2 ether));
        vm.prank(agent);
        try account.requestNativeTransfer(
            merchant, amount, 1, keccak256(abi.encode("invariant", nonce)), uint64(block.timestamp + 1 hours), nonce
        ) {
            nonce += 1;
        } catch {}
    }

    function moveTime(uint32 secondsForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 1, 2 hours));
    }
}

contract RuleWalletV3InvariantTest is StdInvariant, Test {
    RuleWalletPolicyAccountV3 internal account;
    RuleWalletPolicyRegistryV3 internal registry;
    address internal merchant;

    function setUp() public {
        address owner = makeAddr("v3-invariant-owner");
        address guardian = makeAddr("v3-invariant-guardian");
        address agent = makeAddr("v3-invariant-agent");
        address approver = makeAddr("v3-invariant-approver");
        merchant = makeAddr("v3-invariant-merchant");
        MockERC20 usdg = new MockERC20();
        RuleWalletFactoryV3 factory = new RuleWalletFactoryV3(block.chainid, address(usdg));
        address[] memory approvers = new address[](1);
        approvers[0] = approver;

        vm.prank(owner);
        account = RuleWalletPolicyAccountV3(
            payable(factory.deployAccount(guardian, agent, approvers, 1, keccak256("v3-invariant")))
        );
        registry = account.policyRegistry();
        uint64 expiry = uint64(block.timestamp + 365 days);
        vm.startPrank(owner);
        registry.setAssetPolicy(
            address(0),
            RuleWalletPolicyRegistryV3.AssetPolicy(true, 0.2 ether, 1 ether, 0, 1.5 ether, 4 ether, 8 ether, expiry)
        );
        registry.setMerchantPolicy(merchant, RuleWalletPolicyRegistryV3.MerchantPolicy(true, true, 1, expiry));
        registry.setMerchantAssetPolicy(
            merchant, address(0), RuleWalletPolicyRegistryV3.MerchantAssetPolicy(true, 0.2 ether, 1 ether, 20)
        );
        registry.setCategoryBudget(
            1, address(0), RuleWalletPolicyRegistryV3.CategoryBudget(true, 1.2 ether, 3 ether, 6 ether, expiry)
        );
        vm.stopPrank();
        vm.deal(address(account), 100 ether);

        RuleWalletV3Handler handler = new RuleWalletV3Handler(account, agent, merchant);
        targetContract(address(handler));
    }

    function invariant_RollingSpendNeverExceedsOwnerLimit() public view {
        assertLe(registry.rollingSpent(address(0)), 1 ether);
    }

    function invariant_AllCurrentPeriodBudgetsRemainBounded() public view {
        (uint256 assetDaily, uint256 assetWeekly, uint256 assetMonthly) = registry.assetPeriodSpend(address(0));
        (uint256 categoryDaily, uint256 categoryWeekly, uint256 categoryMonthly) =
            registry.categoryPeriodSpend(1, address(0));
        (uint256 merchantDaily, uint256 merchantCount) = registry.merchantDailySpend(merchant, address(0));
        assertLe(assetDaily, 1.5 ether);
        assertLe(assetWeekly, 4 ether);
        assertLe(assetMonthly, 8 ether);
        assertLe(categoryDaily, 1.2 ether);
        assertLe(categoryWeekly, 3 ether);
        assertLe(categoryMonthly, 6 ether);
        assertLe(merchantDaily, 1 ether);
        assertLe(merchantCount, 20);
    }

    function invariant_ApprovalThresholdNeverExceedsActiveApprovers() public view {
        assertLe(account.minimumApprovals(), account.activeApproverCount());
    }
}
