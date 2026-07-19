# Security remediation matrix

This document maps the internal findings in `SECURITY_AUDIT.md` to the security-beta changes. It is not an external audit or a claim of safety.

| Finding | Remediation | Regression evidence | Release status |
| --- | --- | --- | --- |
| H-01 USDG decimals | Canonical USDG metadata is fixed at 6 decimals; asset-aware parse/format helpers construct policies, EIP-712 amounts, balances, limits, previews, and receipts. Runtime status also reads `symbol()` and `decimals()` from the canonical address. | `mainnet-registry.test.ts`; `RobinhoodMainnetFork.t.sol`; production build | Fixed |
| M-01 stale queued authorization | Requests store the originating agent and strategy expiry. Execution rechecks AGENT_ROLE, strategy revocation, strategy expiry, current approvals, and every hard policy. | queued revoke, expiry, agent revoke, and revoked-approver tests; invariant suite | Fixed |
| M-02 signer identity | HTTPS, exact hostname, public address, KMS key ID, public-key SHA-256 attestation, non-exportability, chain, zero-value policy, and allowed selector are verified through a live identity handshake. A deployable AWS KMS signer is included. | `mainnet-safety.test.ts`; `services/aws-kms-signer/handler.node-test.mjs` | Fixed in code; deployment identity still required |
| M-03 global nonce race | A Redis signer-global lock is acquired in addition to each strategy lock before a pending nonce can be allocated. Submitted nonces remain durably reserved across timeout; replacement and late-confirmation states are recorded and require reconciliation before retry. | safety/fault tests and code review | Implemented; production certification incomplete |
| M-04 RPC/fees | Two distinct managed RPCs must agree on chain, signer pending nonce, and account code hash. Estimated gas and fees must fit explicit ceilings before the signer boundary. | RPC disagreement and fee-ceiling fault tests | Implemented; production certification incomplete |
| M-05 spoof factory | The server compares the complete immutable-linked runtime bytecode hash, chain, USDG, and version. Account provenance must match `accountVersion` from that exact factory. | Solidity runtime-hash test; spoof-getter regression test | Fixed for security-beta |
| L-01 role overlap | Constructor and role changes enforce separate owner, guardian, agent, and approver identities onchain. | role-collision/default-admin tests | Fixed |
| L-02 impossible approvals | Duplicate approvers are rejected; the minimum cannot exceed active unique approvers; revocation cannot make the threshold unreachable. | duplicate, threshold, and role-revocation tests | Fixed |
| L-03 optional fork | CI runs a mandatory current-state fork against the official Robinhood Chain mainnet RPC. USDG address, symbol, decimals, chain ID, and account reads are asserted. | `RobinhoodMainnetFork.t.sol`; CI workflow | Fixed |
| L-04 duplicate strategies | Exact EIP-712 digests are claimed atomically in durable Redis storage before insertion. | schema/unit coverage | Fixed for new strategies |

The older `2.0.0-experimental` factory is not compatible with this release. The UI must report it as unverified and must not treat accounts returned by it as security-beta accounts.

## Closed release boundary

The release contains the autonomous execution path, but `ENABLE_MAINNET_AUTONOMY=false` remains the default. The runtime requires every factory, USDG, signer-attestation, durable-storage, scheduler, signer-global nonce, independent-RPC, monitoring, and fee gate simultaneously. Missing or changed configuration fails closed. This is still an internal remediation and not an independent audit.
