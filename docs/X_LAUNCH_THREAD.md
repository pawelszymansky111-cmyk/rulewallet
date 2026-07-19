# X launch thread

1/ We built RuleWallet: a policy wallet for autonomous agents on Robinhood Chain testnet. Give agents bounded authority—not your wallet. 🟢

2/ The beta supports trusted recipients, per-transfer + rolling limits, scheduled transfers, human approvals, emergency pause, owner withdrawal, and public onchain receipts.

3/ Simple and Pro modes expose the same controls in different language. The guided demo takes two minutes, and testnet ETH has no value.

4/ Security-beta work fixed canonical USDG to 6 decimals, revalidates queued authorization at execution, enforces separate roles, and pins factory runtime provenance.

5/ Mainnet is experimental and unaudited. Autonomous execution fails closed unless every production gate and a verified non-exportable signer identity pass; there are no swaps, bridges, arbitrary calls, unlimited approvals, or raw mainnet private keys.

6/ The review is internal—not an external audit. Try the testnet demo, inspect the code and receipts, and tell us what policy an onchain agent needs next: https://rulewallet.vercel.app/demo

Post each numbered section as one X post. Attach `public/social/rulewallet-testnet-launch.png` to post 1 and a short `/demo` recording to post 4.

## 1 / Launch

AI agents need authority to act. They should not inherit your whole wallet.

RuleWallet is now live on Robinhood Chain testnet: a policy account that gives an autonomous agent narrow, enforceable permissions.

Demo: https://rulewallet.vercel.app/demo

## 2 / The problem

A leaked agent key should not mean unlimited spending.

RuleWallet puts deterministic rules between agent intent and execution: target allowlists, per-transaction caps, rolling 24h limits, approval thresholds, nonces, expiry, pause, and revoke.

## 3 / Working proof

This is a working testnet system, not a landing-page mockup.

✓ deployed policy contract
✓ dedicated `AGENT_ROLE` signer
✓ scheduled daily strategy
✓ live onchain metrics
✓ confirmed autonomous receipt

Activity: https://rulewallet.vercel.app/activity

## 4 / Try it

The guided demo takes two minutes and needs no wallet or funds.

1. inspect live policy state
2. verify the autonomous tx
3. break a rule, then inspect pause and revoke

https://rulewallet.vercel.app/demo

## 5 / Security model

The agent cannot edit policies, allowlist a target, approve a request, unpause the contract, or cross the configured human-approval boundary.

Every scheduled execution re-checks contract state and simulates the exact call before signing.

## 6 / Honest boundary

RuleWallet is unaudited testnet software.

Mainnet: disabled.
Real funds: disabled.
Token or sale: none.
Robinhood affiliation: none.

The limits are documented because security products should say what they do not solve.

## 7 / Open source

The contract, web app, scheduler, tests, threat model, and incident runbook are open source.

We want hard failure cases from agent builders, wallet engineers, and security researchers—not generic launch feedback.

https://github.com/pawelszymansky111-cmyk/rulewallet

## 8 / Call to builders

If your agent needs to pay, trade, rebalance, or subscribe without holding unlimited wallet authority, tell us the narrowest policy it would need.

Try the demo, inspect the receipt, and open an issue with one scenario RuleWallet must block.

## Optional hackathon post

RuleWallet is packaged as a complete hackathon submission: problem, architecture, innovation, working proof, two-minute judge flow, roadmap, source, and honest safety boundaries.

https://rulewallet.vercel.app/hackathon
