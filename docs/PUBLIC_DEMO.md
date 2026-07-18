# Public testnet demo

The shortest credible RuleWallet demo is read-only, takes about four minutes, and never requires real funds.

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

## Four-minute walkthrough

1. Open `/demo` and verify the policy is active, the agent role is granted, and mainnet is disabled.
2. Continue to the latest receipt. Compare its transaction hash and block number with the testnet explorer.
3. Open `/playground`: allow the 45 USDC fixture, cross the human approval threshold, then select an unknown target and confirm it fails closed.
4. Open `/app/agent` to inspect the live scheduled strategy, dedicated signer balance, pause controls, and public receipt feed. Browsing is public; admin mutations require the actual admin wallet.

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
- Begin on `/demo`, end on the explorer-backed receipt, and keep the recording under 45 seconds.
