# Mainnet product plan

Robinhood Chain mainnet is live on chain ID `4663`, but RuleWallet remains intentionally locked to testnet. This file defines the shortest responsible path from the working self-service MVP to a real-funds product.

## What is functional now

- A user can deploy or select a wallet-owned policy account.
- The interface verifies contract code and the connected admin role.
- Trusted recipient addresses can be labeled locally, simulated, enabled, disabled, and verified onchain.
- Every permission change requires an explicit wallet signature.
- Official ecosystem services are discoverable without pretending that a listing makes a contract safe.

## Phase 1 — production contract boundary

1. Replace generic native calls to protocol contracts with dedicated adapters.
2. Each adapter must allow only reviewed function selectors and validate input token, output token, recipient, amount, deadline, and minimum output.
3. Add ERC-4337/session-key support with short expiry, revocation, and narrowly scoped permissions.
4. Add contract migration tooling because the current account is deliberately non-upgradeable.
5. Complete static analysis, fork tests, fuzz/invariant tests, and two independent audits.

## Phase 2 — account and operations

1. Transfer default administration to a verified multisig with independent owners.
2. Separate guardian, approver, and agent keys; use managed signing or hardware-backed custody.
3. Replace public RPC fallback with managed primary and failover providers.
4. Index contract events into a durable, append-only receipt store.
5. Add balance, role, permission, failure-rate, RPC-latency, and unusual-calldata alerts.
6. Add encrypted cross-device labels only after a privacy and account-recovery design review.

## Phase 3 — controlled launch

1. Reproduce and verify deployment bytecode from a signed release tag.
2. Publish exact chain, contract, adapter, multisig, and token addresses.
3. Run pause, signer-loss, RPC-failure, and recovery rehearsals.
4. Launch with a small canary account, restrictive per-call and rolling limits, and no unattended protocol calls.
5. Expand assets, adapters, and automation only after monitored canary evidence.

## Activation rule

`ENABLE_MAINNET` stays `false` and mainnet stays absent from the wallet configuration until every mandatory item in `MAINNET_CHECKLIST.md` has linked evidence and the exact release receives explicit written approval. A mainnet chain RPC existing is not permission to expose real-funds writes.
