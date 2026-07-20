# Environment setup

Copy `.env.example` to `.env.local` for development. Public variables are included in browser JavaScript; server variables and credentials must never use the `NEXT_PUBLIC_` prefix.

## Public browser configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical website URL |
| `NEXT_PUBLIC_GITHUB_URL` / `NEXT_PUBLIC_X_URL` | Public project links |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Public WalletConnect project identifier |
| `NEXT_PUBLIC_PRIVY_APP_ID` / `NEXT_PUBLIC_PRIVY_CLIENT_ID` | Public Privy application identifiers for passkey/embedded wallets |
| `NEXT_PUBLIC_RULEWALLET_TESTNET_V3_FACTORY_ADDRESS` | Exact-runtime-verified V3 factory on `46630` |
| `NEXT_PUBLIC_RULEWALLET_TESTNET_STABLECOIN_ADDRESS` | V3 valueless six-decimal `RuleWalletTestUSDG` |
| `NEXT_PUBLIC_RULEWALLET_MAINNET_V3_FACTORY_ADDRESS` | Exact-runtime-verified V3 factory on `4663` |
| `NEXT_PUBLIC_RULEWALLET_TESTNET_ADDRESS` | Legacy V1 public demo account |
| `NEXT_PUBLIC_RULEWALLET_MAINNET_FACTORY_ADDRESS` | Legacy V2 receipt compatibility only |
| `NEXT_PUBLIC_RULEWALLET_MAINNET_ACCOUNT_ADDRESS` | Legacy V2 example account only |
| `NEXT_PUBLIC_ENABLE_EXPERIMENTAL_MAINNET` | Displays mainnet user controls; it does not enable automation |

Never set a V3 factory variable until the factory and both helper runtime hashes, version, chain, stablecoin, and constructor values pass `verifyFactoryV3`.

## RPC, storage, and scheduling

| Variable | Purpose |
| --- | --- |
| `RH_TESTNET_RPC_URL` / `RH_TESTNET_RPC_FALLBACK_URL` | Managed testnet primary/failover |
| `RH_MAINNET_RPC_URL` / `RH_MAINNET_RPC_FALLBACK_URL` | Two independent managed mainnet hosts |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Quotes, carts, approvals, strategies, receipts, locks, nonces, idempotency |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Supported Vercel Marketplace aliases |
| `COMMERCE_SESSION_SECRET` | Server-only 32-byte hex key for short-lived wallet-authenticated private commerce sessions |
| `CRON_SECRET` | Authenticates scheduler routes; at least 16 random characters |
| `MAINNET_SCHEDULER_MODE` | `vercel-pro-cron` or `external-durable`, only after the scheduler exists |
| `AGENT_PRIVATE_KEY` | Legacy testnet-only signer; mainnet code never reads it |

The official Robinhood RPC is rate-limited and is a public fallback, not one of the two production signer RPCs.

## Mainnet signer and operations

| Variable | Purpose |
| --- | --- |
| `ENABLE_MAINNET` | Enables server-side mainnet reads/status |
| `ENABLE_MAINNET_AUTONOMY` | Defaults `false`; every live gate must pass before `true` |
| `MAINNET_SIGNER_MODE` | `disabled` or `external-kms` |
| `MAINNET_AGENT_ADDRESS` | Public address of the non-exportable signer |
| `MAINNET_SIGNER_ENDPOINT` | Private HTTPS KMS/MPC/HSM service endpoint |
| `MAINNET_SIGNER_AUTH_TOKEN` | Runtime-only service credential |
| `MAINNET_SIGNER_ALLOWED_HOST` | Exact signer hostname allowlist |
| `MAINNET_SIGNER_KEY_ID` | Public non-exportable key identity |
| `MAINNET_SIGNER_ATTESTATION_SHA256` | Expected `sha256:<64 hex>` public-key attestation |
| `MAINNET_STRATEGY_ENCRYPTION_KEY` | Server-only 32-byte hex key for AES-256-GCM strategy-signature encryption |
| `MAINNET_MAX_GAS` | Hard transaction gas ceiling |
| `MAINNET_MAX_FEE_PER_GAS_WEI` | Hard EIP-1559 max-fee ceiling |
| `MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI` | Hard priority-fee ceiling |
| `MAINNET_ALERT_WEBHOOK_URL` / `MAINNET_ALERT_WEBHOOK_TOKEN` | Authenticated HTTPS incident delivery |
| `TESTNET_NOTIFICATION_WEBHOOK_URL` / `TESTNET_NOTIFICATION_WEBHOOK_TOKEN` | Optional testnet receipt delivery |

`/api/mainnet/status` reports public readiness only. A raw key, environment flag, or operator cannot bypass a failed runtime gate.

## Commerce providers

| Variable | Mode enabled |
| --- | --- |
| `DUFFEL_ACCESS_TOKEN` | Use a `duffel_test_…` token for official test flight offers |
| `TICKETMASTER_API_KEY` | Official event discovery and hosted checkout links |
| `SHOPIFY_STOREFRONT_DOMAIN` / `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | Reserved; no live purchase until a merchant adapter is completed |
| `STRIPE_SECRET_KEY` | Reserved; no Issuing purchase until provider approval and webhooks exist |

Provider keys remain server-only. A configured key does not automatically set `canPurchase` or `handlesRealFunds`; the adapter must explicitly implement and test the full payment/confirmation lifecycle.

Private order and approval routes require a one-time wallet login message. The challenge is stored briefly and atomically consumed in Redis; the resulting 30-minute session is an HMAC-authenticated HttpOnly, SameSite cookie. This signature cannot move funds and is separate from EIP-712 purchase approval or strategy authorization.

## Production separation

- Use different Privy apps, RPC keys, Redis projects, provider credentials, signer credentials, and contract registries per environment.
- Put secrets only in encrypted Vercel variables, never Git, screenshots, browser variables, support messages, or build logs.
- Restrict the signer by workload identity, account allowlist, exact V3 selector, chain, zero value, fees, and RPC agreement.
- Rehearse guardian pause, signer revocation, owner recovery, provider outage, timeout, replacement, and late-confirmation handling.
