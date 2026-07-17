# RuleWallet

**Give agents authority, not your wallet.**

RuleWallet is an open-source policy and approval layer for onchain AI agents. It turns broad wallet access into narrow, inspectable authority: spending limits, token and contract allowlists, market constraints, human approvals, audit receipts, and instant revocation.

> **Status:** testnet prototype. The current build simulates policy decisions and product flows. It is not audited, does not sign transactions, and must not control real funds.

## Why this exists

An agent with a wallet key has too much authority. A useful agent still needs to act without asking a human about every low-risk operation. RuleWallet puts a deterministic control plane between those two extremes.

The agent proposes a structured action. RuleWallet evaluates hard rules first, then returns one of three outcomes:

- `allowed` — every hard rule passes and no approval is required.
- `review` — hard rules pass, but the configured human threshold is crossed.
- `blocked` — at least one hard rule fails; human approval cannot override it.

## Working demo

The repository includes:

- an interactive evaluator with safe, approval, and attack-like scenarios;
- a policy builder with portable JSON output;
- a demo operations dashboard;
- request receipts with per-rule evidence;
- product documentation and an explicit security boundary;
- launch copy for building the project in public.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then try `/playground`.

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Policy example

```json
{
  "network": "robinhood-chain-testnet",
  "limits": {
    "perTransactionUsd": 250,
    "dailyUsd": 1000
  },
  "approvalAboveUsd": 100,
  "allowedTokens": ["USDC", "WETH", "HOOD"],
  "allowedTargets": ["Uniswap Router", "Robinhood Swap"],
  "maxSlippageBps": 100,
  "maxOracleAgeSeconds": 90
}
```

The evaluator is intentionally small and auditable: [`src/lib/policy.ts`](src/lib/policy.ts).

## Architecture

```text
Agent intent
    │
    ▼
Request normalizer ──► Transaction simulation ──► Policy engine
                                                       │
                            ┌──────────────────────────┼───────────────────┐
                            ▼                          ▼                   ▼
                         ALLOWED                    REVIEW              BLOCKED
                            │                          │
                            ▼                          ▼
                      Scoped signer ◄──────── Human approval
                            │
                            ▼
                     Receipt + audit log
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the intended production split and trust boundaries.

## Two-week MVP boundary

This build focuses on a credible wedge: deterministic policy evaluation and a clear operator experience. A production signer, account abstraction, live chain simulation, persistence, authenticated approvals, and formal verification are later milestones.

RuleWallet is not affiliated with Allowance, Robinhood Markets, Robinhood Chain, Y Combinator, or any protocol named in demo fixtures. It is an original implementation inspired by the general concept of scoped agent permissions.

There is no RuleWallet token, sale, airdrop, or investment product. Anyone claiming otherwise is unaffiliated.

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request. For vulnerabilities, follow [`SECURITY.md`](SECURITY.md) and do not create a public issue.

## License

MIT © 2026 RuleWallet contributors.
