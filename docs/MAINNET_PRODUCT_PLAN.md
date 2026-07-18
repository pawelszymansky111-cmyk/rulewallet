# Experimental mainnet product plan

## What this branch delivers

- isolated Robinhood Chain mainnet and testnet registries;
- a versioned factory and non-upgradeable personal V2 accounts;
- direct ETH/canonical USDG transfers only;
- mandatory bounded agent limits, trusted recipients, optional approvals, EIP-712 strategies, pause, and owner recovery;
- a mainnet onboarding/monitoring UI with exact simulation previews;
- secure-signer, RPC-failover, durable-lock, confirmation, and incident boundaries;
- tests and documentation suitable for an audit handoff.

## What remains deliberately inactive

- no factory or personal account is deployed by automation;
- no mainnet transaction is broadcast;
- Blockscout verification waits for a real deployment address;
- autonomous mainnet execution remains disabled without an independently configured non-exportable signer;
- the contracts remain experimental and unaudited.

## Activation sequence

1. Freeze and reproduce the release artifact.
2. Complete independent review/audit and resolve findings.
3. Human reviews and signs the exact factory creation transaction with a hardware wallet.
4. Verify factory source/bytecode/constructor on Blockscout.
5. Configure the public factory address and redeploy the frontend.
6. Owner creates a personal account with distinct role holders.
7. Owner separately enables recipients and conservative ETH/USDG policies.
8. Configure KMS/MPC/HSM, RPC failover, monitoring, alerts, and incident contacts.
9. Run a small canary, rehearse pause/recovery, and only then consider autonomy.

New actions or assets require a new version. V2 will not gain arbitrary calls, routers, approvals, bridges, swaps, or tokenized-stock trading.
