# RuleWallet V3 user guide

## 1. Create or connect a wallet

Open `/command`. If Privy is configured, sign in with passkey/email and create an embedded wallet; otherwise connect an EVM wallet. RuleWallet never asks for a seed phrase. For low-value beta role separation you may create additional embedded addresses; for serious use choose independently recovered/hardware owner, guardian, and approver wallets.

## 2. Create a named policy account

Choose testnet first. Enter a name and distinct guardian, agent, and approver addresses. Select **Simulate exact deployment**. Review chain, pinned factory, predicted account, zero value, roles, and calldata. Only then select **Sign deployment in wallet**.

If the V3 factory/token is missing or fails exact runtime verification, deployment stays disabled and `/app/operator` shows the operator setup.

## 3. Add spending rules

In **Spending rules**, enter the new V3 account and merchant/provider payment address. Configure:

- ETH or six-decimal USDG;
- merchant category and expiry;
- whether payments inside every rule may skip confirmation;
- per-transaction and rolling 24-hour caps;
- daily, weekly, and 30-day asset/category caps;
- merchant daily amount and transactions per day;
- weekday bitmap and UTC-minute window.

Prepare and sign the asset, merchant, merchant/asset, category, and time steps separately. Activate only after each readback matches. Every preview shows exact chain, target, gas, calldata, and expected result.

## 4. Ask RuleWallet

Choose a provider and describe the purchase. Duffel can return official test-mode flight offers when its test token is configured. Ticketmaster can return official discovery results and a hosted checkout link. Other adapters are clearly marked demo/disabled.

Creating a cart runs an explanatory policy decision and, when needed, creates an approval request. No provider search/cart action alone moves funds.

## 5. Approve an exception

Open `/approvals` from the independent approver/owner context. Review order, account, merchant, exact amount, reason, nonce, and five-minute expiry. The EIP-712 signature is bound to that decision and single-use. Onchain payment requests still require the active approver role and recheck every hard policy at execution.

## 6. Scheduled payments

On `/mainnet`, enter a verified V3 account, trusted merchant, exact asset/amount, category, commerce intent, nonce, expiry, interval, and maximum executions. Preview the EIP-712 digest. Mainnet strategy activation remains unavailable until `/api/mainnet/status` reports every non-exportable-signer and production gate ready.

Pause the offchain schedule when temporarily unnecessary. Revoke the digest onchain to disable it permanently.

## 7. Emergency and recovery

- Guardian or owner: simulate and sign `pause()` immediately.
- Owner: revoke the agent role and affected strategies.
- Owner: verify chain, account, asset, amount, recovery recipient, and calldata before a withdrawal.
- Owner only: unpause after the incident runbook's recovery gates pass.

Frontend rollback cannot reverse a blockchain payment. Follow [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).

## 8. Verify receipts

Open `/activity` and the linked Blockscout transaction. A provider order also needs provider-side confirmation; a chain receipt alone proves only the blockchain transfer.
