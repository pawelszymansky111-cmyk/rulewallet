# RuleWallet — hackathon submission

**Current release:** a complete autonomous Robinhood Chain testnet beta plus an experimental mainnet preview for manual actions only. The security-beta fixes canonical 6-decimal USDG handling, stale queued authorization, role/approval separation, pinned factory provenance, and fail-closed production automation gates. This is an internal security review, not an external audit.

## Submission title

**RuleWallet: Bounded onchain authority for autonomous agents**

## One-line description

RuleWallet lets AI agents execute useful onchain actions through a policy account that enforces target allowlists, spending limits, approvals, expiry, pause, and revocation without giving the agent the owner's wallet key.

## Track and network

- Network: Robinhood Chain Testnet
- Chain ID: `46630`
- Category: agent infrastructure / programmable wallets / onchain security
- Status: working, open-source, unaudited testnet MVP

## Problem

Autonomous agents need authority to pay, rebalance, subscribe, or interact with protocols. Giving an agent a normal wallet key grants far more authority than any single task requires. Prompt rules are not a security boundary: a compromised model, backend, or agent key can still sign unintended transactions.

## Solution

RuleWallet places a non-upgradeable policy account between agent intent and execution. The owner keeps the admin wallet. A separate agent signer receives only `AGENT_ROLE` and can execute actions that pass the current onchain policy.

The policy account enforces:

- allowed recipients and targets;
- independent native/token policies;
- maximum value per transaction;
- bounded rolling 24-hour spend;
- human approval above a threshold;
- agent nonces and request expiry;
- guardian emergency pause;
- explicit role revocation;
- public request and execution events.

## What is working

- Deployed Robinhood Chain testnet policy contract.
- Dedicated server-side testnet signer holding only `AGENT_ROLE`.
- Daily and weekly recurring transfer strategies stored in Redis.
- Exact RPC simulation before every autonomous broadcast.
- Wallet-scoped personal policy-account selection.
- Admin-verified trusted-address enable and revoke flow.
- Live onchain metrics and public explorer-backed receipts.
- Human approval, emergency pause, agent revoke, and clear blocked states.
- Policy simulator with allowed, review, and blocked scenarios.
- Full Next.js application, Foundry contracts, CI, threat model, and incident runbook.

## Why it is different

1. **The contract is the security boundary.** Frontend labels and model output cannot grant authority.
2. **The agent does not receive the owner key.** Compromise is limited to the role and policy currently granted.
3. **Simulation is part of the execution path.** The exact action is tested against current state before signing.
4. **Receipts are public proof.** Judges can verify the real transaction, block, target, and application receipt.
5. **Failure is a first-class demo.** Unknown targets, exceeded limits, stale nonces, pause state, and missing roles fail closed.

## Architecture

```text
Scheduled strategy
       │
       ▼
Dedicated AGENT_ROLE signer
       │ read state + simulate exact call
       ▼
RuleWalletPolicyAccount
   ├── hard rule fails ──► revert / blocked receipt
   ├── below threshold ──► execute / public receipt
   └── above threshold ──► independent human approvals
```

The server never receives the owner's seed phrase or admin key. Strategy mutations require a short-lived, single-use signature from the onchain admin. The agent cannot edit policy, allowlist targets, approve requests, unpause, or recover funds.

## Two-minute judge demo

1. **0:00–0:30 — Live guardrails:** open `/demo` and show the active policy, testnet balance, rolling allowance, observed block, and granted agent role.
2. **0:30–1:05 — Verifiable execution:** open the latest receipt and compare its transaction hash with the Robinhood Chain testnet explorer.
3. **1:05–2:00 — Failure and control:** open `/playground`, exceed a limit or choose an unknown target, then show pause and revoke in `/app/agent`.

## Links

- Product: https://rulewallet.vercel.app
- Hackathon page: https://rulewallet.vercel.app/hackathon
- Two-minute demo: https://rulewallet.vercel.app/demo
- Onboarding: https://rulewallet.vercel.app/start
- Public receipts: https://rulewallet.vercel.app/activity
- Source: https://github.com/pawelszymansky111-cmyk/rulewallet

## Safety and honest limitations

RuleWallet is unaudited testnet software. Testnet ETH has no real value. Mainnet and real funds are disabled. Generic DeFi router calls remain unsupported because an address allowlist alone cannot constrain selectors, token flow, recipient, or minimum output. Each protocol requires a dedicated audited adapter.

There is no RuleWallet token, sale, airdrop, investment product, or affiliation with Robinhood Markets.

## Roadmap

1. Build selector-limited adapters for exchanges, lending, bridges, and tokenized assets.
2. Add ERC-4337 session keys with expiry and narrow permissions.
3. Complete independent audits and publish resolved findings.
4. Move administration to a verified multisig and add monitored RPC failover.
5. Run small-value canaries only after every documented mainnet gate has evidence.
