# RuleWallet internal security review

> **Classification:** Internal engineering review, not an independent audit.
>
> **Mainnet decision:** **BLOCKED.** Do not enable autonomous mainnet execution or rely on the current UI to configure USDG limits. Do not treat this report as certification. An external security firm must review the corrected release before RuleWallet is described as audited.

## Review record

| Field | Value |
| --- | --- |
| Repository | `pawelszymansky111-cmyk/rulewallet` |
| Reviewed commit | `f34067a1094454f6362bd7c79052b989c95a54e0` |
| Review date | 2026-07-18 |
| Reviewer | Internal Codex-assisted review |
| Network reads | Read-only Robinhood Chain mainnet RPC calls; no transaction was signed or broadcast |
| Mainnet block sampled | `13234086` |
| Result | 0 Critical, 1 High, 5 Medium, 4 Low, 4 Informational observations |

### Scope

- `contracts/src/RuleWalletPolicyAccountV2.sol`
- `contracts/src/RuleWalletFactory.sol`
- deployment scripts, generated artifacts, Foundry configuration, and CI
- V2 unit, fuzz, invariant, and Robinhood Chain fork tests
- EIP-712 strategy construction, execution, replay protection, revocation, and expiry
- mainnet control-center transaction construction and simulation
- scheduler, Redis locks, nonce selection, RPC clients, monitoring, and signer boundary
- Robinhood Chain mainnet registry, RPC/explorer configuration, and canonical USDG

V1 testnet code was read only where it shared infrastructure with the V2 flow. This was a source review and test exercise, not a formal verification, economic audit, custody review, penetration test, or audit of Robinhood Chain, Paxos USDG, Vercel, Upstash, wallets, RPC providers, or a future signer service.

## Executive summary

The V2 contract has a deliberately narrow action surface. It contains no swap, bridge, arbitrary-call, ERC-20 approval, proxy, or upgrade path. Agent transfers are limited to native ETH and one immutable token address, and recipient, policy, per-transaction limit, rolling limit, pause state, and balance are enforced onchain. Owner withdrawals are explicit owner-role calls and are independent of agent limits. Reentrancy guards and `SafeERC20` are applied on transfer paths.

The release is nevertheless **not ready for mainnet use**. The highest-severity confirmed issue is a 12-order-of-magnitude USDG unit error: RuleWallet assumes 18 decimals while canonical USDG on Robinhood Chain reports 6. A user entering a `1 USDG` limit through the current UI authorizes `1e18` base units, equal to **1,000,000,000,000 USDG**, rather than `1e6`. The same error affects approval thresholds, strategies, balances, and receipts. This can make a policy appear conservative while effectively allowing a compromised agent to transfer the account's entire USDG balance to any already-trusted recipient without the intended human approval.

Additional blockers are queued approval requests that survive strategy revocation/expiry and agent-role revocation; a signer readiness check that cannot establish a non-exportable KMS/MPC/HSM key; per-strategy rather than signer-global nonce locking; single-response RPC trust without fee ceilings; and factory/account verification based on spoofable getters rather than pinned runtime bytecode and provenance.

Autonomous mainnet execution must remain disabled. `ENABLE_MAINNET_AUTONOMY` should remain `false`, and no production signer credential should be configured until all High and Medium findings are fixed and independently reviewed.

## Severity model

- **Critical:** direct, broadly exploitable loss of account funds or control with minimal prerequisites.
- **High:** realistic loss of funds or collapse of a core policy boundary, with some prerequisite such as an agent compromise or unsafe user configuration.
- **Medium:** bounded financial impact, authority-lifecycle bypass, or material production control failure.
- **Low:** availability, hardening, or defense-in-depth weakness with limited direct financial impact.
- **Informational:** trust assumption, design limitation, or validated property that should remain documented.

## Findings overview

| ID | Severity | Title | Status |
| --- | --- | --- | --- |
| H-01 | High | Canonical USDG uses 6 decimals, but all mainnet UI paths assume 18 | Confirmed; deployment blocker |
| M-01 | Medium | Queued requests survive strategy expiry/revocation and agent revocation | Confirmed; deployment blocker |
| M-02 | Medium | “Secure signer configured” does not verify non-exportability or transport identity | Confirmed; autonomy blocker |
| M-03 | Medium | Locks and nonce handling are not serialized globally per signer | Confirmed; autonomy blocker |
| M-04 | Medium | First-success RPC data and uncapped fee estimates cross the signing boundary | Confirmed; autonomy blocker |
| M-05 | Medium | Factory/account “verification” accepts spoofable getters instead of pinned bytecode | Confirmed; onboarding blocker |
| L-01 | Low | Role separation is enforced only by the primary frontend | Confirmed |
| L-02 | Low | Approval threshold can exceed the number of unique active approvers | Confirmed |
| L-03 | Low | The mainnet fork test silently passes when no RPC is configured | Confirmed |
| L-04 | Low | Signed strategies can be stored repeatedly and public APIs have process-local rate limits | Confirmed |

## Detailed findings

### H-01 — Canonical USDG uses 6 decimals, but all mainnet UI paths assume 18

**Severity:** High
**Affected code:**

- `src/lib/mainnet-registry.ts:7-10`
- `src/components/mainnet-control-center.tsx:94-97`
- `src/components/mainnet-control-center.tsx:140-155`
- `src/components/mainnet-control-center.tsx:274-289`
- `src/components/mainnet-control-center.tsx:445`
- `src/components/mainnet-strategy-panel.tsx:116-146`
- `src/components/mainnet-strategy-panel.tsx:215`
- `contracts/test/RobinhoodMainnetFork.t.sol:12-18`

**Evidence:** The official Robinhood Chain and Paxos documentation identifies canonical USDG as `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`. At mainnet block `13234086`, a read-only `decimals()` call to that address returned `6` and `symbol()` returned `USDG`. RuleWallet hard-codes `decimals: 18`, uses `parseUnits(value, 18)` for USDG policies and signed strategies, and uses `formatUnits(value, 18)` for USDG balances and limits.

Official references:

- [Robinhood Chain token contracts](https://docs.robinhood.com/chain/contracts/)
- [Paxos USDG mainnet addresses](https://docs.paxos.com/guides/stablecoin/usdg/mainnet)

**Exploit scenario:** An owner enters a USDG per-transaction limit of `1`, rolling limit of `5`, and approval threshold of `0.5`. The UI encodes these as `1e18`, `5e18`, and `5e17` base units. With a 6-decimal token, the onchain policy is one trillion USDG per transaction, five trillion rolling, and approval only above 500 billion USDG. A compromised `AGENT_ROLE` key can call `requestTokenTransfer` for the account's entire ordinary USDG balance to any already-trusted recipient. The transfer remains under the accidentally enormous limits and below the accidentally enormous approval threshold.

**Impact:** The trusted-recipient boundary remains intact, but the two monetary caps and human-approval boundary can become ineffective for USDG. Balance and receipt formatting also understates values by `1e12`, making detection harder.

**Minimal fix:**

1. Change the canonical USDG registry metadata to 6 decimals.
2. Use asset metadata rather than literal `18` in every parse and format operation.
3. Read and validate `decimals() == 6`, `symbol() == "USDG"`, code presence, and exact canonical address during startup, onboarding, and the live fork gate.
4. Block all USDG policy and strategy creation if metadata validation fails.
5. Audit any already-created USDG policies and reset them with separately simulated owner-signed transactions. Do not silently reinterpret existing raw values.

**Required regression tests:**

- Unit: parsing `1 USDG` produces `1_000_000`, and formatting `1_000_000` produces `1`.
- Component: USDG policy, approval threshold, strategy preview, balance, rolling spend, and receipt all use 6 decimals; ETH continues to use 18.
- Fork: assert canonical address code, `symbol() == "USDG"`, and `decimals() == 6` on the current Robinhood Chain fork.
- End-to-end: configure `1 / 5 / 0.5 USDG`, inspect exact calldata, and assert the raw arguments are `1e6 / 5e6 / 5e5`.

### M-01 — Queued requests survive strategy expiry/revocation and agent revocation

**Severity:** Medium
**Affected code:**

- `contracts/src/RuleWalletPolicyAccountV2.sol:64-76`
- `contracts/src/RuleWalletPolicyAccountV2.sol:290-328`
- `contracts/src/RuleWalletPolicyAccountV2.sol:330-361`
- `contracts/src/RuleWalletPolicyAccountV2.sol:421-444`
- `docs/THREAT_MODEL.md:38-41`

**Description:** `executeSignedStrategy` checks owner signature, strategy expiry, revocation, recurrence, execution count, and current agent role only when it creates a request. If the amount exceeds the approval threshold, the stored `ExecutionRequest` retains only the strategy digest, not the strategy expiry or a requirement that the originating agent remain authorized. `executeApprovedRequest` checks approvals and the current hard monetary policy, but does not check `strategyStates[digest].revoked`, the strategy expiry, or `hasRole(AGENT_ROLE, pending.agent)`.

The same role-lifecycle problem applies to direct agent requests: removing `AGENT_ROLE` does not cancel requests the agent already queued. Approvals recorded by an approver also remain counted if that approver's role is later revoked.

**Exploit scenario:** A compromised agent queues a transfer above the human threshold just before the owner revokes the strategy and removes the agent role. If enough approvals were already recorded—or are recorded later—the attacker or any third party can call `executeApprovedRequest` until the request deadline. The owner may reasonably believe strategy revocation stopped the authorization, but it only blocks new requests.

**Impact:** One or more already-queued transfers can execute up to the current per-transaction and rolling limits, to already-trusted recipients. Pause, recipient revocation, policy disablement, limit reduction, or explicit request cancellation still blocks containment, so this is not an unrestricted drain.

**Minimal fix:** Store the signed authorization expiry and authorization kind in each request. Before approved execution, require the strategy digest to remain unrevoked, require its signed expiry not to have passed, and require the originating agent still to hold `AGENT_ROLE`. Define and document whether revoked approver approvals remain valid; the safer policy is to invalidate or revalidate them. Consider a digest-to-pending-request index so revocation can cancel all queued requests atomically or make them permanently ineligible.

**Required regression tests:**

- A high-value signed-strategy request cannot execute after `revokeStrategy(digest)`.
- It cannot execute after the signed strategy expiry even when the request deadline is later.
- Direct and strategy requests cannot execute after the originating agent loses `AGENT_ROLE`.
- A revoked approver's previously recorded vote follows the explicitly chosen policy.
- Restrictive policy changes, recipient revocation, and pause continue to invalidate pending execution.

### M-02 — “Secure signer configured” does not verify non-exportability or transport identity

**Severity:** Medium
**Affected code:**

- `src/lib/secure-agent-signer.ts:38-65`
- `src/lib/secure-agent-signer.ts:68-119`
- `src/lib/server-env.ts:11-16`
- `src/app/api/mainnet/status/route.ts:43-68`
- `src/lib/mainnet-agent-runner.ts:70-77`

**Description:** The readiness gate labels a signer `configured` when mode is `external-kms`, an address is valid, and an arbitrary URL plus a 16-character bearer token is present. It does not prove that the key is non-exportable, that a KMS/MPC/HSM is used, that the endpoint uses HTTPS, that the service identity is pinned, or that signer-side chain/contract/function/fee policy exists. A normal hot-key HTTP service can satisfy the same interface.

**Exploit scenario:** An operator mistakenly points the environment at an ordinary web service holding an exportable key, or a compromised deployment changes the signer endpoint to an attacker-controlled URL. With `ENABLE_MAINNET_AUTONOMY=true`, RuleWallet reports autonomy enabled and sends recurring transaction intents and the bearer credential to that endpoint.

**Impact:** The code's promised non-exportable-key boundary is not enforced. A compromised signer can use the agent key outside RuleWallet up to the onchain agent policy limits and can spend the signer's gas funds. It cannot obtain owner, approver, guardian, or default-admin power unless roles were misassigned.

**Minimal fix:** Implement a provider-specific signer adapter with verifiable key metadata/attestation and a non-exportable key identifier; require HTTPS with an allowlisted host and preferably mTLS or workload identity/OIDC rather than a static bearer token. Require signer-side policy for chain `4663`, exact RuleWallet account addresses, allowed selectors, zero transaction value, gas/fee ceilings, and idempotency. Readiness must remain false until attestation, policy, key identity, and a non-broadcast signing test pass.

**Required regression tests:**

- `http://` and non-allowlisted signer endpoints are rejected in production.
- Endpoint/token/address without verified key metadata leaves `configured=false`.
- Wrong chain, contract, selector, nonzero value, excessive gas/fees, and unexpected signer address are rejected before signing.
- Rotated/disabled key identity immediately fails closed.

### M-03 — Locks and nonce handling are not serialized globally per signer

**Severity:** Medium
**Affected code:**

- `src/lib/mainnet-agent-store.ts:69-81`
- `src/lib/mainnet-agent-runner.ts:79-80`
- `src/lib/mainnet-agent-runner.ts:117-137`
- `src/lib/mainnet-agent-runner.ts:171-177`
- `docs/ARCHITECTURE.md:84`

**Description:** Redis locks are keyed by strategy ID. Two overlapping scheduler invocations processing two different strategies for the same signer can both acquire locks, read the same pending transaction nonce, and submit different calldata with that nonce. The repository delegates serialization to an unspecified signer service, but the `SecureAgentSigner` interface does not require or verify that behavior. The idempotency key includes strategy ID and therefore does not prevent cross-strategy nonce collisions.

**Exploit/failure scenario:** Two Vercel invocations overlap. Strategy A and B both read nonce `N`; the external signer accepts both. One replaces the other, or one confirms and the other fails. Timeout/retry paths can further obscure whether a submitted transaction is pending, replaced, or mined.

**Impact:** Unpredictable execution order, replacement, repeated failures, alert noise, and potential gas loss. Onchain strategy interval and policy checks make duplicate fund transfers less likely, but the scheduler cannot claim reliable exactly-once or even ordered delivery.

**Minimal fix:** Add a durable chain-and-signer global submission lock and a persistent nonce lease/state machine. Reconcile pending and confirmed transactions before allocating the next nonce. Keep per-strategy idempotency, but add signer-global uniqueness and replacement policy. Extend lock leases while confirmation is pending and handle ambiguous timeouts by transaction reconciliation rather than immediate resubmission.

**Required regression tests:**

- Run two strategies concurrently with one signer and assert unique sequential nonces and one submission per strategy.
- Simulate overlapping cron invocations, Redis delay, lock expiry, signer timeout, replacement, dropped transaction, and late confirmation.
- Assert no second submission occurs while an earlier nonce is unresolved.

### M-04 — First-success RPC data and uncapped fee estimates cross the signing boundary

**Severity:** Medium
**Affected code:**

- `src/lib/mainnet-clients.ts:6-16`
- `src/lib/mainnet-agent-runner.ts:89-123`
- `src/lib/mainnet-agent-runner.ts:124-147`
- `src/app/api/rpc/route.ts:100-124`

**Description:** Viem `fallback` supplies availability, not Byzantine quorum. The first successful provider response controls role/policy reads, simulation, pending nonce, gas estimate, and fee estimate. The runner forwards `estimatedGas * 120%`, `maxFeePerGas`, and `maxPriorityFeePerGas` without configured ceilings. Transaction intent is checked only after the external signer has already broadcast it.

**Exploit scenario:** A compromised or faulty RPC returns a very large fee estimate and a plausible successful simulation. If the signer lacks an independent fee policy, it signs and broadcasts the exact high-fee intent. A malicious RPC can also return stale nonce/state to create replacements or denial of service.

**Impact:** Agent gas-wallet loss, failed automation, and misleading simulation/readiness output. The V2 contract still enforces recipients and monetary policy onchain, so a lying RPC alone should not bypass account limits.

**Minimal fix:** Cross-check chain ID, latest block, critical policy state, pending nonce, and fee data across independent providers. Add hard configured gas and fee ceilings both in RuleWallet and in the signer service. Make pre-sign verification authoritative; post-broadcast verification should be monitoring, not the first point at which mismatch is detected. Refuse production autonomy when only the public rate-limited RPC is available.

**Required regression tests:**

- A mock provider returning excessive gas or fees is blocked before `submitTransaction`.
- Provider disagreement on chain ID, nonce, account code, policy, or simulation fails closed and alerts.
- Stale and malformed RPC responses never reach the signer.
- Post-broadcast mismatch still triggers critical containment and reconciliation.

### M-05 — Factory/account “verification” accepts spoofable getters instead of pinned bytecode

**Severity:** Medium
**Affected code:**

- `src/app/api/mainnet/status/route.ts:28-57`
- `src/components/mainnet-control-center.tsx:214-225`
- `src/components/mainnet-control-center.tsx:392-398`
- `src/app/api/mainnet/strategies/route.ts:55-70`

**Description:** `factoryVerifiedOnchain` means only that code is nonempty and three getters return expected values. The UI even displays “Verified bytecode present,” but no runtime bytecode hash is calculated or compared. Strategy storage trusts `accountVersion` from that same configured factory plus a few account getters. A malicious factory can implement the expected getters and mark an arbitrary account with the expected version hash.

**Exploit scenario:** A bad release configuration points `NEXT_PUBLIC_RULEWALLET_MAINNET_FACTORY_ADDRESS` at a spoof contract. It returns chain `4663`, the official USDG address, and the expected version while deploying a backdoored account. The UI reports the factory verified. Users later deposit assets into the malicious account.

**Impact:** Collapse of factory/account provenance and potential loss of all funds deposited into a spoofed account. The attacker must first influence release configuration, deployment verification, or the trusted RPC/host, so this is not a permissionless contract exploit.

**Minimal fix:** Pin and compare the exact deployed factory runtime bytecode hash from a reproducible release artifact. Verify source, compiler settings, constructor arguments, deployment transaction, and release commit on Blockscout. For accounts, verify deployment provenance from the pinned factory event and compare the expected V2 runtime with immutable values accounted for. Rename readiness fields so they do not claim bytecode verification until this is done.

**Required regression tests:**

- A spoof factory returning correct getters but wrong runtime bytecode is rejected.
- An account self-reporting the expected interface but lacking a deployment event from the pinned factory is rejected.
- Reproducible local runtime hashes match the verified deployment artifact.

### L-01 — Role separation is enforced only by the primary frontend

**Severity:** Low
**Affected code:**

- `contracts/src/RuleWalletPolicyAccountV2.sol:154-179`
- `contracts/src/RuleWalletFactory.sol:36-54`
- `src/components/mainnet-control-center.tsx:227-232`

**Description:** The mainnet UI requires four distinct addresses, but the constructor and public factory accept the same address for owner, guardian, agent, and approver. Direct factory callers can therefore deploy an account where one compromised key holds every operational role.

**Impact:** Misconfiguration removes intended privilege separation. This is primarily a deployment/operator risk because the supplied addresses are visible and chosen by the deploying owner.

**Minimal fix:** Enforce pairwise-distinct owner, guardian, agent, and initial approver addresses onchain for the production factory, or explicitly define a separate demo factory that permits collapsed roles. Reject duplicate approvers.

**Required regression test:** Factory deployment reverts for every pairwise role collision and duplicate approver, while a four-address configuration succeeds.

### L-02 — Approval threshold can exceed the number of unique active approvers

**Severity:** Low
**Affected code:**

- `contracts/src/RuleWalletPolicyAccountV2.sol:166-178`
- `contracts/src/RuleWalletPolicyAccountV2.sol:248-253`
- `contracts/src/RuleWalletPolicyAccountV2.sol:335-347`

**Description:** Constructor validation compares the threshold to array length, even though duplicate addresses grant only one role. Later, `setMinimumApprovals` checks only for nonzero and can set any `uint8` value without reference to active approvers. Role revocation can also leave the threshold unattainable.

**Impact:** High-value transfers can become permanently unavailable until the default admin grants roles or the owner lowers the threshold. Funds remain owner-withdrawable.

**Minimal fix:** Track unique approver count, reject duplicates, constrain threshold updates to active count, and define atomic role/threshold update operations so intermediate states remain safe.

**Required regression tests:** Duplicate approvers cannot satisfy constructor validation; threshold cannot exceed active unique approvers; role revocation cannot silently leave an invalid threshold unless explicitly allowed and surfaced.

### L-03 — The mainnet fork test silently passes when no RPC is configured

**Severity:** Low
**Affected code:**

- `contracts/test/RobinhoodMainnetFork.t.sol:12-18`
- `.github/workflows/ci.yml:26-41`

**Description:** The test returns successfully when `RH_MAINNET_RPC_URL` is absent, and CI does not configure that variable. CI therefore reports the suite green without exercising current mainnet state. The fork test also checks code presence but not USDG decimals, metadata, proxy implementation/provenance, or deployed factory runtime.

**Impact:** False assurance. This gap directly allowed the 18-vs-6-decimal mismatch to pass all existing tests.

**Minimal fix:** Split optional local and required release-fork profiles. The required release job must fail if the RPC is absent, pin or record the sampled block, and validate chain, canonical token address/code/metadata, deployed runtime hashes, and factory/account immutables.

**Required regression test:** The release CI job fails without its fork endpoint and passes only after executing assertions against a recorded mainnet block.

### L-04 — Signed strategies can be stored repeatedly and public APIs have process-local rate limits

**Severity:** Low
**Affected code:**

- `src/app/api/mainnet/strategies/route.ts:21-36`
- `src/app/api/mainnet/strategies/route.ts:47-80`
- `src/lib/mainnet-agent-store.ts:48-53`
- `src/lib/rate-limit.ts:1-26`
- `src/app/api/rpc/route.ts:44-69`

**Description:** Replaying the same valid owner-signed payload creates a new random strategy ID each time; storage has no unique key for chain/account/digest. Rate limiting is an in-process `Map`, so it is not durable or consistent across serverless instances. The read-only RPC proxy allows batches and validates method names but not expensive parameter ranges.

**Exploit scenario:** A leaked strategy signature or abusive client stores many copies of the same strategy and/or consumes provider quota using large `eth_getLogs` requests. Duplicate digests do not exceed onchain interval or execution caps, but they generate repeated simulations, blocked receipts, alerts, Redis growth, and scheduler work.

**Impact:** Availability and cost degradation rather than additional authorized transfer value.

**Minimal fix:** Derive the onchain strategy digest server-side and atomically `SETNX` a unique chain/account/digest key. Use durable distributed rate limiting, body streaming limits, and per-method RPC parameter bounds/cost weights.

**Required regression tests:** Concurrent identical POSTs create one stored strategy; limits hold across multiple application instances; excessive log ranges, batch cost, and oversized chunked bodies are rejected.

## Informational observations

### I-01 — The rolling “24-hour” window is intentionally conservative

`RuleWalletPolicyAccountV2.sol:29-31` and `210-216` sum the current hourly bucket plus the previous 24 buckets. Depending on the position within the current hour, this represents between 24 and almost 25 hours. It can delay allowance recovery for up to almost one hour, but it does not undercount the most recent 24 hours. Documentation at `docs/ARCHITECTURE.md:67-69` correctly describes this behavior. Keep a boundary test proving spend cannot fall out early.

### I-02 — `DEFAULT_ADMIN_ROLE` is an additional superuser trust boundary

The initial owner is also the delayed OpenZeppelin default admin through `RuleWalletPolicyAccountV2.sol:161`. The default admin can grant or revoke `OWNER_ROLE`, `AGENT_ROLE`, `APPROVER_ROLE`, and `GUARDIAN_ROLE`; a default-admin transferee can therefore grant itself owner withdrawal authority after the delayed admin transfer completes. This is standard `AccessControl` behavior, but the four-role product model should explicitly document the fifth administrative trust boundary and monitor all role/admin changes.

### I-03 — Mainnet chain, RPC, explorer, and canonical USDG address are correct

Read-only validation and official documentation agree on chain ID `4663`, public RPC `https://rpc.mainnet.chain.robinhood.com`, Blockscout `https://robinhoodchain.blockscout.com`, and USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`. Robinhood documents the public RPC as rate-limited and not recommended for production; managed independent providers remain required.

### I-04 — The narrow contract action boundary is present

V2 exposes direct native ETH and canonical USDG transfers only. No generic calldata, DEX router, bridge, swap, tokenized-stock trading, ERC-20 `approve`, or upgrade function was found. `SafeERC20`, balance checks, checks-effects-interactions, and `nonReentrant` cover token/native execution and owner withdrawal paths. A malicious or upgraded canonical token can still revert, return inconsistent balances, levy fees, rebase, blacklist, or otherwise violate ordinary ERC-20 assumptions; this is an external residual risk, not a reason to add generic token support.

## Privilege and control matrix

| Capability | OWNER | AGENT | APPROVER | GUARDIAN | DEFAULT_ADMIN | Public caller |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Configure policy/recipient/request lifetime | Yes | No | No | No | Can grant self OWNER | No |
| Direct bounded request | No | Yes | No | No | Can grant self AGENT | No |
| Execute signed strategy | No | Yes | No | No | Can grant self AGENT | No |
| Record approval | No | No | Yes | No | Can grant self APPROVER | No |
| Execute approved request | Yes | Yes | Yes | Yes | Yes | Yes |
| Cancel pending request | Yes | Originating agent | No | Yes | Only after role grant | No |
| Pause | No | No | No | Yes | Can grant self GUARDIAN | No |
| Unpause | Yes | No | No | No | Can grant self OWNER | No |
| Withdraw owner funds | Yes | No | No | No | Can grant self OWNER | No |
| Grant/revoke operational roles | No unless also admin | No | No | No | Yes | No |

Public execution of an already-approved request is acceptable only because the contract must enforce every authorization and policy predicate itself. M-01 identifies predicates that are currently missing from that final execution step.

## EIP-712 and replay assessment

Validated properties:

- Domain binds name `RuleWallet`, version `2`, chain ID, and verifying account.
- Struct binds chain, account, asset, recipient, exact raw amount, owner nonce, expiry, interval, and max executions.
- Contract rechecks chain and account.
- A signer/nonce binds to one digest on first use.
- OpenZeppelin ECDSA rejects malformed and high-`s` signatures.
- Strategy state prevents early recurrence and execution beyond the signed cap.
- Every new request consumes a strict per-agent transaction nonce.

Limitations and gaps:

- M-01: revocation and strategy expiry are not propagated to pending requests.
- The contract uses `ECDSA.recover`, not ERC-1271 `SignatureChecker`; contract-wallet/multisig owners cannot authorize strategies. This is a compatibility/availability limitation, not a signature forgery.
- Backend input accepts only 65-byte signatures and has no test for smart-account ownership.
- Strategy `executions` counts request creation, not completed transfer. Rejected or expired approval requests consume the signed execution cap. This is conservative but should be explicit in UI and documentation.

## Contract invariants and missing fuzz/invariant coverage

### Invariants that should be retained

1. An agent transfer can change only ETH or immutable canonical USDG balances.
2. Every agent transfer recipient is trusted at the exact execution block.
3. Every executed amount is at or below the current per-transaction cap.
4. Projected recorded spend never exceeds the current rolling cap.
5. Human approval never overrides pause, active policy, recipient, asset, per-transaction, rolling, or balance checks.
6. Owner withdrawal is callable only by `OWNER_ROLE`, does not consume agent allowance, and remains available while paused.
7. Guardian cannot unpause or withdraw; agent cannot configure/approve/pause/unpause/withdraw; approver cannot configure or withdraw.
8. One owner/nonce binds to at most one strategy digest.
9. A revoked, expired, exhausted, or not-yet-ready strategy cannot create or execute value transfer.
10. Each successful direct/queued request creation consumes exactly one nonce for the originating agent; reverted calls consume none.
11. A request executes at most once and each approver contributes at most one valid approval.
12. Factory prediction equals deployment for identical constructor inputs and provenance is tied to the exact pinned factory/runtime version.

### Missing or insufficient coverage

- The V2 invariant handler (`contracts/test/RuleWalletV2Invariant.t.sol:9-31`) exercises only direct native transfers and time movement. It does not fuzz USDG, strategies, approvals, revocation, expiry, role mutation, policy mutation, pause, owner withdrawals, or malicious recipients/tokens.
- No stateful invariant proves M-01's required lifecycle behavior.
- No V2 fuzz tests cover hour-boundary rolling accounting across policy reductions/increases and pending requests.
- No V2 tests cover duplicate approvers, unattainable thresholds, role collisions, default-admin transfer, role revocation after approval, ERC-1271 owners, fee-on-transfer tokens, no-return tokens, reentrant token callbacks, or a reverting/malformed canonical token.
- No backend tests exercise `mainnet-agent-runner.ts`, `mainnet-agent-store.ts`, `secure-agent-signer.ts`, `mainnet-clients.ts`, cron authorization, RPC disagreement, signer mismatch, nonce races, ambiguous timeouts, or alert failure.
- Frontend tests do not compare prepared transaction bytes with the eventual wallet request for every action, and did not cover USDG decimals.

Recommended stateful handlers should randomly mutate roles, trusted recipients, asset policies, approval thresholds, pause, time, balances, strategies, approvals, cancellations, and execution order. A separate backend fault-injection suite should model multiple scheduler instances, Redis failures, RPC forks, signer timeouts, replacement transactions, delayed confirmations, and alert outages.

## Deployment and configuration review

### Confirmed correct

- Deployment script blocks a chain other than `4663` and pins the official USDG address.
- Script source contains no private key read.
- Generated factory/V2 artifacts match the current Foundry build.
- CREATE2 prediction includes owner, user salt, version hash, and constructor creation-code hash.
- Factory/accounts are non-upgradeable.
- Mainnet and testnet registries are separate.

### Mainnet deployment blockers

1. **Fix H-01 and audit every existing USDG policy before any USDG deposit or agent use.**
2. Fix M-01 and add lifecycle regression/invariant tests.
3. Replace the generic signer URL gate with a verified non-exportable signer integration (M-02).
4. Implement and failure-test global nonce serialization and reconciliation (M-03).
5. Add independent RPC agreement and strict signer-side fee/gas ceilings (M-04).
6. Pin and independently verify factory and account runtime/provenance (M-05).
7. Make current-state mainnet fork testing mandatory in release CI and validate USDG decimals (L-03).
8. Add backend concurrency, signer, RPC, and alert fault-injection tests.
9. Configure and test monitoring before autonomy; alert delivery must not be optional in an enabled-autonomy environment.
10. Reconcile documentation with actual deployed addresses and receipts; do not claim a factory/account is verified from getters alone.
11. Complete an independent external smart-contract and infrastructure audit after fixes. Resolve all Critical/High findings and explicitly accept or fix Medium findings.
12. Run a separately approved, low-value canary only after the external review and incident-response rehearsal. This internal report does not authorize that transaction.

## Test and tool evidence

Commands executed against the reviewed commit:

```text
npm run lint                                      PASS
npm run typecheck                                 PASS
npm test                                          PASS (8 files, 36 tests)
npm audit --omit=dev                              PASS (0 reported production vulnerabilities)
npm run contracts:artifact:check                  PASS
npm run build                                     PASS
forge fmt --check                                 PASS
RH_MAINNET_RPC_URL=<official public RPC> forge test -vv
                                                   PASS (36 tests; 512 fuzz runs/test;
                                                   128 invariant runs × depth 32;
                                                   live mainnet fork executed)
forge build --sizes                               PASS
```

The live fork passing does **not** negate H-01 because the current fork test never queries token decimals. No Slither, Semgrep, Mythril, symbolic execution, or formal verification result was available in the environment. The absence of findings from unavailable tools is not evidence of safety.

Read-only mainnet observations at block `13234086`:

```text
chainId                                           4663
USDG address                                      0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
USDG symbol()                                     USDG
USDG decimals()                                   6
configured factory deploymentChainId()            4663
configured factory canonicalStablecoin()          0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
configured factory VERSION()                      2.0.0-experimental
```

These getter observations do not establish deployed-bytecode equivalence; that is M-05.

## Final assessment

> Remediation note (security-beta): implementation status and test mappings are maintained in [`SECURITY_REMEDIATION.md`](SECURITY_REMEDIATION.md). This review remains an internal point-in-time report and has not become an independent audit.

RuleWallet V2 demonstrates a useful bounded-agent architecture, and its narrow contract surface is materially safer than a generic smart wallet with arbitrary calls. The current release must still be treated as **experimental and unaudited**. H-01 alone is sufficient to block meaningful mainnet USDG use, and M-01 through M-05 block autonomous mainnet operation and trustworthy onboarding.

Until fixes, regression tests, reproducible deployment verification, a verified non-exportable signer, and an external audit are complete:

- keep `ENABLE_MAINNET_AUTONOMY=false`;
- do not configure or use USDG through the current UI;
- do not deposit meaningful mainnet funds;
- do not claim RuleWallet is audited, secure, risk-free, or suitable for large balances;
- do not add swaps, bridges, arbitrary calls, generic approvals, or additional assets as part of remediation.
