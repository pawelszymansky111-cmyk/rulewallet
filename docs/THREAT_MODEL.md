# Threat model

## Security-beta additions

- Queued requests are hostile inputs: execution revalidates the originating agent role, strategy revocation/expiry, active unique approvals, recipient, pause, and current limits.
- Expected-looking factory getters are not provenance. Only the pinned runtime hash plus the exact factory's deployment record is accepted.
- RPC and signer services are separate trust domains. Future signing requires two agreeing RPCs, a signer-global nonce lock, strict fees, HTTPS hostname pinning, and a real signer identity attestation.
- Environment flags cannot enable mainnet autonomy in this release.

## Assets and trust boundaries

- ETH and canonical USDG held by each personal V2 account;
- owner policies, role assignments, trusted recipients, rolling spend, strategy state, and pending approvals;
- the exact transaction intent shown before a wallet signature;
- KMS/MPC/HSM authorization, RPC credentials, durable locks, and confirmation records;
- notification event contents, webhook credentials, and operational alert destinations;
- factory/account bytecode, source verification, frontend artifacts, and deployment metadata.

The contract is trusted to enforce policy. Agent output, browser state, RPC responses, backend code, signing infrastructure, recipients, token responses, dependencies, and operators are untrusted or compromiseable.

## Main abuse cases

| Threat | Onchain/offchain control | Residual risk |
| --- | --- | --- |
| Compromised agent drains the account | Mandatory per-transaction and rolling 24h caps; trusted recipients; only ETH/USDG | Attacker can consume the remaining configured allowance |
| Backend bypasses policy | Contract revalidates every execution; backend has no owner/approver/guardian authority | Compromised owner can reconfigure policy |
| Arbitrary call or malicious router | V2 exposes no arbitrary-call, approval, router, swap, or bridge function | Direct recipient or canonical token implementation can still fail |
| Strategy replay or mutation | EIP-712 chain/account binding, nonce-to-digest binding, expiry, interval, execution cap, revocation | Owner can sign an unsafe but valid strategy |
| High-value action skips approval | Threshold creates a pending request; unique approvers and minimum count checked onchain | Compromised approvers may approve malicious requests |
| Policy changes after approval | Recipient, asset policy, limits, pause, and rolling spend rechecked at execution | Denial of service from later restrictive changes |
| Reentrancy | Reentrancy guard and finalized state before direct transfer | Recipient fallback can still revert and block its own transfer |
| Owner cannot recover funds | Owner withdrawal is independent of agent limits and remains available while paused | Owner-key loss or compromise remains catastrophic |
| Guardian abuses pause | Guardian can pause but cannot unpause, change policy, or withdraw | Guardian can cause denial of service |
| Mainnet raw key exposure | Mainnet code has no raw private-key path; secure-signer interface requires non-exportable external custody | Signer service/operator compromise |
| Duplicate scheduler delivery | Token-owned durable lock, idempotency key, onchain nonce/strategy interval | Long outage around lock expiry can produce blocked duplicates |
| RPC inconsistency/outage | Managed primary and failover, simulation, confirmation tracking, explorer link | Multiple providers can share bad upstream data |
| Frontend substitutes calldata | Exact chain/to/value/calldata/result preview reused for send; wallet confirmation required | Compromised wallet/host can misrepresent its own UI |
| Notification endpoint is compromised | Delivery happens after durable recording; authenticated HTTPS adapter has no policy or signer credentials | Public receipt metadata and recipient addresses may be disclosed to the configured destination |

## V2 invariants

- An enabled agent asset always has a positive per-transaction limit and a rolling limit at least as large.
- Rolling recorded spend cannot exceed the current owner-configured limit.
- Agents can transfer only native ETH or the immutable canonical USDG address.
- Agents can transfer only to an enabled trusted recipient.
- Agent requests consume a strict per-agent nonce.
- One owner strategy nonce binds to one EIP-712 digest.
- Human approval cannot override a failed hard policy.
- Expired, cancelled, executed, revoked, exhausted, or early recurring actions cannot execute.
- Guardian cannot withdraw or unpause; agent cannot configure, approve, pause, unpause, or withdraw.
- Owner withdrawals do not consume or depend on agent allowance.

## Alerts

Production monitoring must alert on failed/reverted execution spikes, nonce conflicts, repeated lock contention, policy/role/recipient changes, pause/unpause, owner withdrawals, signer address changes, RPC disagreement, balance thresholds, and signer-provider authentication failures. Alerts never create authority; the guardian pause is the containment control.

## Explicit non-claims

This experimental release is unaudited. Tests do not prove absence of bugs, economic safety, RPC honesty, key security, correct recipient identity, stablecoin solvency, or suitability for large balances. RuleWallet is not affiliated with Robinhood.
