# RuleWallet launch kit

## Positioning

**Name:** RuleWallet  
**Tagline:** Agents act. Rules hold.  
**One sentence:** RuleWallet gives onchain AI agents scoped authority with spending caps, contract allowlists, human approvals, audit receipts, and instant revocation.

RuleWallet should be introduced as original open-source testnet infrastructure. Do not call it an Allowance clone, imply a Robinhood partnership, or mention a token.

## X profile

**Display name:** RuleWallet  
**Handle candidates:** `@RuleWalletDev`, `@UseRuleWallet`, `@RuleWalletHQ` — verify availability before claiming.  
**Bio:** Policy controls for onchain AI agents. Spending caps, allowlists, approvals, and receipts. Building on Robinhood Chain testnet. Open source.  
**Website:** use the deployed product URL.  
**Location:** Internet / Testnet

## Pinned launch post

> AI agents need authority to act—but they should never inherit your whole wallet.
>
> We built RuleWallet: an open-source policy and approval layer for onchain agents.
>
> • per-action and daily caps  
> • token + contract allowlists  
> • human approval thresholds  
> • explainable decision receipts  
> • instant revoke
>
> The interactive testnet demo is live. Try to break a policy, inspect the code, and tell us what fails.
>
> [demo URL]  
> https://github.com/pawelszymansky111-cmyk/rulewallet

Attach a 20–30 second recording: safe swap → excessive spend → unknown contract → stale oracle.

## Five build-in-public posts

### 1. The problem

> Giving an AI agent a wallet key is an all-or-nothing permission model. We are building a narrow control plane instead: the agent proposes an action, a deterministic policy decides, and a human steps in only when needed. What rule would you never let an agent bypass?

### 2. Product proof

> RuleWallet now evaluates 8 controls locally: agent status, token, contract, transaction cap, daily cap, slippage, oracle freshness, and trading window. Each result includes evidence—not a vague “safe” score. Playground: [URL]

### 3. Security honesty

> RuleWallet is testnet software, not audited custody infrastructure. No live signer. No real funds. No token. We published the boundary because security products should state what they do not solve. Threat model: [URL]

### 4. Builder request

> Looking for two kinds of feedback: agent builders who need constrained payments, and smart-account/security engineers who can attack our policy model. Repo: [URL]. Open an issue with a scenario that should be blocked.

### 5. Weekly proof

> Week one of RuleWallet: working evaluator, policy builder, decision receipts, docs, threat model, and public repo. Next: one real Robinhood Chain testnet simulation path. Follow the commits, not the promises: https://github.com/pawelszymansky111-cmyk/rulewallet

## 30-second demo script

1. “An agent wants to swap 45 USDC. Eight rules pass, so RuleWallet allows it.”
2. Move amount to 150. “The action is valid, but our threshold routes it to a human.”
3. Move amount above 250. “This is a hard cap, so even a human cannot approve it.”
4. Select the unknown contract. “Unknown targets fail closed.”
5. “Every result creates evidence an operator can audit later.”

## Outreach message

> Hey — I’m building RuleWallet, an open-source policy layer for onchain AI agents. The first testnet demo has deterministic spending caps, allowlists, approval thresholds, and per-rule receipts. I’m looking for hard failure scenarios from agent and wallet builders, not generic launch feedback. Would you try the playground or point me to the right person in your community? [URL]

## First communities to approach

- Robinhood Chain developer channels and hackathons
- account-abstraction and smart-wallet builders
- MCP and autonomous-agent builders
- onchain security reviewers
- open-source fintech and crypto developer groups

Contribute first: answer questions, publish a useful failure case, or fix a small issue before dropping a project link.

## Launch checklist

- Replace every placeholder URL and verify profile handles.
- Enable GitHub Discussions and private vulnerability reporting.
- Pin a clear testnet warning in README, app, and X profile.
- Record the demo at 1080p with no wallet or personal information visible.
- Open 3–5 concrete starter issues before inviting contributors.
- Share one technical artifact per post: rule trace, threat-model item, benchmark, or diff.
- Do not announce a token, partnership, audit, or production readiness.
