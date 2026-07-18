# RuleWallet

**Give agents authority, not your wallet.**

RuleWallet is an open-source policy and approval layer for onchain AI agents. It turns broad wallet access into narrow, inspectable authority: spending limits, token and contract allowlists, market constraints, human approvals, audit receipts, and instant revocation.

> **Status:** V1 remains a working testnet demo. V2 is an experimental, unaudited Robinhood Chain mainnet release candidate. No mainnet contract is deployed by this repository update, autonomous mainnet execution is disabled by default, and the software is not suitable for large balances. RuleWallet is not affiliated with Robinhood.

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
- wallet-specific policy-account selection and a self-service trusted-address book;
- onchain admin verification and simulated allowlist changes before every signature;
- a verified-source ecosystem directory with unsafe generic router permissions gated;
- an OpenZeppelin-based V1 testnet account plus a versioned V2 mainnet factory;
- personal non-upgradeable V2 accounts with separate owner, agent, approver, and guardian roles;
- direct native ETH and canonical USDG transfers only in V2—no arbitrary calls, approvals, swaps, routers, bridges, or stock-token trading;
- per-asset transaction limits and bounded 24-hour spending buckets;
- EIP-712 recurring strategies, expiry, replay controls, emergency pause, and multi-human approvals;
- unrestricted owner deposit/withdrawal of available balances, isolated from agent limits;
- 36 Solidity unit, factory, fork, fuzz, reentrancy, malicious-token, boundary, and invariant tests;
- health checks, security headers, release gates, and incident documentation.
- a public guided demo, live onchain metrics, and shareable autonomous execution receipts.

Open `/app/services` to select a policy account owned by the connected wallet, add a labeled recipient, preview the exact `setTargetAllowed` call, and enable or disable it onchain. Labels stay local to the browser; the contract permission is the source of truth.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then try `/playground` and `/app`.

For the deployed public flow, start at [rulewallet.vercel.app/demo](https://rulewallet.vercel.app/demo), inspect [live receipts](https://rulewallet.vercel.app/activity), or open the explicitly experimental [mainnet lab](https://rulewallet.vercel.app/mainnet). The mainnet UI stays in preparation mode until a verified V2 factory address exists.

For hackathon review, open the [submission page](https://rulewallet.vercel.app/hackathon), follow the [two-minute judge demo](https://rulewallet.vercel.app/demo), or use the [owner onboarding flow](https://rulewallet.vercel.app/start). Ready-to-paste submission and pitch copy live in [`docs/HACKATHON_SUBMISSION.md`](docs/HACKATHON_SUBMISSION.md) and [`docs/PITCH_SCRIPT.md`](docs/PITCH_SCRIPT.md).

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
NEXT_PUBLIC_RULEWALLET_MAINNET_FACTORY_ADDRESS=
NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAINNET=true
RH_TESTNET_RPC_URL=
RH_TESTNET_RPC_FALLBACK_URL=
RH_MAINNET_RPC_URL=
RH_MAINNET_RPC_FALLBACK_URL=
ENABLE_MAINNET=true
ENABLE_MAINNET_AUTONOMY=false
MAINNET_SIGNER_MODE=disabled
```

See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md).

## Onchain policy accounts

[`contracts/src/RuleWalletPolicyAccount.sol`](contracts/src/RuleWalletPolicyAccount.sol) is deliberately non-upgradeable. It supports:

- allowlisted native calls;
- allowlisted direct ERC-20 transfers;
- agent nonces and request expiry;
- direct execution below an approval threshold;
- unique human approvals above the threshold;
- emergency pause and admin-only paused recovery;
- separate limits for each asset's native unit.

[`contracts/src/RuleWalletPolicyAccountV2.sol`](contracts/src/RuleWalletPolicyAccountV2.sol) is the narrower experimental mainnet design. It supports only direct ETH and immutable canonical USDG transfers to trusted recipients. Every enabled agent asset requires owner-set per-transaction and rolling 24-hour limits. Optional thresholds create pending human approvals. EIP-712 strategies bind chain, account, asset, recipient, amount, nonce, expiry, recurrence interval, and execution cap.

[`contracts/src/RuleWalletFactory.sol`](contracts/src/RuleWalletFactory.sol) deploys personal V2 accounts with CREATE2 and records their version. V2 has no proxy or upgrade hook. Owner withdrawals are explicit wallet transactions and are not constrained by agent allowances.

## Autonomous testnet agent

`/app/agent` manages a dedicated server-side testnet signer. The signer can only call the deployed policy account after the admin grants `AGENT_ROLE`; it cannot change policies, allowlist targets, approve requests, or bypass an emergency pause. Strategy mutations use short-lived, single-use EIP-191 signatures from the onchain admin.

Recurring transfer strategies are stored in Upstash Redis and evaluated by a protected Vercel Cron route once per day. Before every call, the runner checks the onchain role, target allowlist, active/pause state, native-asset policy, approval boundary, contract balance, and exact agent nonce, then performs an RPC simulation. Confirmed, blocked, and failed attempts appear on `/activity` with explorer receipts.

The legacy dedicated signer key and `CRON_SECRET` are testnet-only server secrets. Mainnet never reads `AGENT_PRIVATE_KEY`; it uses a `SecureAgentSigner` interface for a separately operated non-exportable KMS/MPC/HSM key and fails closed when that configuration is missing. `ENABLE_MAINNET_AUTONOMY` remains a separate kill switch.

The service directory links to protocols listed by official Robinhood Chain or protocol documentation. It deliberately does not hard-code router targets: the current policy account permits arbitrary calldata to an allowed native-call target, so each DeFi integration needs a selector-limited, token-aware, minimum-output adapter and an independent review.

Safe contracts could not be verified as officially supported on Robinhood Chain when this architecture was selected, so no Safe address is assumed or invented.

## Deployment

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

For experimental mainnet, first read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and [`docs/MAINNET_CHECKLIST.md`](docs/MAINNET_CHECKLIST.md). The V2 factory script requires chain `4663` and canonical USDG, but intentionally stops at a no-broadcast simulation unless a human explicitly runs an external hardware-wallet command. Before any signature, review the exact chain, creation bytecode, zero value, constructor arguments, and expected factory state.

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

V2 is experimental and unaudited. Publishing the UI is not permission to deploy contracts, enable automation, or use a large balance. Independent review, verified bytecode, separate operational roles, non-exportable signing, production RPC failover, monitoring, incident drills, restrictive canaries, and explicit owner approvals remain documented gates in [`docs/MAINNET_CHECKLIST.md`](docs/MAINNET_CHECKLIST.md).

RuleWallet is not affiliated with Allowance, Robinhood Markets, Robinhood Chain, Y Combinator, or any protocol named in demo fixtures. It is an original implementation inspired by the general concept of scoped agent permissions.

There is no RuleWallet token, sale, airdrop, or investment product. Anyone claiming otherwise is unaffiliated.

## Contributing and security

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a pull request. For vulnerabilities, follow [`SECURITY.md`](SECURITY.md) and do not create a public issue.

## License

MIT © 2026 RuleWallet contributors.
