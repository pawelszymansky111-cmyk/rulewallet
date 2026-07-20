// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IRuleWalletV3RoleReader {
    function OWNER_ROLE() external view returns (bytes32);
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title RuleWalletPolicyRegistryV3
/// @notice Immutable companion registry for merchant, category, time, and period budgets.
/// @dev Only the paired RuleWallet account can record spend. Configuration requires the
///      current OWNER_ROLE on that account, so owner-role changes remain authoritative.
contract RuleWalletPolicyRegistryV3 {
    uint256 public constant SPEND_BUCKET_SECONDS = 1 hours;
    uint256 public constant SPEND_BUCKET_COUNT = 25;
    uint256 public constant DAY_SECONDS = 1 days;
    uint256 public constant WEEK_SECONDS = 7 days;
    uint256 public constant MONTH_SECONDS = 30 days;
    uint8 public constant MAX_CATEGORY = 8;

    uint8 private constant CODE_ASSET = 1;
    uint8 private constant CODE_MERCHANT = 2;
    uint8 private constant CODE_MERCHANT_ASSET = 3;
    uint8 private constant CODE_CATEGORY = 4;
    uint8 private constant CODE_TIME = 5;
    uint8 private constant CODE_EXPIRED = 6;
    uint8 private constant CODE_CATEGORY_MISMATCH = 7;
    uint8 private constant CODE_ROLLING = 8;
    uint8 private constant CODE_ASSET_DAILY = 9;
    uint8 private constant CODE_ASSET_WEEKLY = 10;
    uint8 private constant CODE_ASSET_MONTHLY = 11;
    uint8 private constant CODE_CATEGORY_DAILY = 12;
    uint8 private constant CODE_CATEGORY_WEEKLY = 13;
    uint8 private constant CODE_CATEGORY_MONTHLY = 14;
    uint8 private constant CODE_MERCHANT_DAILY = 15;
    uint8 private constant CODE_MERCHANT_COUNT = 16;
    uint8 private constant CODE_TRANSACTION = 17;

    struct AssetPolicy {
        bool allowed;
        uint128 maxPerTransaction;
        uint128 maxRolling24Hours;
        uint128 approvalAbove;
        uint128 dailyLimit;
        uint128 weeklyLimit;
        uint128 monthlyLimit;
        uint64 expiresAt;
    }

    struct MerchantPolicy {
        bool trusted;
        bool autonomous;
        uint8 category;
        uint64 expiresAt;
    }

    struct MerchantAssetPolicy {
        bool allowed;
        uint128 maxPerTransaction;
        uint128 dailyLimit;
        uint32 maxTransactionsPerDay;
    }

    struct CategoryBudget {
        bool allowed;
        uint128 dailyLimit;
        uint128 weeklyLimit;
        uint128 monthlyLimit;
        uint64 expiresAt;
    }

    struct TimePolicy {
        bool enabled;
        uint8 weekdays;
        uint16 startMinuteUtc;
        uint16 endMinuteUtc;
    }

    error Unauthorized(address caller);
    error UnsupportedAsset(address asset);
    error InvalidConfiguration(uint8 code, address subject);
    error PolicyViolation(uint8 code, address subject, uint256 actual, uint256 limit);

    event MerchantPolicyChanged(
        address indexed merchant, bool trusted, bool autonomous, uint8 indexed category, uint256 expiresAt
    );
    event MerchantAssetPolicyChanged(
        address indexed merchant,
        address indexed asset,
        bool allowed,
        uint256 maxPerTransaction,
        uint256 dailyLimit,
        uint256 maxTransactionsPerDay
    );
    event MerchantTimePolicyChanged(
        address indexed merchant, bool enabled, uint8 weekdays, uint256 startMinuteUtc, uint256 endMinuteUtc
    );
    event AssetPolicyChanged(
        address indexed asset,
        bool allowed,
        uint256 maxPerTransaction,
        uint256 maxRolling24Hours,
        uint256 approvalAbove,
        uint256 dailyLimit,
        uint256 weeklyLimit,
        uint256 monthlyLimit,
        uint256 expiresAt
    );
    event CategoryBudgetChanged(
        uint8 indexed category,
        address indexed asset,
        bool allowed,
        uint256 dailyLimit,
        uint256 weeklyLimit,
        uint256 monthlyLimit,
        uint256 expiresAt
    );

    address public immutable controller;
    address public immutable canonicalStablecoin;

    mapping(address asset => AssetPolicy policy) public assetPolicies;
    mapping(address merchant => MerchantPolicy policy) public merchantPolicies;
    mapping(address merchant => mapping(address asset => MerchantAssetPolicy policy)) public merchantAssetPolicies;
    mapping(address merchant => TimePolicy policy) public merchantTimePolicies;
    mapping(uint8 category => mapping(address asset => CategoryBudget budget)) public categoryBudgets;
    mapping(address asset => mapping(uint256 hourBucket => uint256 amount)) private _hourlySpend;
    mapping(address asset => mapping(uint256 dayBucket => uint256 amount)) private _assetDailySpend;
    mapping(address asset => mapping(uint256 weekBucket => uint256 amount)) private _assetWeeklySpend;
    mapping(address asset => mapping(uint256 monthBucket => uint256 amount)) private _assetMonthlySpend;
    mapping(uint8 category => mapping(address asset => mapping(uint256 dayBucket => uint256 amount))) private
        _categoryDailySpend;
    mapping(uint8 category => mapping(address asset => mapping(uint256 weekBucket => uint256 amount))) private
        _categoryWeeklySpend;
    mapping(uint8 category => mapping(address asset => mapping(uint256 monthBucket => uint256 amount))) private
        _categoryMonthlySpend;
    mapping(address merchant => mapping(address asset => mapping(uint256 dayBucket => uint256 amount))) private
        _merchantDailySpend;
    mapping(address merchant => mapping(address asset => mapping(uint256 dayBucket => uint32 count))) private
        _merchantDailyTransactions;

    constructor(address controllerAddress, address canonicalStablecoinAddress) {
        if (controllerAddress == address(0) || canonicalStablecoinAddress == address(0)) {
            revert InvalidConfiguration(0, address(0));
        }
        controller = controllerAddress;
        canonicalStablecoin = canonicalStablecoinAddress;
    }

    modifier onlyController() {
        if (msg.sender != controller) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyOwner() {
        IRuleWalletV3RoleReader account = IRuleWalletV3RoleReader(controller);
        if (!account.hasRole(account.OWNER_ROLE(), msg.sender)) revert Unauthorized(msg.sender);
        _;
    }

    function setAssetPolicy(address asset, AssetPolicy calldata policy) external onlyOwner {
        _validateSupportedAsset(asset);
        if (
            policy.allowed
                && (policy.maxPerTransaction == 0
                    || policy.maxRolling24Hours < policy.maxPerTransaction
                    || policy.dailyLimit < policy.maxPerTransaction
                    || policy.weeklyLimit < policy.dailyLimit
                    || policy.monthlyLimit < policy.weeklyLimit
                    || (policy.approvalAbove != 0 && policy.approvalAbove > policy.maxPerTransaction)
                    || policy.expiresAt <= block.timestamp)
        ) revert InvalidConfiguration(CODE_ASSET, asset);
        assetPolicies[asset] = policy;
        emit AssetPolicyChanged(
            asset,
            policy.allowed,
            policy.maxPerTransaction,
            policy.maxRolling24Hours,
            policy.approvalAbove,
            policy.dailyLimit,
            policy.weeklyLimit,
            policy.monthlyLimit,
            policy.expiresAt
        );
    }

    function setMerchantPolicy(address merchant, MerchantPolicy calldata policy) external onlyOwner {
        if (
            merchant == address(0) || (policy.autonomous && !policy.trusted)
                || (policy.trusted && (policy.category > MAX_CATEGORY || policy.expiresAt <= block.timestamp))
        ) revert InvalidConfiguration(CODE_MERCHANT, merchant);
        merchantPolicies[merchant] = policy;
        emit MerchantPolicyChanged(merchant, policy.trusted, policy.autonomous, policy.category, policy.expiresAt);
    }

    function setMerchantAssetPolicy(address merchant, address asset, MerchantAssetPolicy calldata policy)
        external
        onlyOwner
    {
        _validateSupportedAsset(asset);
        if (
            merchant == address(0)
                || (policy.allowed
                    && (policy.maxPerTransaction == 0
                        || policy.dailyLimit < policy.maxPerTransaction
                        || policy.maxTransactionsPerDay == 0))
        ) revert InvalidConfiguration(CODE_MERCHANT_ASSET, merchant);
        merchantAssetPolicies[merchant][asset] = policy;
        emit MerchantAssetPolicyChanged(
            merchant, asset, policy.allowed, policy.maxPerTransaction, policy.dailyLimit, policy.maxTransactionsPerDay
        );
    }

    function setCategoryBudget(uint8 category, address asset, CategoryBudget calldata budget) external onlyOwner {
        _validateSupportedAsset(asset);
        if (
            category > MAX_CATEGORY
                || (budget.allowed
                    && (budget.dailyLimit == 0
                        || budget.weeklyLimit < budget.dailyLimit
                        || budget.monthlyLimit < budget.weeklyLimit
                        || budget.expiresAt <= block.timestamp))
        ) revert InvalidConfiguration(CODE_CATEGORY, address(uint160(category)));
        categoryBudgets[category][asset] = budget;
        emit CategoryBudgetChanged(
            category,
            asset,
            budget.allowed,
            budget.dailyLimit,
            budget.weeklyLimit,
            budget.monthlyLimit,
            budget.expiresAt
        );
    }

    function setMerchantTimePolicy(address merchant, TimePolicy calldata policy) external onlyOwner {
        if (
            merchant == address(0)
                || (policy.enabled
                    && (policy.weekdays == 0 || policy.startMinuteUtc >= 1440 || policy.endMinuteUtc >= 1440))
        ) revert InvalidConfiguration(CODE_TIME, merchant);
        merchantTimePolicies[merchant] = policy;
        emit MerchantTimePolicyChanged(
            merchant, policy.enabled, policy.weekdays, policy.startMinuteUtc, policy.endMinuteUtc
        );
    }

    function validatePayment(address recipient, address asset, uint256 amount, uint8 category)
        external
        view
        returns (bool requiresApproval)
    {
        requiresApproval = _validatePayment(recipient, asset, amount, category);
    }

    function validateAndRecordPayment(address recipient, address asset, uint256 amount, uint8 category)
        external
        onlyController
        returns (bool requiresApproval)
    {
        requiresApproval = _validatePayment(recipient, asset, amount, category);
        _recordSpend(recipient, asset, amount, category);
    }

    function rollingSpent(address asset) public view returns (uint256 spent) {
        uint256 currentBucket = block.timestamp / SPEND_BUCKET_SECONDS;
        for (uint256 i; i < SPEND_BUCKET_COUNT; ++i) {
            if (currentBucket < i) break;
            spent += _hourlySpend[asset][currentBucket - i];
        }
    }

    function assetPeriodSpend(address asset) external view returns (uint256 daily, uint256 weekly, uint256 monthly) {
        daily = _assetDailySpend[asset][block.timestamp / DAY_SECONDS];
        weekly = _assetWeeklySpend[asset][block.timestamp / WEEK_SECONDS];
        monthly = _assetMonthlySpend[asset][block.timestamp / MONTH_SECONDS];
    }

    function categoryPeriodSpend(uint8 category, address asset)
        external
        view
        returns (uint256 daily, uint256 weekly, uint256 monthly)
    {
        daily = _categoryDailySpend[category][asset][block.timestamp / DAY_SECONDS];
        weekly = _categoryWeeklySpend[category][asset][block.timestamp / WEEK_SECONDS];
        monthly = _categoryMonthlySpend[category][asset][block.timestamp / MONTH_SECONDS];
    }

    function merchantDailySpend(address merchant, address asset) external view returns (uint256 amount, uint256 count) {
        uint256 dayBucket = block.timestamp / DAY_SECONDS;
        amount = _merchantDailySpend[merchant][asset][dayBucket];
        count = _merchantDailyTransactions[merchant][asset][dayBucket];
    }

    function _validatePayment(address recipient, address asset, uint256 amount, uint8 category)
        private
        view
        returns (bool requiresApproval)
    {
        _validateSupportedAsset(asset);
        MerchantPolicy memory merchant = merchantPolicies[recipient];
        if (!merchant.trusted) revert PolicyViolation(CODE_MERCHANT, recipient, 0, 1);
        if (merchant.expiresAt < block.timestamp) {
            revert PolicyViolation(CODE_EXPIRED, recipient, block.timestamp, merchant.expiresAt);
        }
        if (merchant.category != category) {
            revert PolicyViolation(CODE_CATEGORY_MISMATCH, recipient, category, merchant.category);
        }

        AssetPolicy memory assetPolicy = assetPolicies[asset];
        if (!assetPolicy.allowed) revert PolicyViolation(CODE_ASSET, asset, 0, 1);
        if (assetPolicy.expiresAt < block.timestamp) {
            revert PolicyViolation(CODE_EXPIRED, asset, block.timestamp, assetPolicy.expiresAt);
        }
        _requireLimit(CODE_TRANSACTION, asset, amount, assetPolicy.maxPerTransaction);
        _requireLimit(CODE_ROLLING, asset, rollingSpent(asset) + amount, assetPolicy.maxRolling24Hours);

        MerchantAssetPolicy memory merchantAsset = merchantAssetPolicies[recipient][asset];
        if (!merchantAsset.allowed) revert PolicyViolation(CODE_MERCHANT_ASSET, recipient, 0, 1);
        _requireLimit(CODE_TRANSACTION, recipient, amount, merchantAsset.maxPerTransaction);

        CategoryBudget memory categoryPolicy = categoryBudgets[category][asset];
        if (!categoryPolicy.allowed) revert PolicyViolation(CODE_CATEGORY, recipient, 0, 1);
        if (categoryPolicy.expiresAt < block.timestamp) {
            revert PolicyViolation(CODE_EXPIRED, recipient, block.timestamp, categoryPolicy.expiresAt);
        }

        _validateTime(recipient);
        _validatePeriodBudgets(recipient, asset, amount, category, assetPolicy, categoryPolicy, merchantAsset);
        requiresApproval =
            !merchant.autonomous || (assetPolicy.approvalAbove != 0 && amount > assetPolicy.approvalAbove);
    }

    function _validatePeriodBudgets(
        address recipient,
        address asset,
        uint256 amount,
        uint8 category,
        AssetPolicy memory assetPolicy,
        CategoryBudget memory categoryPolicy,
        MerchantAssetPolicy memory merchantAsset
    ) private view {
        uint256 dayBucket = block.timestamp / DAY_SECONDS;
        uint256 weekBucket = block.timestamp / WEEK_SECONDS;
        uint256 monthBucket = block.timestamp / MONTH_SECONDS;
        _requireLimit(CODE_ASSET_DAILY, asset, _assetDailySpend[asset][dayBucket] + amount, assetPolicy.dailyLimit);
        _requireLimit(CODE_ASSET_WEEKLY, asset, _assetWeeklySpend[asset][weekBucket] + amount, assetPolicy.weeklyLimit);
        _requireLimit(
            CODE_ASSET_MONTHLY, asset, _assetMonthlySpend[asset][monthBucket] + amount, assetPolicy.monthlyLimit
        );
        _requireLimit(
            CODE_CATEGORY_DAILY,
            recipient,
            _categoryDailySpend[category][asset][dayBucket] + amount,
            categoryPolicy.dailyLimit
        );
        _requireLimit(
            CODE_CATEGORY_WEEKLY,
            recipient,
            _categoryWeeklySpend[category][asset][weekBucket] + amount,
            categoryPolicy.weeklyLimit
        );
        _requireLimit(
            CODE_CATEGORY_MONTHLY,
            recipient,
            _categoryMonthlySpend[category][asset][monthBucket] + amount,
            categoryPolicy.monthlyLimit
        );
        _requireLimit(
            CODE_MERCHANT_DAILY,
            recipient,
            _merchantDailySpend[recipient][asset][dayBucket] + amount,
            merchantAsset.dailyLimit
        );
        _requireLimit(
            CODE_MERCHANT_COUNT,
            recipient,
            uint256(_merchantDailyTransactions[recipient][asset][dayBucket]) + 1,
            merchantAsset.maxTransactionsPerDay
        );
    }

    function _validateTime(address merchant) private view {
        TimePolicy memory policy = merchantTimePolicies[merchant];
        if (!policy.enabled) return;
        uint256 weekday = (block.timestamp / DAY_SECONDS + 4) % 7;
        if ((uint256(policy.weekdays) & (uint256(1) << weekday)) == 0) {
            revert PolicyViolation(CODE_TIME, merchant, weekday, policy.weekdays);
        }
        uint256 minuteUtc = (block.timestamp % DAY_SECONDS) / 1 minutes;
        if (policy.startMinuteUtc == policy.endMinuteUtc) return;
        bool allowed = policy.startMinuteUtc < policy.endMinuteUtc
            ? minuteUtc >= policy.startMinuteUtc && minuteUtc < policy.endMinuteUtc
            : minuteUtc >= policy.startMinuteUtc || minuteUtc < policy.endMinuteUtc;
        if (!allowed) revert PolicyViolation(CODE_TIME, merchant, minuteUtc, policy.endMinuteUtc);
    }

    function _recordSpend(address recipient, address asset, uint256 amount, uint8 category) private {
        uint256 dayBucket = block.timestamp / DAY_SECONDS;
        uint256 weekBucket = block.timestamp / WEEK_SECONDS;
        uint256 monthBucket = block.timestamp / MONTH_SECONDS;
        _hourlySpend[asset][block.timestamp / SPEND_BUCKET_SECONDS] += amount;
        _assetDailySpend[asset][dayBucket] += amount;
        _assetWeeklySpend[asset][weekBucket] += amount;
        _assetMonthlySpend[asset][monthBucket] += amount;
        _categoryDailySpend[category][asset][dayBucket] += amount;
        _categoryWeeklySpend[category][asset][weekBucket] += amount;
        _categoryMonthlySpend[category][asset][monthBucket] += amount;
        _merchantDailySpend[recipient][asset][dayBucket] += amount;
        _merchantDailyTransactions[recipient][asset][dayBucket] += 1;
    }

    function _validateSupportedAsset(address asset) private view {
        if (asset != address(0) && asset != canonicalStablecoin) revert UnsupportedAsset(asset);
    }

    function _requireLimit(uint8 code, address subject, uint256 actual, uint256 limit) private pure {
        if (actual > limit) revert PolicyViolation(code, subject, actual, limit);
    }
}
