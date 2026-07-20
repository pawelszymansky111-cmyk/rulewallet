# Incident response runbook

## Security-beta containment

Mainnet autonomy is supported but defaults off and requires every runtime gate. If it becomes enabled unexpectedly, treat that as a critical release-integrity incident: set `ENABLE_MAINNET_AUTONOMY=false`, disable the Cron route, revoke signer access, preserve logs, compare the deployed commit/runtime hashes and remote signer attestation, and do not resume from an environment-variable change alone.

## Severity

- **Critical:** unauthorized/incorrect transfer, owner/signer compromise, exploitable contract flaw, or observed asset loss.
- **High:** policy bypass without loss, malicious frontend/signing substitution, signer or guardian control loss.
- **Medium:** repeated execution/provider failures, RPC disagreement/outage, nonce lock, missing receipts, webhook mismatch, or approval outage.
- **Low:** non-security display or documentation defect.

## First 15 minutes

1. Set `ENABLE_MAINNET_AUTONOMY=false`, disable the scheduler, and revoke signer-service workload access.
2. From an independently verified device, guardian-pauses every affected account. Verify chain `4663`, account address, `pause()` calldata, value `0`, and expected result before signing.
3. Do not unpause, rotate roles, redeploy, or withdraw until evidence is captured unless active loss requires owner recovery.
4. Record UTC time, chain, block, V3 factory/helper/account/registry versions, transaction hashes, balances, roles, policies, merchants, category/period spend, strategies, quote/cart/order/provider IDs, deployment commit, frontend deployment, RPC responses, signer request IDs, and alerts.
5. Notify owner, guardian, approvers, signer operator, infrastructure owner, and incident lead through a pre-agreed out-of-band channel.

## Containment by failure type

- **Agent/signer compromise:** pause, revoke `AGENT_ROLE` through an owner wallet, revoke signer credentials, rotate the non-exportable key, and do not reuse the address until reviewed.
- **Owner/approver/guardian compromise:** pause where possible, rotate affected role through the owner/default-admin process, and verify every pending request before cancellation.
- **Frontend compromise:** remove production traffic or roll back to the last verified artifact; compare wallet-signed calldata against published previews.
- **RPC inconsistency:** stop execution, preserve responses from all providers, switch reads to an independent provider, and reconcile against Blockscout/full node.
- **Contract flaw:** keep paused. V3 is non-upgradeable. Prepare an owner withdrawal to a verified recovery address and a new version only after review.
- **USDG anomaly:** pause USDG agent policy and all automation; do not substitute another token address.
- **Provider double order or false confirmation:** stop that adapter, preserve idempotency/webhook/provider evidence, contact the provider, and do not retry until payment and fulfillment are reconciled independently.
- **Commerce encryption or alert-signing key exposure:** stop private order creation and external delivery, rotate the affected key through the documented migration procedure, invalidate active commerce sessions, and verify stored-record and delivery-ID integrity before resuming.
- **Embedded-wallet identity/recovery incident:** stop account creation, revoke affected sessions in the identity provider, pause accounts from an independent guardian, and follow the provider's account-recovery evidence process.

## Owner recovery transaction

Before a withdrawal signature, show the exact chain, account, recipient, amount, calldata, and expected resulting balances. Confirm the recipient out of band. Owner withdrawal is not capped by agent policy, so a mistaken signature can move the full requested amount.

## Recovery gates

- root cause reproduced locally or on a pinned fork;
- affected keys/credentials rotated and permissions independently verified;
- patch reviewed, full tests pass, and bytecode is reproducible;
- receipt/indexer state reconciled with chain state;
- pause, signer-loss, RPC-failover, and recovery drills pass;
- restricted canary succeeds;
- incident lead and owner explicitly approve resumption.

## Postmortem

Publish impact, timeline, affected versions/accounts, root cause, containment, evidence, corrective actions, owners, and deadlines without disclosing secrets or vulnerable users.
