# Security remediation matrix

This document maps the internal findings in `SECURITY_AUDIT.md` to the security-beta changes. It is not an external audit or a claim of safety.

| Finding | Remediation | Regression evidence | Release status |
| --- | --- | --- | --- |
| H-01 USDG decimals | Canonical USDG metadata is fixed at 6 decimals; asset-aware parse/format helpers construct policies, EIP-712 amounts, balances, limits, previews, and receipts. Runtime status also reads `symbol()` and `decimals()` from the canonical address. | `mainnet-registry.test.ts`; `RobinhoodMainnetFork.t.sol`; production build | Fixed |
| M-01 stale queued authorization | Requests store the originating agent and strategy expiry. Execution rechecks AGENT_ROLE, strategy revocation, strategy expiry, current approvals, and every hard policy. | queued revoke, expiry, agent revoke, and revoked-approver tests; invariant suite | Fixed |
| M-02 signer identity | HTTPS, exact hostname, public address, KMS key ID, public-key SHA-256 attestation, non-exportability, chain, zero-value policy, and allowed selector are verified through a live identity handshake. A deployable AWS KMS signer is included. | `mainnet-safety.test.ts`; `services/aws-kms-signer/handler.node-test.mjs` | Fixed in code; deployment identity still required |
| M-03 global nonce race | A Redis signer-global lock is acquired in addition to each strategy lock before a pending nonce can be allocated. Submitted nonces remain durably reserved across timeout; replacement and late-confirmation states are recorded and require reconciliation before retry. | safety/fault tests and code review | Implemented; production certification incomplete |
| M-04 RPC/fees | Two distinct managed RPCs must agree on chain, signer pending nonce, and account code hash. Estimated gas and fees must fit explicit ceilings before the signer boundary. | RPC disagreement and fee-ceiling fault tests | Implemented; production certification incomplete |
| M-05 spoof factory | V3 reconstructs and compares the immutable-linked factory and account-deployer runtimes, the pinned registry-deployer runtime, chain, USDG, version, account version, paired-registry controller, and registry stablecoin. | `v3-factory.test.ts`; runtime reconstruction; V3 factory/account tests | Fixed for V3 |
| L-01 role overlap | Constructor and role changes enforce separate owner, guardian, agent, and approver identities onchain. | role-collision/default-admin tests | Fixed |
| L-02 impossible approvals | Duplicate approvers are rejected; the minimum cannot exceed active unique approvers; revocation cannot make the threshold unreachable. | duplicate, threshold, and role-revocation tests | Fixed |
| L-03 optional fork | CI runs a mandatory current-state fork against the official Robinhood Chain mainnet RPC. USDG address, symbol, decimals, chain ID, and account reads are asserted. | `RobinhoodMainnetFork.t.sol`; CI workflow | Fixed |
| L-04 duplicate strategies | Exact EIP-712 digests are claimed atomically in durable Redis storage before insertion. | schema/unit coverage | Fixed for new strategies |
| V3-01 discoverable agent revocation | V3 keeps an enumerable active-agent set so an owner can inspect and revoke one agent or every active agent without trusting an offchain index. | `testOwnerCanDiscoverAndRevokeEveryActiveAgentSession` | Fixed |
| V3-02 stored strategy confidentiality | Owner strategy signatures are encrypted with AES-256-GCM using per-record authenticated context before Redis persistence. Old plaintext records fail closed, and production storage readiness requires a valid server-only key. | `strategy-encryption.test.ts`; storage gate tests | Fixed in code; production key still required |
| V3-03 commerce policy spoofing | The order API ignores client-supplied policy/spend claims. Direct payment quotes must contain an onchain recipient and pass exact V3 provenance plus live `validatePayment` reads on both RPCs before an order can proceed. | `commerce-onchain-policy.test.ts`; provider tests | Fixed for the direct onchain rail |
| V3-04 private commerce access | Order creation/listing and approval listing/decisions require a short-lived wallet-authenticated session. Challenges are atomically consumed, and the HttpOnly cookie cannot authorize funds. | `commerce-session.test.ts`; route checks | Fixed in code; deployment secret required |

V3 also adds merchant/category/time/period controls, EIP-712 intent/category binding, expiring approval signatures, and broader invariants. V1/V2 factories are not compatible with V3. New-account and autonomy paths accept only `3.0.0-commerce-beta` provenance.

## Closed release boundary

The release contains the autonomous execution path, but `ENABLE_MAINNET_AUTONOMY=false` remains the default. The runtime requires every factory, USDG, signer-attestation, durable-storage, scheduler, signer-global nonce, independent-RPC, monitoring, and fee gate simultaneously. Missing or changed configuration fails closed. This is still an internal remediation and not an independent audit.
