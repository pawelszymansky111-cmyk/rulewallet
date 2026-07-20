# Account and recovery guide

RuleWallet V3 separates four operational roles. Use different devices or recovery methods for meaningful balances.

## Roles

- **Owner:** deploys the account, configures policy, authorizes strategies, unpauses, and withdraws.
- **Guardian:** can immediately pause but cannot withdraw or unpause.
- **Agent:** can request only exact ETH/USDG payments that pass every onchain rule.
- **Approver:** can approve or reject a pending request, but cannot override a hard policy failure.

The Command Center shows every active agent address and lets the owner revoke one or all in one wallet-signed transaction.

## Before funding

1. Confirm the selected chain and exact V3 factory/account provenance.
2. For an embedded wallet, finish the provider-isolated recovery flow and verify **Export securely** before funding. RuleWallet cannot read either secret.
3. Put the guardian on a separate device.
4. Verify the approver and agent are different from owner and guardian.
5. Configure conservative policies and expiries.
6. Deposit only a small canary amount.
7. Test an allowed payment, a blocked payment, pause, agent revocation, and owner withdrawal.

## Suspected agent compromise

1. Press **Emergency pause** from the owner or guardian wallet.
2. From the owner wallet, load the account and press **Revoke all agents**.
3. Revoke affected EIP-712 strategy digests.
4. Review public receipts, pending requests, Redis audit records, signer identity, and alerts.
5. Rotate signer credentials and create a new agent address before unpausing.

Queued requests from a revoked agent cannot execute, even if they were previously approved. Revoked or expired strategies are revalidated during approved execution.

## Lost owner access

The V3 beta does not invent a backend recovery bypass. The guardian can stop activity but cannot take ownership or withdraw. Recovery depends on the connected wallet or embedded-wallet provider's documented recovery. Do not fund an account until that recovery path has been tested.

While the current owner is still available, the Command Center can transfer control with four separately simulated wallet signatures:

1. grant `OWNER_ROLE` to the recovered replacement address;
2. schedule the delayed default-admin transfer;
3. after the onchain two-day delay, connect the replacement and accept default-admin control;
4. verify recovery and withdrawals, then revoke the former `OWNER_ROLE`.

The UI cannot skip the delay or sign any step. Do not revoke the former owner until the replacement is both default admin and owner.

## Lost guardian, agent, or approver

- Revoke the old operational role from the owner wallet.
- Grant a distinct replacement address.
- Keep the approval threshold at or below the number of active unique approvers.
- Re-authorize strategies for a replacement agent when necessary.

## Commerce-session compromise

Rotate `COMMERCE_SESSION_SECRET` to invalidate every private order/approval browser session, then inspect access logs and active approvals. Session cookies expire after 30 minutes and cannot authorize a transfer; separately revoke any suspicious EIP-712 approval, strategy, or agent role onchain.

Do not rotate `COMMERCE_DATA_ENCRYPTION_KEY` in place. First pause order creation, export encrypted records inside the trusted runtime, decrypt and re-encrypt each record under the replacement key while preserving its Redis-key associated data, verify counts and schemas, then atomically promote the new key. If migration evidence is incomplete, leave commerce disabled; never fall back to plaintext.

Never send a seed phrase or private key to RuleWallet, support, an agent, or a deployment environment.
