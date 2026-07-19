# Architecture

## Security-beta boundary

The public product includes the Robinhood Chain testnet beta and an experimental, production-gated mainnet path. Canonical USDG uses 6 base-unit decimals. A mainnet account is trusted only when the configured factory's complete immutable-linked runtime hash matches the pinned `2.1.0-security-beta` hash and that exact factory records the account version. Autonomous execution is supported in code but remains off unless every live gate passes.

## Release boundary

RuleWallet now has two isolated environments:

| Environment | Chain ID | Contract path | Funds |
| --- | ---: | --- | --- |
| Robinhood Chain testnet | `46630` | Existing `RuleWalletPolicyAccount` V1 and scheduled demo agent | Valueless test ETH only |
| Robinhood Chain mainnet | `4663` | Experimental factory-deployed `RuleWalletPolicyAccountV2` | Real assets; unaudited and high risk |

V1 is preserved for the public testnet demo. V2 is non-upgradeable and has a narrower transfer-only surface. Factory and account deployment require explicit connected-wallet signatures; no release script broadcasts them. No backend or administrator can override V2 policy checks.

## Mainnet flow

```text
Owner wallet ── simulate exact transaction ── review chain/to/value/calldata/result
     │                                      │
     └──────────────── wallet signature ◄───┘
                         │
                         ▼
               Versioned V2 factory
                         │ CREATE2
                         ▼
             Personal non-upgradeable account
              ├─ OWNER: policy + withdrawal
              ├─ AGENT: bounded direct transfer only
              ├─ APPROVER: high-value approval only
              └─ GUARDIAN: emergency pause only
                         │
         ┌───────────────┴────────────────┐
         ▼                                ▼
 direct native ETH                 canonical USDG
 trusted recipient                 trusted recipient
 asset limits                      asset limits
```

The browser broadcasts owner, approver, and guardian transactions through the connected wallet. The read-only RPC proxy rejects transaction-broadcast methods. The contract—not the UI, API, scheduler, signer provider, or database—is the authorization boundary.

## V2 contract boundary

`RuleWalletPolicyAccountV2` uses OpenZeppelin `AccessControlDefaultAdminRules`, `EIP712`, `Pausable`, `ReentrancyGuard`, and `SafeERC20`.

It supports only:

1. direct native ETH transfers;
2. direct transfers of the immutable canonical Robinhood Chain USDG address;
3. trusted-recipient enable/revoke;
4. mandatory positive per-transaction and rolling 24-hour limits for each enabled agent asset;
5. optional human-approval thresholds;
6. EIP-712 recurring strategy authorizations;
7. owner withdrawals, guardian pause, and owner unpause.

It has no arbitrary calls, generic ERC-20 path, token approvals, DEX router, bridge, swap, delegatecall, or upgrade hook. Agent policy changes and owner withdrawals are separate wallet-signed transactions. Owner withdrawals are intentionally outside agent spending limits and may withdraw any available balance.

### Signed strategies

An EIP-712 strategy commits to:

- chain ID and policy-account address;
- asset, recipient, and exact amount;
- owner nonce and expiry;
- minimum execution interval and maximum execution count.

The EIP-712 domain also binds the signature to `RuleWallet`, version `2`, the current chain, and the verifying account. A nonce binds to one digest on first execution. The account rejects nonce conflicts, expiry, early recurrence, exhaustion, revoked strategies, invalid owners, untrusted recipients, unsupported assets, paused/inactive policies, and either limit being exceeded.

### Rolling accounting

V1 and V2 retain the current hour plus the previous 24 hourly buckets. This deliberately over-counts near an hour boundary for at most one hour, but never forgets spend before a complete 24 hours. Pending requests are revalidated before execution.

## Signer and scheduler boundary

Testnet retains its dedicated, server-only demo EOA for backwards compatibility. `AGENT_PRIVATE_KEY` is explicitly testnet-only.

Mainnet uses the `SecureAgentSigner` interface. Its adapter boundary submits an exact transaction intent to a separately operated KMS/MPC/HSM service and accepts no raw private key. The included AWS service uses a non-exportable KMS secp256k1 key and DynamoDB idempotency. Execution fails closed unless all of these are true:

- the release supports autonomy and both `ENABLE_MAINNET=true` and `ENABLE_MAINNET_AUTONOMY=true`;
- `MAINNET_SIGNER_MODE=external-kms`;
- the remote public signer address, key ID, public-key attestation, non-exportability flag, chain, zero-value policy, and allowed selector are verified;
- signer endpoint is HTTPS, matches the exact allowed hostname, and has a runtime credential;
- two independent managed HTTPS RPC hosts agree and strict gas/fee ceilings pass;
- durable Redis storage, authenticated Cron, and HTTPS alert delivery are configured;
- the agent has `AGENT_ROLE` on the selected account;
- the exact call simulates successfully under current onchain policy.

Durable Redis locks use unique ownership tokens and compare-before-delete release. A signer-global lock serializes nonce allocation across strategies, and a submitted nonce remains durably reserved across timeout until exact calldata, signer, recipient, value, and nonce are reconciled. Pending, replaced, timed-out, reverted, and late-confirmed states are recorded. Confirmation tracking and public receipts use Blockscout transaction hashes.

## RPC and data

- Browser reads go through `/api/rpc?chainId=4663|46630`.
- Only an allowlist of read/simulation JSON-RPC methods is accepted.
- Mainnet and testnet have separate primary, failover, and public fallback configuration.
- The official public RPC is last because Robinhood documents it as rate-limited and unsuitable for production use.
- Local address-book labels remain browser-local and are not proof of identity.
- Onchain events and Blockscout receipts are authoritative; offchain records are a read model only.

## Deployment boundary

The factory pins chain ID and canonical USDG in immutable state. Personal accounts are deployed with CREATE2 from owner-specific salts, recorded by owner and version hash, and are not proxies. A new version requires a new factory/account deployment and an explicit owner migration.

See [`THREAT_MODEL.md`](THREAT_MODEL.md), [`DEPLOYMENT.md`](DEPLOYMENT.md), and [`MAINNET_CHECKLIST.md`](MAINNET_CHECKLIST.md).
