# Environment setup

## Public browser configuration

These values are bundled into JavaScript and must never contain secrets.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical website URL |
| `NEXT_PUBLIC_GITHUB_URL` / `NEXT_PUBLIC_X_URL` | Public project links |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Public WalletConnect project identifier |
| `NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS` | Existing V1 testnet demo account |
| `NEXT_PUBLIC_RULEWALLET_MAINNET_FACTORY_ADDRESS` | Verified V2 factory on chain 4663 |
| `NEXT_PUBLIC_RULEWALLET_MAINNET_ACCOUNT_ADDRESS` | Optional public read-only example V2 account |
| `NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAINNET` | Exposes the clearly labelled mainnet control surface |

## Server-only configuration

| Variable | Purpose |
| --- | --- |
| `RH_TESTNET_RPC_URL` / `RH_TESTNET_RPC_FALLBACK_URL` | Managed testnet primary/failover |
| `RH_MAINNET_RPC_URL` / `RH_MAINNET_RPC_FALLBACK_URL` | Managed mainnet primary/failover |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Durable strategies, receipts, nonces, and locks |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Supported Vercel Marketplace aliases |
| `AGENT_PRIVATE_KEY` | Legacy dedicated testnet-only agent signer; never read by mainnet code |
| `CRON_SECRET` | Vercel Cron authentication secret |
| `ENABLE_MAINNET` | Enables server-side mainnet status/read features |
| `ENABLE_MAINNET_AUTONOMY` | Must remain `false`; the security-beta compile-time gate also prevents execution |
| `MAINNET_SIGNER_MODE` | `disabled` or `external-kms` |
| `MAINNET_AGENT_ADDRESS` | Public address of the non-exportable mainnet agent key |
| `MAINNET_SIGNER_ENDPOINT` | Private KMS/MPC/HSM signing-service endpoint |
| `MAINNET_SIGNER_AUTH_TOKEN` | Runtime-only service credential; never logged or exposed |
| `MAINNET_SIGNER_ALLOWED_HOST` | Exact HTTPS hostname allowlist for the external signer |
| `MAINNET_SIGNER_KEY_ID` | Public non-exportable key identity from the real signer service |
| `MAINNET_SIGNER_ATTESTATION_SHA256` | Expected `sha256:<hex>` signer identity attestation |
| `MAINNET_MAX_GAS` | Hard gas limit; absence blocks future autonomy |
| `MAINNET_MAX_FEE_PER_GAS_WEI` | Hard EIP-1559 max-fee ceiling |
| `MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI` | Hard priority-fee ceiling |

If any gate is absent or invalid, `/api/mainnet/status` reports it. A raw `AGENT_PRIVATE_KEY` can never satisfy mainnet readiness. In this release, all mainnet autonomy remains disabled regardless of configuration.

## Production separation

- Use different provider credentials, Redis namespaces/projects, signer credentials, and contract registries per environment.
- Put secrets only in encrypted Vercel environment variables, never `.env.example`, Git, screenshots, chat, client variables, or build logs.
- Restrict the signer endpoint by workload identity or short-lived credentials and an exact chain/contract/function allowlist.
- Configure at least two independent managed RPC providers. The official public endpoint is a read fallback, not production infrastructure.
- Rotate credentials after incidents and rehearse signer/guardian recovery.

`GET /api/health` and `GET /api/mainnet/status` expose readiness booleans and public addresses only. They never return provider URLs, credentials, signed transactions, or private material.
