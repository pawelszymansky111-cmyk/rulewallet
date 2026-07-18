# Experimental mainnet release checklist

The code and UI may be published before contracts are deployed. Every unchecked transaction gate blocks autonomous execution and should block meaningful balances.

## Completed in this release

- [x] Chain `4663`, Blockscout, public RPC, and canonical USDG verified against official documentation.
- [x] Testnet `46630` preserved as an isolated V1 environment.
- [x] Versioned CREATE2 factory and personal non-upgradeable V2 accounts implemented.
- [x] Separate owner, agent, approver, and guardian roles implemented.
- [x] Arbitrary calls, generic tokens, approvals, swaps, routers, bridges, and stock-token trading excluded.
- [x] Mandatory agent per-transaction and rolling 24h limits enforced per asset.
- [x] Optional human threshold, request expiry, nonce replay protection, reentrancy guard, and pause implemented.
- [x] Owner withdrawal remains independent of agent limits and available while paused.
- [x] EIP-712 recurring strategies bind chain, account, asset, recipient, amount, nonce, expiry, interval, and execution count.
- [x] Mainnet raw-key path removed; secure non-exportable signer interface fails closed.
- [x] Managed RPC primary/failover supported; public RPC is last-resort read fallback.
- [x] Token-owned durable execution locks and idempotency boundary added.
- [x] Unit, 512-run fuzz, 128×32 invariant, factory, replay, role, token, and optional mainnet-fork tests added.
- [x] Mainnet UI simulates and displays chain, contract, value, calldata, and expected result before wallet signing.

## Required before the first contract signature

- [ ] Freeze a signed release commit/tag and reproduce bytecode on a second machine.
- [ ] Review the complete factory creation payload and constructor arguments.
- [ ] Confirm hardware-wallet sender and sufficient gas independently.
- [ ] Obtain explicit human approval for chain `4663`, value `0`, init code hash, and expected factory state.

## Required after factory deployment

- [ ] Confirm receipt finality and deployed runtime bytecode.
- [ ] Verify source and constructor arguments on Blockscout.
- [ ] Confirm `deploymentChainId=4663`, canonical USDG, version string/hash, and explorer URL.
- [ ] Set the public factory address only after independent review.
- [ ] Verify each personal account's owner, agent, guardian, approver, minimum approvals, and canonical token.

## Required before autonomous mainnet execution

- [ ] Independent smart-contract audit completed; critical/high findings resolved and retested.
- [ ] Static analysis and a live current-state mainnet fork pass from the release commit.
- [ ] KMS/MPC/HSM key is non-exportable, scoped to chain/account/function, rotated, and recovery-tested.
- [ ] Agent has no owner, approver, guardian, or default-admin role.
- [ ] Managed RPC providers are independent and monitored.
- [ ] Durable store, nonce serialization, idempotency, confirmations, and alert delivery tested under failure.
- [ ] Alerts cover role/policy/recipient changes, failures, nonce conflicts, pause, withdrawals, and unusual spend.
- [ ] Guardian pause and owner recovery rehearsed with separate hardware wallets.
- [ ] Small-value canary runs under deliberately restrictive limits.
- [ ] `ENABLE_MAINNET_AUTONOMY=true` approved only for the exact verified environment.

## Ongoing release gates

- [ ] Every owner action remains separately simulated and wallet-signed.
- [ ] Public documentation matches deployed bytecode and addresses.
- [ ] No claim of audit, safety, affiliation, or suitability for large balances is published without evidence.
- [ ] Every new asset or action type receives a separate contract version, tests, review, and migration plan.
