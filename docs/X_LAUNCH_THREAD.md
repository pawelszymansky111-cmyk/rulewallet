# RuleWallet X launch copy

## Bio

The spending command center for AI agents. Passkey wallets, merchant budgets, approvals, scheduled payments, and public receipts on Robinhood Chain. Open source.

## Launch post

AI agents should be able to pay—not own your wallet.

RuleWallet is a spending command center with passkey wallets, trusted merchants, category/time budgets, real-time approvals, scheduled USDG/ETH payments, pause/revoke, and public receipts.

Try the testnet Command Center: https://rulewallet.vercel.app/command

## Thread

### 1 / 8

Introducing RuleWallet V3: tell an AI agent what to buy while the account—not the model—enforces what it may spend. 🟢

Create a wallet, add rules, approve exceptions, and inspect every result.

https://rulewallet.vercel.app/command

### 2 / 8

The problem: agents need useful payment authority, but a private key is unlimited authority.

RuleWallet replaces “here is my wallet” with “this merchant, this asset, this category, this amount, during this time window, until this expiry.”

### 3 / 8

V3 policy accounts enforce:

• transaction + rolling 24h limits
• daily / weekly / monthly budgets
• merchant + category caps
• payment-count + UTC schedules
• human approval thresholds
• pause, revoke, expiry, and replay protection

### 4 / 8

Users can connect an existing wallet or create a passkey-backed embedded wallet. Multiple named accounts separate travel, shopping, subscriptions, payroll, or teams.

Simple and Pro modes expose the same controls in different language.

### 5 / 8

The commerce lifecycle is explicit:

intent → quote → cart → policy → approval → payment → provider confirmation → receipt

A search result is never presented as a completed purchase.

### 6 / 8

Today’s provider boundary is honest:

✓ direct trusted-recipient ETH/USDG rails
✓ Duffel official test flight offers
✓ Ticketmaster discovery + hosted checkout
◌ Shopify/card/food purchasing stays disabled until production integrations exist

### 7 / 8

Mainnet automation uses an external non-exportable signer and fails closed unless factory bytecode, USDG, dual RPC, durable nonce locks, scheduler, fee ceilings, monitoring, signer identity, and every onchain rule pass.

No arbitrary calls. No unlimited approvals.

### 8 / 8

RuleWallet is open source, experimental, and not independently audited or affiliated with Robinhood or the named providers. Testnet assets have no value. No token or sale.

Code: https://github.com/pawelszymansky111-cmyk/rulewallet
Demo: https://rulewallet.vercel.app/command

## Posting checklist

- Verify the production build, `/api/health`, provider status, and mainnet gates.
- Record with valueless testnet assets and no personal wallet balances visible.
- Show one blocked request and one public receipt.
- Do not imply a sandbox quote is a purchase or claim external audit/affiliation.
