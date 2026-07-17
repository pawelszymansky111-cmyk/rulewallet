# Environment setup

## Public browser configuration

These values are visible in the JavaScript bundle and must never contain secrets.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical website URL |
| `NEXT_PUBLIC_GITHUB_URL` | Public repository link |
| `NEXT_PUBLIC_X_URL` | Optional public social link |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Public WalletConnect project identifier |
| `NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS` | Verified policy-account address on chain 46630 |

## Server-only configuration

| Variable | Purpose |
| --- | --- |
| `RH_TESTNET_RPC_URL` | Managed Robinhood Chain testnet JSON-RPC endpoint |
| `ENABLE_MAINNET` | Must be exactly `false` in this release |

The application validates server configuration lazily so static builds do not initialize services before runtime variables exist.

## Vercel environments

Configure development, preview, and production separately. A preview deployment should be validated before promotion. Never copy a production provider credential into a public variable or a GitHub issue.

Production may start with the public fallback RPC for interface review, but the health endpoint will report `public-fallback`. A real testnet launch should report `managed`.

## Health check

`GET /api/health` returns the chain, deployment environment, commit, RPC mode, and whether a policy address is configured. It never returns the provider URL or any credential.
