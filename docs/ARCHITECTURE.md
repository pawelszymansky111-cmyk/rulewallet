# RuleWallet V3 architecture

RuleWallet is a non-custodial spending command center. Users may connect an external EVM wallet or create a Privy embedded wallet protected by passkey/email authentication. The owner then deploys one or more named, non-upgradeable policy accounts. The application never receives a seed phrase or exportable private key.

## Environments

| Environment | Chain | Stablecoin | Purpose |
| --- | ---: | --- | --- |
| Robinhood Chain testnet | `46630` | `RuleWalletTestUSDG` (6 decimals, valueless) | Complete product testing |
| Robinhood Chain mainnet | `4663` | canonical USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` | Real assets after V3 deployment and production gates |

V1 and V2 remain in the repository for historical testnet receipts and migrations. New accounts, policies, strategy signatures, and automation use V3 only.

## Contract graph

```text
RuleWalletFactoryV3  ──creates──► RuleWalletAccountDeployerV3
        │                              │ CREATE2
        │                              ▼
        │                    RuleWalletPolicyAccountV3
        │                              │ immutable link
        └──creates──► RegistryDeployerV3
                                       │ CREATE2
                                       ▼
                           RuleWalletPolicyRegistryV3
```

The exact factory, account-deployer, and registry-deployer runtimes are reconstructed with immutable values and hash-checked by the frontend and backend. A contract that only returns expected getters does not pass provenance verification. Factory `accountVersion` plus the paired registry's immutable `controller` and canonical-stablecoin values establish account provenance.

## Roles

- `OWNER_ROLE`: configure policies, revoke strategies, unpause, and withdraw available owner funds.
- `AGENT_ROLE`: request only direct native ETH or canonical USDG transfers under policy.
- `APPROVER_ROLE`: approve or reject pending high-risk requests; it cannot change policy or withdraw.
- `GUARDIAN_ROLE`: pause and cancel; it cannot unpause or withdraw.
- delayed default admin: transfers role-administration authority after the configured OpenZeppelin delay.

Deployment rejects role collisions and duplicate approvers. Approval thresholds cannot exceed active unique approvers.

## Onchain policy evaluation

Every agent payment must pass all applicable controls at execution time:

1. account active and not paused;
2. supported asset (native ETH or immutable canonical stablecoin);
3. trusted, unexpired merchant with the signed category;
4. enabled merchant/asset pair;
5. merchant automatic-payment flag or human approval path;
6. per-transaction and conservative rolling-24-hour limits;
7. asset daily, weekly, and 30-day limits;
8. category daily, weekly, and 30-day limits;
9. merchant daily amount and transaction-count limits;
10. optional weekday and UTC-minute window;
11. current agent role, request expiry, nonce, strategy revocation/expiry, and active unique approvals.

The frontend policy evaluator is explanatory only. Neither an API response, database row, provider quote, operator, agent, nor signer can override the contracts.

The account exposes its enumerable active-agent set and the paired registry exposes its enumerable current trusted-merchant set. The Command Center reads both directly from verified V3 contracts, so revocation and emergency review do not depend on an offchain index.

## Commerce lifecycle

```text
User intent → provider quote → cart → policy decision → approval (if required)
            → exact payment request → onchain receipt → provider confirmation → reconciliation
```

Each stored artifact has its own ID, expiry, status, and idempotency boundary. `quoted`, `approved`, `payment-pending`, `paid`, and `confirmed` are deliberately different states. Direct and recurring quotes bind the exact user-entered recipient and amount. Provider quotes remain authoritative and cannot be overwritten by the client. The current provider adapters are listed in [`COMMERCE_CAPABILITY_MATRIX.md`](COMMERCE_CAPABILITY_MATRIX.md); a provider search result is never presented as a completed purchase.

## Signed strategies and approvals

The V3 EIP-712 strategy domain is `RuleWallet`, version `3`, current chain, and the personal account. A strategy commits to chain, account, asset, merchant, exact amount, category, commerce-intent hash, owner nonce, expiry, interval, and maximum executions. One owner nonce binds to one digest. Revocation is permanent.

Approvals commit to chain, account, request ID, approver, nonce, and expiry. Signatures are short-lived and single-use. Pending requests revalidate the originating agent role, strategy state, approvals, and every current policy before transfer.

## Autonomous signer

Mainnet automation uses `SecureAgentSigner`; there is no raw mainnet private-key path. The reference AWS KMS adapter allows only chain `4663`, zero-value calls, allowlisted V3 accounts, and the exact `executeSignedStrategy` selector. It returns a public key identity and attestation while the secp256k1 key remains non-exportable.

The application additionally requires an exact V3 factory, canonical USDG metadata, two independent managed RPC hosts, signer-global Redis nonce locking, unresolved-transaction reservation, fee ceilings, authenticated scheduler, and alert delivery. Missing any gate keeps execution disabled.

## Provider boundary

- Duffel: official test-mode flight offers only; no real ticket or payment.
- Ticketmaster: official Discovery API plus provider-hosted checkout link; no autonomous purchase API claim.
- Direct onchain and recurring transfers: supported by V3 when the recipient and every policy are configured.
- Shopify, Stripe Issuing, food ordering, and other rails: adapters remain disabled until real credentials, provider approval, webhooks, settlement, and reconciliation exist.

Provider credentials are server-only. Provider adapters have no owner, approver, guardian, or default-admin role.

## Data and operations

- Upstash Redis stores expiring quotes, carts/orders, approval requests, replay-safe login challenges, strategy records, idempotency claims, locks, pending nonces, distributed API rate-limit counters, and public receipts. Rate limiting uses one atomic increment/expiry script per request; production fails closed when the durable store is unavailable. Private commerce records and owner strategy signatures use separate AES-256-GCM keys and are authenticated against their Redis key or strategy/account/owner identity before storage. Plaintext legacy records fail closed.
- Private order and approval APIs require a short-lived wallet-signed session. Its HttpOnly cookie cannot authorize a transfer; onchain approvals and strategies remain separate exact EIP-712 signatures.
- Outbound alerts use bearer authentication plus a replay-resistant HMAC over the timestamp, unique delivery ID, and raw body. Receivers must enforce the five-minute window and atomically deduplicate delivery IDs.
- Blockscout and onchain events are authoritative for payment state.
- Browser-local names improve usability but do not prove identity.
- The RPC proxy accepts only read/simulation methods.
- Alerts are observational and carry no signing authority.

See [`THREAT_MODEL.md`](THREAT_MODEL.md), [`DEPLOYMENT.md`](DEPLOYMENT.md), and [`MAINNET_CHECKLIST.md`](MAINNET_CHECKLIST.md).
