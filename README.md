# RuleWallet

**Give agents authority, not your wallet.**

RuleWallet is an open-source policy and approval layer for onchain AI agents. It turns broad wallet access into narrow, inspectable authority: spending limits, token and contract allowlists, market constraints, human approvals, audit receipts, and instant revocation.

> **Status:** unaudited testnet production candidate. The repository now includes a wallet-connected interface and a tested onchain policy account. Mainnet is disabled. Do not use it with real assets.

## Why this exists

An agent with a wallet key has too much authority. A useful agent still needs to act without asking a human about every low-risk operation. RuleWallet puts a deterministic control plane between those two extremes.

The agent proposes a structured action. RuleWallet evaluates hard rules first, then returns one of three outcomes:

- `allowed` — every hard rule passes and no approval is required.
- `review` — hard rules pass, but the configured human threshold is crossed.
- `blocked` — at least one hard rule fails; human approval cannot override it.

## Working system

The repository includes:

- an interactive evaluator with safe, approval, and attack-like scenarios;
- injected-wallet and optional WalletConnect support;
- Robinhood Chain testnet switching and balance reads;
- server-proxied, rate-limited read-only RPC access;
- exact transaction simulation before a wallet signature;
- an OpenZeppelin-based policy account with agent, approver, guardian, and delayed-admin roles;
- per-asset transaction limits and bounded 24-hour spending buckets;
- expiring requests, nonces, emergency pause, and multi-human approvals;
- 19 Solidity unit, fuzz, reentrancy, malicious-token, boundary, and invariant tests;
- health checks, security headers, release gates, and incident documentation.
- a public guided demo, live onchain metrics, and shareable autonomous execution receipts.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then try `/playground` and `/app`.

For the deployed public flow, start at [rulewallet.vercel.app/demo](https://rulewallet.vercel.app/demo), inspect [live receipts](https://rulewallet.vercel.app/activity), and verify the metrics response at [`/api/public/metrics`](https://rulewallet.vercel.app/api/public/metrics).

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run contracts:test
npm run build
```

Run every local gate with `npm run verify`.

## Environment

The application works without secrets by falling back to Robinhood Chain's rate-limited public testnet RPC. Hosted use should set `RH_TESTNET_RPC_URL` to a managed provider endpoint. Browser-visible values are limited to public configuration such as the deployed contract address and WalletConnect project ID.

```dotenv
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GITHUB_URL=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS=
RH_TESTNET_RPC_URL=
ENABLE_MAINNET=false
```

See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

## Onchain policy account

[`contracts/src/RuleWalletPolicyAccount.sol`](contracts/src/RuleWalletPolicyAccount.sol) is deliberately non-upgradeable. It supports:

- allowlisted native calls;
- allowlisted direct ERC-20 transfers;
- agent nonces and request expiry;
- direct execution below an approval threshold;
- unique human approvals above the threshold;
- emergency pause and admin-only paused recovery;
- separate limits for each asset's native unit.

Arbitrary swaps are disabled. A generic calldata wrapper cannot prove slippage or token outflow; each router needs a specific audited adapter.

## Autonomous testnet agent

`/app/agent` manages a dedicated server-side testnet signer. The signer can only call the deployed policy account after the admin grants `AGENT_ROLE`; it cannot change policies, allowlist targets, approve requests, or bypass an emergency pause. Strategy mutations use short-lived, single-use EIP-191 signatures from the onchain admin.

Recurring transfer strategies are stored in Upstash Redis and evaluated by a protected Vercel Cron route once per day. Before every call, the runner checks the onchain role, target allowlist, active/pause state, native-asset policy, approval boundary, contract balance, and exact agent nonce, then performs an RPC simulation. Confirmed, blocked, and failed attempts appear on `/activity` with explorer receipts.

The dedicated signer key and `CRON_SECRET` are server-only Vercel secrets. They must never use a `NEXT_PUBLIC_` prefix. Mainnet remains hard-disabled, and the automation runner rejects amounts above the human-approval threshold.

Safe contracts could not be verified as officially supported on Robinhood Chain when this architecture was selected, so no Safe address is assumed or invented.

## Testnet deployment

For a single-wallet demo, open `/app/deploy` in a browser with MetaMask. The wizard is locked to Robinhood Chain Testnet (`46630`), deploys the exact bytecode committed in `src/generated`, and makes every setup action a separate wallet confirmation. The connected wallet receives the initial admin, guardian, agent, and approver roles; this arrangement is for low-value testnet onboarding only.

For separated production-style roles, use the Foundry deployment script. It never reads a private key. Configure public role addresses, then sign through a hardware wallet or another interactive Foundry signer:

```bash
cd contracts
export RH_TESTNET_RPC_URL="https://your-managed-testnet-rpc"
export RULEWALLET_ADMIN="0x..."
export RULEWALLET_GUARDIAN="0x..."
export RULEWALLET_AGENT="0x..."
export RULEWALLET_APPROVER_ONE="0x..."
export RULEWALLET_APPROVER_TWO="0x..."

forge script script/DeployRuleWallet.s.sol:DeployRuleWallet \
  --rpc-url robinhood_testnet \
  --broadcast \
  --ledger
```

Verify the resulting address on the Robinhood Chain testnet Blockscout instance, then set `NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS`. Never paste a seed phrase or private key into RuleWallet, a support message, or a committed environment file.

## Offchain policy example

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
Agent intent ──► local preview ──► RPC simulation ──► wallet signature
                                                          │
                                                          ▼
                                              RuleWalletPolicyAccount
                                             /          |           \
                                         execute     approvals      revert
                                            │            │             │
                                            ▼            ▼             ▼
                                         receipt      pending        blocked
```

The contract is the source of truth for financial rules. Frontend decisions are explanations, not authorization. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Safety boundary

This release is not certified for real funds. Before mainnet, RuleWallet requires an independent audit, resolved findings, verified bytecode, multisig administration, production RPC failover, monitoring, canary limits, legal review, and explicit owner approval. The full blocking checklist is in [`docs/MAINNET_CHECKLIST.md`](docs/MAINNET_CHECKLIST.md).

RuleWallet is not affiliated with Allowance, Robinhood Markets, Robinhood Chain, Y Combinator, or any protocol named in demo fixtures. It is an original implementation inspired by the general concept of scoped agent permissions.

There is no RuleWallet token, sale, airdrop, or investment product. Anyone claiming otherwise is unaffiliated.

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request. For vulnerabilities, follow [`SECURITY.md`](SECURITY.md) and do not create a public issue.

## License

MIT © 2026 RuleWallet contributors.
