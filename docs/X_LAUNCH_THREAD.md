# RuleWallet X launch copy

## Profile

**Display name:** RuleWallet

**Bio:** Give agents a budget. Keep the keys. Programmable spending controls and public receipts for autonomous onchain agents. Live on testnet. Open source.

**Website:** https://rulewallet.vercel.app/demo

**Banner:** `public/social/rulewallet-x-banner.png`

## Single launch post

AI agents need permission to act—not unlimited access to a wallet.

RuleWallet gives agents trusted recipients, hard spending limits, human approvals, emergency controls, and public receipts.

The autonomous testnet beta is live. Try it in two minutes, no funds required:
https://rulewallet.vercel.app/demo

## Eight-post launch thread

### 1 / Launch

We built RuleWallet: programmable spending controls for autonomous onchain agents.

Give agents a budget. Keep the keys. 🟢

Live testnet demo: https://rulewallet.vercel.app/demo

Attach `public/social/rulewallet-x-banner.png`.

### 2 / The problem

An agent should not need your full wallet key to make one recurring payment.

A compromised model, backend, or agent signer should be limited to one narrow permission—not everything the wallet owns.

### 3 / The control layer

RuleWallet enforces:

• trusted recipients
• per-transfer limits
• rolling 24h limits
• human approval thresholds
• expiry, nonce, pause, and revoke

The contract decides. The interface explains.

### 4 / What works today

This is a working Robinhood Chain testnet beta:

✓ deployed policy account
✓ dedicated AGENT_ROLE signer
✓ daily/weekly schedules
✓ wallet-signed admin actions
✓ live metrics
✓ explorer-backed receipts

https://rulewallet.vercel.app/activity

### 5 / Product experience

Simple and Pro modes expose the same controls in different language.

Start with a payroll, subscription, contractor, or agent-allowance template. Add a named recipient. Set limits. Schedule a tiny testnet transfer. Watch every result.

### 6 / Safety model

The agent cannot edit policy, trust a recipient, approve its own request, unpause the account, or withdraw owner funds.

Every scheduled execution re-checks current onchain state and simulates the exact call before signing.

### 7 / Honest boundary

RuleWallet is experimental and not independently audited or affiliated with Robinhood.

Mainnet autonomy remains off until the factory, non-exportable signer, dual RPC, durable scheduler, fee ceilings, and monitoring gates all verify.

No token. No sale.

### 8 / Call to builders

Try the two-minute demo and tell us two things:

1. the narrowest payment permission your agent needs
2. the failure RuleWallet must stop

Code: https://github.com/pawelszymansky111-cmyk/rulewallet
Demo: https://rulewallet.vercel.app/demo

## Posting checklist

- Confirm the production deployment and `/api/public/metrics` are healthy.
- Record in a clean browser profile without personal tabs or wallet balances.
- Say “testnet” in the first post and demo video.
- Do not claim an audit, Robinhood affiliation, token, airdrop, or mainnet readiness.
- Reply to the thread with one short demo clip and one explorer-backed receipt.
