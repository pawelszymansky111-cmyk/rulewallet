# Public testnet demo

## Two-minute security-beta demo

1. **0:00–0:20 — Problem:** open `/demo`; explain that agents should receive rules, not an unrestricted wallet key.
2. **0:20–0:45 — Onboarding:** open `/start`; show wallet/network setup and the valueless-testnet warning.
3. **0:45–1:20 — Control:** open `/app/agent`; show a trusted recipient, mandatory per-transfer/24-hour limits, an approval threshold, and scheduled testnet transfer.
4. **1:20–1:40 — Proof:** run the testnet strategy and open its public Blockscout-backed receipt in `/activity`.
5. **1:40–2:00 — Safety:** show pause/withdrawal, then `/mainnet`; point out the pinned-factory check, 6-decimal USDG status, visible production gates, and fail-closed autonomy.

Use only faucet assets in the live demo. Testnet ETH has no monetary value.

The shortest credible RuleWallet demo is read-only, takes two minutes, and never requires real funds.

## Links

- Guided demo: https://rulewallet.vercel.app/demo
- Public activity: https://rulewallet.vercel.app/activity
- Live metrics JSON: https://rulewallet.vercel.app/api/public/metrics
- Operator console: https://rulewallet.vercel.app/app/agent
- Simulator: https://rulewallet.vercel.app/playground
- Source: https://github.com/pawelszymansky111-cmyk/rulewallet
- Contract: `0xddfeae34fa9cdd665bd833ecd5c8c06a4279bd25`
- Dedicated agent: `0xE0557B42F1EF6F97f209ef5D6Ba017CE054B6eaf`
- Network: Robinhood Chain Testnet (`46630`)

## Two-minute walkthrough

1. **0:00–0:30:** open `/demo` and verify the testnet policy is active, the agent role is granted, and testnet ETH is valueless.
2. **0:30–1:05:** continue to the latest receipt and compare its transaction hash and block number with the testnet explorer.
3. **1:05–2:00:** open `/playground`, cross the approval threshold or select an unknown target, then show the pause and revoke controls in `/app/agent`.

## What is real

- The policy account is deployed on Robinhood Chain testnet.
- A dedicated server signer holds only `AGENT_ROLE`.
- The daily strategy and execution records are stored in Redis.
- The protected scheduler can execute only transfers that pass the current onchain rules.
- Confirmed receipts link to real testnet transactions.

## What is deliberately disabled

- Mainnet configuration and real funds.
- Arbitrary swaps and generic calldata execution.
- Agent policy edits, allowlisting, approvals, administration, and unpause authority.
- Any token, sale, airdrop, investment product, audit claim, or Robinhood affiliation.

## Recording checklist

- Record at 1080p with the browser zoom at 100%.
- Hide bookmarks, personal notifications, wallet balances, email, and unrelated tabs.
- Do not show seed phrases, private keys, environment variables, or Vercel secrets.
- Begin on `/demo`, end on the explorer-backed receipt, and keep the judge walkthrough under two minutes.
