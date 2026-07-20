# RuleWallet pitch

## 30 seconds

AI agents need permission to pay, but they should not own your wallet. RuleWallet is a spending command center where users create passkey or external-wallet accounts and set trusted merchants, transaction and period budgets, categories, time windows, approvals, pause, and revoke. A separate agent can act automatically only inside those onchain rules, and every result has a receipt. Tell the agent what to buy; keep the keys and the limits.

## 90 seconds

Booking a flight, paying a subscription, or settling an invoice makes an AI agent useful. Giving that agent a normal private key makes one mistake catastrophic. Prompt rules cannot fix that.

RuleWallet V3 creates a personal, non-upgradeable account and a paired policy registry on Robinhood Chain. The owner can connect MetaMask or create a passkey-backed wallet. The agent gets a separate role that can request only ETH or canonical USDG payments.

Every request is rechecked onchain against the exact merchant, asset, category, amount, rolling 24-hour spend, daily/weekly/monthly budgets, merchant count, expiry, and UTC schedule. A merchant may be approved for confirmation-free payments, but never outside those limits. High-risk actions go to an independent approval inbox. A guardian can pause immediately, and the owner can revoke the agent or strategy.

The product models the whole commerce lifecycle: intent, provider quote, cart, policy decision, approval, payment receipt, provider confirmation, and reconciliation. Duffel test inventory and Ticketmaster discovery show real provider data without pretending a search is a completed purchase.

Mainnet automation has no raw-key path. It requires a non-exportable signer plus verified factory bytecode, dual RPC agreement, durable nonce locks, fee ceilings, scheduler, monitoring, and the current onchain policy. Missing one gate blocks execution.

RuleWallet gives agents enough authority to be useful—without giving them the whole wallet.

## Closing line

**Tell the agent what to buy. Keep the keys and the limits.**
