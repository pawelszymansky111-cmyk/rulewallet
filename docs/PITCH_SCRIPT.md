# RuleWallet pitch script

## 30-second version

AI agents need wallets to act, but a normal wallet key gives them unlimited authority. RuleWallet replaces that risk with a policy account on Robinhood Chain testnet. The owner defines trusted recipients, per-transaction and rolling limits, approval thresholds, and emergency controls. A separate agent signer can act only inside those rules, every call is simulated first, and every result has a public receipt. Agents act; rules hold.

## 90-second version

An autonomous agent that can pay, trade, or rebalance is useful—but a normal wallet key gives it authority over everything. Prompt instructions do not fix that security problem.

RuleWallet is an onchain policy account for AI agents. The owner keeps the admin wallet, while a separate agent key receives only a narrow role. The contract enforces trusted targets, per-transaction caps, rolling 24-hour limits, human approval thresholds, nonces, expiry, pause, and revoke.

This is a working Robinhood Chain testnet product. A scheduled strategy is stored in Redis. Before execution, the runner re-reads the contract, verifies the agent role and policy, checks the balance and nonce, then simulates the exact call. Only then does the scoped agent sign. Confirmed and blocked attempts appear as public receipts with explorer evidence.

The key idea is that the frontend and AI are not the source of authority—the contract is. If the model, backend, or agent key is compromised, the hard policy still applies.

For this MVP, mainnet and real funds are deliberately disabled. The contracts are unaudited, and generic DeFi routers require dedicated selector-limited adapters. The next step is audited integrations and multisig production administration.

RuleWallet gives agents enough authority to be useful, without giving them the whole wallet.

## Closing line

**Give agents authority, not your wallet.**
