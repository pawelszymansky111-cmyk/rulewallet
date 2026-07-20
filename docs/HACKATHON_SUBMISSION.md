# RuleWallet V3 — hackathon submission

## Submission title

**RuleWallet: the spending command center for AI agents**

## One line

RuleWallet lets users create policy-controlled wallets where agents can pay trusted merchants under hard amount, category, time, expiry, and approval rules—without receiving the owner key.

## Problem

An agent that can book travel, order food, pay a subscription, or settle an invoice needs payment authority. A normal wallet key grants authority over everything, while prompt instructions are not a financial security boundary.

## Solution

RuleWallet V3 deploys a personal non-upgradeable account plus an immutable policy registry. A separate agent may request only direct ETH or canonical USDG transfers. The registry rechecks merchant, asset, category, per-transaction, rolling, daily, weekly, monthly, count, expiry, and UTC schedule rules during every execution. Higher-risk actions require independent approvers; guardian pause and owner recovery are separate.

## Working product

- External wallet or passkey/email embedded wallet onboarding.
- Multiple embedded addresses and multiple named policy accounts.
- Simple and Pro interfaces with identical capability.
- Exact simulated wallet transactions for account and policy setup.
- Trusted providers, automatic-payment opt-in, budgets, schedules, approvals, pause, and revoke.
- EIP-712 scheduled strategies with intent/category binding and replay protection.
- Durable quote/cart/order/approval/receipt lifecycle.
- Official Duffel test flight offers and Ticketmaster event discovery when credentials are configured.
- Public receipts and separate technical console.
- V3 mainnet path with exact factory/helper provenance and non-exportable-signer gates.
- Solidity unit/fuzz/invariant/malicious-token/fork coverage plus application, provider, signer, link, and build tests.

## Why it is different

1. **The contract, not the model, decides.** A compromised frontend or backend cannot authorize a policy violation.
2. **Commerce intent is signed.** Chain, account, asset, merchant, amount, category, intent, nonce, expiry, interval, and count are bound together.
3. **Automatic does not mean unlimited.** Confirmation-free merchants still obey every budget and time rule.
4. **Provider honesty is part of the product.** Discovery, payment, and confirmation are separate states; disabled integrations say so.
5. **Failure is demonstrable.** Wrong merchant/category/time, excessive amount, expired/revoked strategy, removed agent, or pause state fails closed.

## Architecture

```text
Passkey / owner wallet
        │ deploy + configure
        ▼
Personal V3 account ───── paired policy registry
        ▲                           ▲
        │ exact agent request       │ merchant/category/time/budget checks
        │                           │
Commerce intent → quote → cart → approval → payment → receipt → confirmation
```

## Two-minute demo

Open `/command`, create/unlock a wallet, deploy a named testnet account, show one policy simulation, request a Duffel test offer, create a guarded order, approve/reject it, then show one public receipt and one deliberately blocked payment. Full script: [`COMMAND_CENTER_DEMO.md`](COMMAND_CENTER_DEMO.md).

## Links

- Product: https://rulewallet.vercel.app/command
- Mainnet control surface: https://rulewallet.vercel.app/mainnet
- Approval inbox: https://rulewallet.vercel.app/approvals
- Receipts: https://rulewallet.vercel.app/activity
- Source: https://github.com/pawelszymansky111-cmyk/rulewallet

## Honest limits

Testnet assets have no value. Mainnet requires a separately wallet-signed V3 deployment and verified production signer/infrastructure. Duffel is test-mode only; Ticketmaster checkout stays provider-hosted; other purchase adapters are disabled until complete. RuleWallet is experimental, not independently audited, and not affiliated with Robinhood or named providers. There is no token or sale.

## Roadmap

1. Deploy/verify V3 testnet and run public failure challenges.
2. Complete one production commerce provider end to end, including refunds and webhooks.
3. External contract review and restrictive mainnet canary.
4. Portable passkey/session-key standards and team policy templates.
