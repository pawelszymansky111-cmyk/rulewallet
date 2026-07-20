# RuleWallet

**Tell your agent what to buy. Keep the keys and the limits.**

RuleWallet is an open-source spending command center for AI agents on Robinhood Chain. A user connects an external wallet or creates a passkey-backed embedded wallet, deploys named personal policy accounts, and gives an agent narrow payment authority instead of a private key.

> **Release:** V3 `3.1.0-commerce-beta` is implemented for Robinhood Chain testnet (`46630`) and mainnet (`4663`). Testnet uses valueless assets. Mainnet contracts and automation require separate operator/user signatures and production infrastructure; missing gates fail closed. This repository is not independently audited and is not affiliated with Robinhood or any named commerce provider.

## What V3 does

- External MetaMask/WalletConnect-style connection or optional Privy passkey/email embedded wallets.
- Multiple embedded addresses and multiple named non-upgradeable policy accounts.
- Separate owner, agent, approver, guardian, and delayed-admin authority.
- Direct native ETH and canonical six-decimal USDG payments only.
- Trusted merchants with enable/revoke, category, expiry, and explicit automatic-payment permission.
- Per-transaction, rolling 24-hour, daily, weekly, 30-day, category, merchant, and payment-count limits.
- Weekday and UTC-minute schedules.
- Real-time human approval above a threshold or for merchants not approved for automatic payment.
- EIP-712 strategies bound to chain, account, asset, merchant, amount, category, intent, nonce, expiry, interval, and maximum executions.
- Agent/strategy revocation, emergency pause, owner unpause, and owner withdrawal.
- Exact simulation plus chain, target, value, gas, calldata, and expected result before wallet signatures.
- Quote → cart → verified onchain policy → approval lifecycle with durable IDs; payment/confirmation/reconciliation states activate only for an implemented direct or provider rail.
- Duffel official test-mode flight offers and Ticketmaster official event discovery/hosted checkout when credentials exist.
- A separate technical console, Simple/Pro language modes, public activity, and an approval inbox.

The contracts deliberately contain no arbitrary call, `delegatecall`, generic ERC-20 approval, DEX router, swap, bridge, or upgrade path.

## Honest commerce boundary

Direct trusted-recipient transfers and scheduled V3 transfers are the onchain payment rails. Duffel is test-mode only and Ticketmaster is discovery plus hosted checkout. Shopify, virtual-card, food-ordering, and real provider fulfillment remain disabled until their production credentials, agreement, payment rail, webhooks, refunds, and reconciliation are implemented.

See [`docs/COMMERCE_CAPABILITY_MATRIX.md`](docs/COMMERCE_CAPABILITY_MATRIX.md). The application never labels a search result as `paid` or `confirmed`.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- `/command` — primary user Command Center;
- `/approvals` — expiring human approvals;
- `/mainnet` — V3 mainnet accounts, policies, and strategies;
- `/app` — separate technical console;
- `/app/operator` — V3 testnet token/factory and mainnet factory deployment preview;
- `/demo` — legacy guided testnet demo;
- `/activity` — public receipts.

Without Privy, Redis, provider keys, V3 factory addresses, or a secure signer, the related feature reports a disabled/preview state. It does not fabricate success.

## Environment essentials

```dotenv
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_PRIVY_CLIENT_ID=
NEXT_PUBLIC_RULEWALLET_TESTNET_V3_FACTORY_ADDRESS=
NEXT_PUBLIC_RULEWALLET_TESTNET_STABLECOIN_ADDRESS=
NEXT_PUBLIC_RULEWALLET_MAINNET_V3_FACTORY_ADDRESS=

RH_TESTNET_RPC_URL=
RH_TESTNET_RPC_FALLBACK_URL=
RH_MAINNET_RPC_URL=
RH_MAINNET_RPC_FALLBACK_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
COMMERCE_SESSION_SECRET=
COMMERCE_DATA_ENCRYPTION_KEY=

DUFFEL_ACCESS_TOKEN=
TICKETMASTER_API_KEY=

ENABLE_MAINNET=true
ENABLE_MAINNET_AUTONOMY=false
MAINNET_SIGNER_MODE=disabled
MAINNET_STRATEGY_ENCRYPTION_KEY=
```

Private commerce records are accepted only when durable Redis, the short-lived wallet-session secret, and a separate AES-256-GCM data key are all configured. Direct and recurring onchain requests require an exact recipient and exact user-entered amount; provider prices cannot be overwritten. See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for the full signer, scheduler, monitoring, storage, private commerce-session, and provider configuration. Never put a private key, seed phrase, provider secret, Redis token, encryption key, session secret, or signer token in a `NEXT_PUBLIC_` variable.

## Contracts

- [`RuleWalletFactoryV3.sol`](contracts/src/RuleWalletFactoryV3.sol) deploys personal accounts through a dedicated CREATE2 helper and records their version.
- [`RuleWalletPolicyAccountV3.sol`](contracts/src/RuleWalletPolicyAccountV3.sol) holds funds, roles, strategies, requests, approvals, pause, and owner recovery.
- [`RuleWalletPolicyRegistryV3.sol`](contracts/src/RuleWalletPolicyRegistryV3.sol) holds merchant/category/time/asset rules and records spend.
- [`RuleWalletTestUSDG.sol`](contracts/src/RuleWalletTestUSDG.sol) is a valueless six-decimal faucet token that refuses deployment on chain `4663`.

The frontend/backend reconstruct exact immutable-linked factory/helper runtime bytecode and reject getter-only spoof contracts. Each account's policy registry must point back to that account and the expected stablecoin.

## Mainnet autonomy

Mainnet never reads `AGENT_PRIVATE_KEY`. The `SecureAgentSigner` interface talks to a separately operated KMS/MPC/HSM signer. The included AWS KMS service holds a non-exportable secp256k1 key and independently restricts chain `4663`, zero value, account allowlist, exact V3 selector, fees, nonce, and idempotency.

Execution requires all of the following at once:

- exact V3 factory/helper and account/registry provenance;
- canonical USDG symbol/address/six decimals;
- verified remote signer address, key ID, attestation, and HTTPS host;
- two independent managed RPC hosts in agreement;
- durable Redis locks and unresolved-nonce reservation;
- authenticated scheduler and incident alerts;
- gas/fee ceilings;
- current `AGENT_ROLE`, strategy authorization, merchant/category/time/budget rules, and successful simulation.

The default is `ENABLE_MAINNET_AUTONOMY=false`. Deployment steps are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and the activation gates are in [`docs/MAINNET_CHECKLIST.md`](docs/MAINNET_CHECKLIST.md).

## Verification

```bash
npm run verify
npm audit --omit=dev --audit-level=high
```

`npm run verify` runs ESLint, TypeScript, Vitest, isolated signer tests, internal-link checks, Foundry formatting, all Solidity unit/fuzz/invariant tests, a current Robinhood Chain mainnet fork, generated-artifact checks, and the production Next.js build.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)
- [`docs/COMMERCE_CAPABILITY_MATRIX.md`](docs/COMMERCE_CAPABILITY_MATRIX.md)
- [`docs/PROVIDER_INTEGRATIONS.md`](docs/PROVIDER_INTEGRATIONS.md)
- [`docs/RECOVERY.md`](docs/RECOVERY.md)
- [`docs/COMMAND_CENTER_DEMO.md`](docs/COMMAND_CENTER_DEMO.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/MAINNET_CHECKLIST.md`](docs/MAINNET_CHECKLIST.md)
- [`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md)
- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md) — preserved internal V2 review, not an independent audit.

## Security and contribution

Use [`SECURITY.md`](SECURITY.md) for vulnerability reports and [`CONTRIBUTING.md`](CONTRIBUTING.md) for changes. Do not create a public issue for an unpatched vulnerability.

There is no RuleWallet token, sale, airdrop, or investment product.

MIT © 2026 RuleWallet contributors.
