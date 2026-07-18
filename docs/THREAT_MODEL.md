# Threat model

## Assets

- ETH and supported ERC-20 balances held by the policy account;
- role assignments, limits, allowlists, nonces, and pending approvals;
- user intent displayed before a signature;
- managed RPC credentials and deployment metadata;
- the dedicated agent signer, strategy records, and one-time admin signatures;
- the integrity of contract bytecode and the web deployment.

## Adversaries

- a compromised or prompt-injected AI agent;
- a malicious target or ERC-20 contract;
- a phished approver, guardian, or admin;
- a compromised browser extension or frontend deployment;
- an RPC provider returning stale or false data;
- an attacker replaying, reordering, or front-running requests;
- a malicious dependency or CI credential compromise.

## Primary abuse cases and controls

| Threat | Control | Residual risk |
| --- | --- | --- |
| Agent spends beyond authority | Per-asset transaction and rolling limits enforced onchain | Admin can reconfigure limits |
| Agent calls arbitrary destination | Target allowlist enforced at proposal and execution | Allowed target can itself be vulnerable |
| Agent replays a request | Strict per-agent nonce and expiry | Compromised agent can use the next valid nonce |
| High-value request bypasses humans | Unique approver mapping and threshold checked onchain | Approver keys may be compromised |
| Request becomes unsafe while pending | Policy and rolling limits rechecked at execution | Target behavior can change after approval |
| Reentrancy | Reentrancy guard and state finalized before external call | Allowed target logic still needs review |
| Non-standard token lies | SafeERC20 and balance checks | Fee-on-transfer/rebasing semantics are unsupported |
| UI swaps transaction after preview | Prepared arguments are rendered and reused for wallet signing | Compromised wallet can still display false information |
| RPC credential theft | Provider URL is server-only behind `/api/rpc` | Server compromise exposes provider access |
| Scheduled signer compromise | Dedicated EOA has only `AGENT_ROLE`; onchain limits and allowlists remain mandatory | Attacker can spend within the remaining policy allowance until revocation |
| Admin-signature replay | Chain/contract-bound payload, five-minute expiry, Redis one-time nonce | Storage outage blocks legitimate mutations |
| Duplicate scheduler delivery | Per-strategy Redis execution lock plus strict onchain agent nonce | A lock expiry during an unusually long RPC incident can create a failed duplicate attempt |
| Emergency | Guardian pause; admin recovery only while paused | Guardian can deny service; admin controls recovery |

## Invariants

- Rolling spend recorded by the account never exceeds the configured asset limit.
- A request ID is never reused.
- A consumed agent nonce cannot be replayed.
- Approval cannot make a failed hard rule executable.
- A finalized or expired request cannot execute.
- The guardian cannot unpause or withdraw.
- No server process signs an admin, guardian, approver, or user-wallet transaction. The dedicated server agent signs only `AGENT_ROLE` calls that still pass onchain policy checks.

## Excluded claims

The current test suite does not prove economic safety, correctness of third-party targets, RPC honesty, protection from wallet malware, or readiness for mainnet. Those claims require independent review and operational controls.
