# V3 deployment and rollback

Application releases never broadcast a blockchain transaction automatically. The operator page prepares a transaction, verifies every byte it can read, simulates it, and then stops for the connected wallet signature.

## 1. Verify the release

```bash
npm ci
npm run verify
npm audit --omit=dev --audit-level=high
```

Record the commit, compiler `0.8.24`, optimizer settings, generated-artifact hashes, test output, and production build ID. Do not deploy from a dirty tree.

## 2. Deploy testnet platform contracts

1. Open `/app/operator` and select testnet `46630`.
2. Connect the operator wallet and acknowledge the valueless-test-asset notice.
3. Prepare `RuleWalletTestUSDG`; review chain, contract-creation data, predicted address, gas, and zero value.
4. Sign in the wallet. This token permanently rejects chain `4663` and exposes a rate-limited faucet.
5. Prepare `RuleWalletFactoryV3(46630, <test-token>)`; recheck the operator nonce and predicted address.
6. Sign in the wallet and wait for the receipt.
7. Verify the exact factory and both helper runtimes in the operator page.
8. Set `NEXT_PUBLIC_RULEWALLET_TESTNET_STABLECOIN_ADDRESS` and `NEXT_PUBLIC_RULEWALLET_TESTNET_V3_FACTORY_ADDRESS`.

## 3. Deploy the mainnet factory

The only supported constructor is:

```text
RuleWalletFactoryV3(
  4663,
  0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
)
```

1. Confirm the official chain, RPC, explorer, and USDG address from Robinhood documentation.
2. Use a dedicated hardware wallet with enough ETH for gas.
3. Open `/app/operator`, select mainnet, and prepare the factory deployment.
4. Independently review chain `4663`, empty `to` (contract creation), value `0`, complete init code, constructor values, nonce, predicted address, gas, and expected helper addresses.
5. Sign only that exact creation transaction in the wallet.
6. Wait for finality, open the Blockscout receipt, and verify source/constructor arguments.
7. Re-run exact runtime/helper verification from a second machine.
8. Set only `NEXT_PUBLIC_RULEWALLET_MAINNET_V3_FACTORY_ADDRESS` and redeploy the same reviewed commit.

No raw private key, seed phrase, or `AGENT_PRIVATE_KEY` is accepted by this flow.

## 4. Personal accounts and rules

The Command Center and `/mainnet` deploy one CREATE2 account at a time. Owner, guardian, agent, and approver must be distinct addresses. Each account creates its own immutable policy registry. The owner then separately simulates and signs:

- asset limits and expiry;
- merchant trust, category, and automatic/approval behavior;
- merchant/asset limits and daily transaction count;
- category budgets;
- weekday/UTC schedule;
- activation, pause, or unpause;
- owner deposits and withdrawals when needed.

Use testnet first. A mainnet account should not be funded until its factory, roles, paired registry, and policy reads all verify.

## 5. Production automation

1. Deploy [`services/aws-kms-signer`](../services/aws-kms-signer) in an isolated AWS account/security boundary.
2. Configure two independent managed Robinhood Chain RPC providers, DynamoDB idempotency, account allowlist, and signer-side fee ceilings.
3. Record the authenticated signer address, KMS key ID, public-key attestation, and allowed V3 selector.
4. Grant only that public address `AGENT_ROLE` on each intended account.
5. Configure durable Redis, `CRON_SECRET`, an authenticated five-minute scheduler, and authenticated HTTPS incident alerts.
6. Keep `ENABLE_MAINNET_AUTONOMY=false` until `/api/mainnet/status` reports every gate ready.
7. Run failure drills and a restrictive canary. Only then set the flag to `true` and redeploy the exact reviewed commit.

## 6. Web release

1. Deploy a preview from the release branch.
2. Verify `/command`, `/approvals`, `/mainnet`, `/app`, `/app/operator`, `/api/health`, `/api/mainnet/status`, and the commerce/provider APIs.
3. Confirm missing credentials produce explicit disabled states, not fake success.
4. Confirm mainnet automation is fail-closed by default.
5. Promote the exact preview artifact without rebuilding another commit.

## Rollback and containment

A frontend rollback cannot reverse an onchain payment.

1. set `ENABLE_MAINNET_AUTONOMY=false` and stop the scheduler;
2. guardian-pause affected accounts from an independently verified device;
3. revoke the agent role and affected strategies;
4. preserve receipts, provider responses, signer logs, nonces, roles, and release hashes;
5. owner-withdraw to a separately verified recovery address if the contract version is suspect;
6. roll Vercel back and follow [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).

V3 is non-upgradeable. A contract defect requires a new version and explicit owner migration.
