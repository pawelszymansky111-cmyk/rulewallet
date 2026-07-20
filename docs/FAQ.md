# RuleWallet FAQ

## What is RuleWallet?

RuleWallet is a policy account and operator interface for giving autonomous onchain agents narrow payment authority. Owners configure recipients, limits, approval thresholds, schedules, and emergency controls.

## Is the demo free?

Yes. The public walkthrough is read-only. Wallet actions use Robinhood Chain testnet ETH, which has no monetary value.

## Does RuleWallet receive my seed phrase or private key?

No. Owner, guardian, and approver actions stay inside the user’s wallet. Never enter a seed phrase or private key into RuleWallet, Vercel, GitHub, a support message, or an environment file.

## What can the autonomous agent do?

The testnet agent can request only direct transfers to already-enabled recipients and only within the current per-transfer, rolling 24-hour, approval, balance, role, nonce, expiry, and pause rules.

## Can an approval override a hard rule?

No. Human approval can authorize an otherwise valid higher-value request. It cannot override an untrusted recipient, disabled asset, exceeded hard limit, expired request, revoked role, or paused account.

## What payment templates are included?

The console can prefill payroll, service subscription, contractor payment, and agent allowance schedules. Templates are convenience defaults; they never grant permission or bypass onchain rules.

## How do alerts work?

Execution records are stored first. RuleWallet can then send a typed event through an authenticated HTTPS webhook for confirmed execution, approval required, failure, or unusual spending stopped by policy. The adapter can route events to email, Telegram, Slack, or an incident system.

## Is mainnet ready?

The mainnet implementation is experimental and fail-closed. Autonomous execution remains disabled until the pinned factory, canonical USDG, non-exportable signer identity, durable storage and scheduler, dual RPC, fee ceilings, and authenticated monitoring all verify.

## Is RuleWallet audited or affiliated with Robinhood?

No. The repository includes an internal security review, but not an independent audit. RuleWallet is not affiliated with Robinhood Markets or Robinhood Chain.

## Is there a RuleWallet token?

No. There is no token, sale, airdrop, or investment product.

## Where can I verify activity?

Open https://rulewallet.vercel.app/activity and follow any confirmed testnet transaction hash to the explorer.
