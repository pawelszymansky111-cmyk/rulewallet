# V3 threat model

## Assets and trust boundaries

- ETH and canonical six-decimal USDG held by each mainnet V3 account;
- valueless testnet ETH/tUSDG in the testing environment;
- owner policies, role assignments, merchants, categories, schedules, spend state, strategies, and approvals;
- passkey/external wallet sessions and exact transactions shown before signing;
- remote non-exportable signer, RPC observations, durable locks, and pending nonces;
- provider credentials, quotes, carts, orders, webhooks, and fulfillment state;
- exact factory/helper/account/registry runtimes and deployment provenance.

The V3 account and paired registry are the financial authorization boundary. Models, browsers, provider APIs, backends, databases, RPCs, signer operators, merchants, tokens, and project operators are untrusted or compromiseable.

## Main abuse cases

| Threat | Primary control | Residual risk |
| --- | --- | --- |
| Compromised agent drains account | Asset, merchant, category, period, time, count, expiry, and execution caps | Attacker can spend remaining configured allowance to a compromised trusted merchant |
| Fake official provider | Owner-signed merchant address/category plus capability registry | Owner can trust the wrong address; labels are not identity proof |
| Backend invents an allowed policy | Registry revalidates every payment onchain | Backend can deny service or show misleading previews |
| Search result shown as purchase | Distinct quote/order/payment/confirmation states and provider capability flags | Third-party checkout can still fail after discovery |
| Strategy replay/mutation | EIP-712 chain/account/intent/category binding, nonce-to-digest binding, expiry, interval, count, revoke | Owner may sign an unsafe but valid strategy |
| Queued request executes after authority changes | Agent role, strategy revocation/expiry, approvals, and all policy rechecked at execution | Later restriction can intentionally deny service |
| Approval replay or stale signer | EIP-712 approver/nonce/expiry and active role check | Compromised active approvers may approve malicious requests |
| Spoof factory/account | Exact immutable-linked factory/helper hashes, factory version record, registry controller binding | Build pipeline compromise could pin malicious artifacts |
| Role collision | Constructor and grant checks require distinct operational addresses; duplicate approvers rejected | Multiple embedded wallets may share one authentication/recovery domain |
| Mainnet raw-key exposure | Mainnet accepts only remote non-exportable signer interface | KMS policy, operator, or cloud-account compromise |
| Duplicate/ambiguous submission | Strategy and signer-global locks, pending nonce reservation, idempotency, exact late reconciliation | Multi-system outage can delay rather than duplicate payment |
| RPC manipulation | Two managed HTTPS hosts must agree; exact simulation and confirmed transaction recheck | Independent hosts can share bad upstream state |
| Provider replay or double order | Durable idempotency and quote expiry; outbound alerts are HMAC-signed and every future inbound provider webhook must be signature-verified | A not-yet-live adapter must not claim completion |
| Redis disclosure | Private commerce records and owner strategy signatures use separate authenticated AES-256-GCM keys outside Redis | Rotate either key only by decrypting/re-encrypting during a controlled maintenance window |
| Alert spoof/replay | Bearer authentication, raw-body HMAC, five-minute timestamps, and unique delivery IDs | The receiver must atomically persist delivery IDs; signing does not prove the underlying provider fulfilled an order |
| Shopping-intent disclosure | Private order/approval APIs require a replay-safe wallet challenge and short-lived HttpOnly session | A compromised owner browser or server can still read that owner's active session data |
| Malicious canonical token | Immutable address, `SafeERC20`, reentrancy guard | Blacklist, pause, upgrade, fee, or solvency risk remains external |
| Owner key compromise | No platform balance cap; withdrawals and policy changes require owner | Owner compromise is catastrophic by design |
| Guardian abuse | Guardian can pause/cancel but not unpause or withdraw | Denial of service |

## V3 invariants

- Agents can transfer only native ETH or the immutable canonical stablecoin.
- Every agent transfer uses a trusted, unexpired merchant and matching category.
- Asset, merchant/asset, and category policies must all be enabled.
- Recorded spend cannot exceed configured per-transaction, rolling, period, merchant, category, or count limits.
- Human approval cannot override a failed hard policy.
- Expired, cancelled, executed, rejected, revoked, exhausted, early, or unauthorized actions cannot execute.
- One strategy nonce binds to one digest; one approval nonce is single-use.
- Revoking the originating agent or strategy blocks its pending request.
- Guardian cannot withdraw or unpause; agent cannot configure, approve, pause, unpause, or withdraw.
- Owner withdrawal does not grant the agent broader authority.
- No proxy, delegatecall, arbitrary external call, token approval, swap, router, or bridge exists.

## Operational alerts

Alert on policy/role/merchant changes, pause/unpause, owner withdrawals, failed simulations, revert spikes, nonce conflicts, lock contention, RPC disagreement, signer identity changes, fee-ceiling failures, provider errors, quote/order mismatches, unusual spend, and balance thresholds. Alerts carry no authority; guardian pause and agent revocation are containment controls.

## Non-claims

This is an internal engineering security model, not an independent audit or guarantee. Tests do not prove absence of bugs, recipient identity, provider fulfillment, key security, stablecoin solvency, RPC honesty, or suitability for large balances. RuleWallet is not affiliated with Robinhood or the named commerce providers.
