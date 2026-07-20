# Two-minute Command Center demo

## Preparation

- Configure the V3 testnet factory and six-decimal test token.
- Configure Privy or use a browser wallet.
- Use only valueless Robinhood Chain testnet assets.
- Optionally configure a Duffel test token and Ticketmaster API key.

## 0:00–0:25 — Create wallets

Open `/command`. Show Simple/Pro mode: capabilities are identical; only language changes. Unlock a passkey wallet or connect MetaMask. Create extra embedded addresses for a low-value guardian/approver demo, or paste independent addresses.

Say: “RuleWallet never asks for a seed phrase. Users can bring a wallet or create one.”

## 0:25–0:50 — Create a protected account

Name the account “Travel”. Enter separate guardian, agent, and approver addresses. Preview deployment. Point to chain, factory, zero value, predicted account, and exact calldata. Sign with the owner wallet.

Say: “The account is non-upgradeable, discoverable through the pinned factory, and owns a separate policy registry.”

## 0:50–1:20 — Add rules

In Spending rules, choose tUSDG, Travel category, a merchant, per-transaction/24-hour/daily/weekly/monthly limits, approval threshold, expiry, and UTC schedule. Keep automatic payments off first. Prepare one action, show simulation/calldata, then sign. Repeat the remaining steps or use preconfigured demo state.

Say: “A human approval can allow a request only after every hard rule passes.”

## 1:20–1:45 — Ask the agent

Choose Duffel, enter WAW → LHR, a future date, and request an option. If credentials are configured, show official Duffel test inventory; otherwise show the explicitly labelled deterministic demo. Create the cart and show `allowed`, `approval-required`, or `blocked`.

Switch to Ticketmaster and show the official hosted checkout link. Explain that discovery is not a purchase confirmation.

## 1:45–2:00 — Control and evidence

Open `/approvals`, approve or reject the expiring request, then open `/activity`. Show pause, strategy revocation, explorer receipt, and the separate `/app` technical console.

Close with: “Tell RuleWallet what to buy. The agent can act only inside the policy you signed.”

## Failure demo

Change one of: amount above per-transaction limit, wrong merchant category, expired merchant, disallowed weekday, revoked strategy, revoked agent, or paused account. The onchain simulation must fail and no signature/submission should occur.
