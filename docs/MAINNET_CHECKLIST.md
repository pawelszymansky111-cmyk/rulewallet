# V3 mainnet release checklist

Publishing code or a frontend is not the same as activating a real-funds system. Every incomplete transaction/automation gate stays visible in `/api/mainnet/status` and keeps the signer fail-closed.

## Implemented in the release

- [x] Official mainnet `4663`, testnet `46630`, explorers, RPC fallbacks, ETH gas, and canonical USDG registry.
- [x] Six-decimal USDG construction, display, strategy, receipt, and fork coverage.
- [x] Versioned non-upgradeable V3 factory, CREATE2 account deployer, and paired registry deployer.
- [x] Exact immutable-linked factory/helper runtime verification and account/registry provenance.
- [x] Separate owner, agent, approver, guardian, and delayed-default-admin boundaries.
- [x] Duplicate/colliding operational roles and impossible approval thresholds rejected.
- [x] Native ETH and canonical USDG direct transfers only.
- [x] Per-transaction, rolling 24-hour, daily, weekly, 30-day, merchant, category, count, time, and expiry rules.
- [x] Trusted merchant enable/revoke and explicit automatic-payment permission.
- [x] EIP-712 V3 strategies bind chain, account, asset, merchant, amount, category, intent, nonce, expiry, interval, and executions.
- [x] EIP-712 approval nonce/expiry/replay protection and pending-request revalidation.
- [x] Agent/strategy revocation, emergency pause, owner unpause, and owner withdrawal.
- [x] Passkey/embedded or external-wallet onboarding and multiple named personal accounts.
- [x] Mainnet raw-key path excluded; external KMS signer identity required.
- [x] Signer-global nonce locking, pending reservation, RPC agreement, fee ceilings, confirmations, replacement/timeout/late reconciliation, and alerts.
- [x] Unit, component, desktop/mobile Playwright, fuzz, invariant, malicious-token, provenance, signer, provider, and current-state fork tests.
- [x] Embedded-wallet create/recovery/export UI coverage and four-step owner/default-admin transfer regression coverage.
- [x] Exact chain/target/value/calldata/gas/result preview before every owner transaction.
- [x] Commerce quote/cart/order/approval states and honest provider capability registry.

## Before the first V3 factory signature

- [ ] Freeze a signed release commit/tag and reproduce artifacts on a second machine.
- [ ] Run the entire `npm run verify` suite and high-severity dependency audit from that commit.
- [ ] Review chain `4663`, value `0`, complete init code, constructor, nonce, predicted factory/helpers, gas, and expected result.
- [ ] Use a dedicated hardware wallet and independently confirm its address/gas balance.
- [ ] Sign only the exact transaction displayed by `/app/operator`.

## After factory deployment

- [ ] Confirm receipt/finality and verify source/constructor arguments on Blockscout.
- [ ] Match factory, account-deployer, and registry-deployer runtime hashes from a second machine.
- [ ] Confirm version `3.1.0-commerce-beta`, chain `4663`, and canonical USDG.
- [ ] Set `NEXT_PUBLIC_RULEWALLET_MAINNET_V3_FACTORY_ADDRESS` only after verification.
- [ ] Deploy one canary personal account with distinct owner/guardian/agent/approver addresses.
- [ ] Verify factory account version, registry controller, stablecoin, roles, thresholds, and every configured rule.

## Before real autonomous payment

- [ ] External specialist contract review completed and confirmed critical/high findings resolved.
- [ ] KMS/MPC/HSM key non-exportable, scoped to chain/account/V3 selector, recovery-tested, and monitored.
- [ ] Agent holds no owner, approver, guardian, or default-admin role.
- [ ] Two independent managed RPC hosts and strict signer/application fee ceilings configured.
- [ ] Redis locks/idempotency/pending nonces tested under concurrency and outage.
- [ ] A random 32-byte `MAINNET_STRATEGY_ENCRYPTION_KEY` is configured server-side and restore/key-rotation is rehearsed.
- [ ] A separate random 32-byte `COMMERCE_SESSION_SECRET` is configured server-side; private order and approval routes reject unsigned sessions.
- [ ] A different random 32-byte `COMMERCE_DATA_ENCRYPTION_KEY` is configured; Redis contains only authenticated ciphertext envelopes for private commerce records.
- [ ] Alert receivers verify HMAC signatures, enforce the five-minute timestamp window, and atomically reject repeated delivery IDs.
- [ ] Authenticated scheduler and alert delivery configured and failure-tested.
- [ ] Guardian pause, agent revocation, strategy revocation, and owner recovery rehearsed.
- [ ] Restrictive canary policy uses a verified recipient and disposable balance.
- [ ] `/api/mainnet/status` reports every gate ready.
- [ ] `ENABLE_MAINNET_AUTONOMY` changes from `false` to `true` only after the canary review.

## Before a commerce provider can purchase

- [ ] Provider production agreement and credentials exist.
- [ ] Price/availability recheck and idempotent order creation implemented.
- [ ] Payment recipient/virtual-card boundary is tied to onchain policy.
- [ ] Signed webhook verification, refunds, cancellations, partial fulfillment, and reconciliation implemented.
- [ ] Provider fault-injection tests and a sandbox-to-live checklist pass.
- [ ] Capability registry changes to `canPurchase=true` only for the completed adapter.

## Ongoing

- [ ] Every owner action remains simulated and wallet-signed.
- [ ] Production addresses, source, artifacts, docs, and frontend release remain in sync.
- [ ] No claim of audit, affiliation, guaranteed safety, or completed provider purchase is made without evidence.
- [ ] Any new asset or external-call surface requires a new contract version, tests, review, and explicit migration.
