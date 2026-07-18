# Architecture

## Release boundary

RuleWallet is an unaudited Robinhood Chain testnet production candidate. The web application can connect a user wallet, simulate a contract call, submit an explicitly approved testnet transaction, and track its receipt. Financial rules are enforced by a non-upgradeable policy account, not by the browser or API.

Mainnet chain ID `4663` is documentation-only. The application config contains only Robinhood Chain testnet chain ID `46630`, and `ENABLE_MAINNET` accepts only `false`.

## Components

```text
Browser wallet
     │ explicit connect / switch / sign
     ▼
Next.js control surface ─────► /api/rpc read-only proxy
     │                              │
     │ exact simulation             └──► managed testnet RPC
     ▼
RuleWalletPolicyAccount
     ├── hard policy fails ─────────────► revert with typed error
     ├── below approval threshold ──────► execute + receipt event
     └── above approval threshold ──────► pending request
                                              │
                          independent approver wallets
                                              │
                                              ▼
                                     threshold execution
```

### Web application

- Next.js App Router with React Server Components by default.
- Wagmi and Viem for EIP-1193 wallet connections and typed EVM calls.
- Injected wallets always available; WalletConnect appears when its public project ID is configured.
- A server-side RPC proxy keeps managed provider credentials out of browser bundles.
- The proxy allows read/simulation methods only and rejects transaction broadcasts.
- Wallets broadcast signed transactions directly; the server never receives a private key.

### Policy account

`RuleWalletPolicyAccount` uses OpenZeppelin Contracts `5.6.1`:

- `AccessControlDefaultAdminRules` for a single delayed, two-step default admin;
- `Pausable` for guardian-triggered emergency stops;
- `ReentrancyGuard` around every execution and recovery path;
- `SafeERC20` for direct token transfers.

Roles:

| Role | Authority |
| --- | --- |
| Default admin | Configure policies, roles, allowlists, unpause, and recover funds while paused |
| Guardian | Pause and cancel pending requests |
| Agent | Propose or execute only policy-compliant actions |
| Approver | Record one approval per high-value request |

The admin should be transferred to a verified multisig before meaningful testnet value is used. The contract is not upgradeable; changes require a new deployment and explicit migration.

## Scheduled agent boundary

The scheduled agent uses a distinct testnet EOA whose private key exists only in the production server environment. The EOA receives only `AGENT_ROLE`. Vercel Cron invokes an authenticated route daily; Upstash Redis stores signed strategies, one-time admin nonces, execution locks, and public receipts.

Every automated execution re-reads contract state and simulates the exact call. The runner fails closed when the policy is paused/inactive, the role is missing, the target or asset is disallowed, the limit or approval threshold would be crossed, the balance is insufficient, or the nonce has changed. Revoking `AGENT_ROLE` or pausing the contract immediately removes execution authority independently of the web database.

### Supported actions

1. Native ETH call to an explicitly allowed target.
2. Direct ERC-20 transfer for an explicitly allowed token and recipient.

Every asset has independent native-unit limits: maximum per transaction, bounded rolling 24-hour spend, and approval threshold. Rolling spend retains the current hour plus the previous 24 one-hour buckets. This bounded, conservative window never drops spend before it is 24 hours old, though it can continue counting it for up to one extra hour.

Arbitrary DEX calls are intentionally unsupported. A caller-supplied `amount` or `slippageBps` cannot prove what generic calldata will move. A production swap feature needs a router-specific adapter that decodes inputs, validates token flow and `minAmountOut`, and is independently audited.

## Trust boundaries

- Agent output, calldata, token contracts, targets, RPC responses, and browser state are untrusted.
- Frontend `allowed`, `review`, and `blocked` labels do not grant authority.
- A target allowlist reduces scope but does not make the target safe.
- A malicious or compromised admin can reconfigure rules; production administration must be multisig-controlled and monitored.
- Approver wallets can be phished. Each wallet must inspect chain, contract, function, arguments, value, nonce, and expiry.
- The server RPC proxy is availability infrastructure, not an authorization component.
- The public fallback RPC is rate-limited and is unsuitable for a real production launch.

## Persistence and receipts

Onchain events are the authoritative audit record. The current release does not operate a centralized receipt database. The browser displays transaction hashes and explorer links; indexers may later build read models from `RequestCreated`, `RequestApproved`, `RequestCancelled`, and `RequestExecuted`.

## Safe decision

The architecture brief preferred Safe if Safe contracts were officially deployed and supported on Robinhood Chain. No authoritative Safe deployment evidence for chain IDs `4663` or `46630` was found during implementation. RuleWallet therefore uses the specified fallback and does not hard-code guessed Safe addresses.

## Remaining production work

See [`THREAT_MODEL.md`](THREAT_MODEL.md), [`AUDIT_PREP.md`](AUDIT_PREP.md), and [`MAINNET_CHECKLIST.md`](MAINNET_CHECKLIST.md). Mainnet activation is blocked until every mandatory gate is independently verified.
