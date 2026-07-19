# Deployment and rollback

> Mainnet rule: application releases never broadcast contract or fund-moving transactions. The existing older factory is incompatible. Deploying the `2.1.0-security-beta` factory and every personal account requires a separately reviewed connected-wallet or hardware-wallet signature.

## Web release

1. Run `npm run verify` from a clean commit.
2. Deploy a preview and verify `/`, `/start`, `/mainnet`, `/api/health`, and `/api/mainnet/status`.
3. Confirm mainnet autonomy is `false` unless every factory, asset, signer, storage, scheduler, nonce, RPC, monitoring, and fee gate is complete.
4. Promote the exact verified artifact; do not rebuild a different commit.
5. Keep mainnet factory/account variables empty until their source and constructor arguments are verified on Blockscout.

## Mainnet factory

The repository does not broadcast a factory deployment automatically. The only mainnet script pins chain `4663` and canonical USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` and never reads a private key.

The `/mainnet` page also exposes the same pinned factory artifact through a browser-wallet flow. It reads the connected wallet nonce, predicts the factory address, checks that the address has no code, simulates the contract creation, verifies security-beta init-code checksum `0x62100ea86a79ac148a08a5897cd8227aeb95e8da6a2dcaef573876047a6dd2df`, and displays the complete calldata before enabling the MetaMask signature. After deployment, the complete immutable-linked runtime must hash to `0x852fd105d0cbf2c8d740f896cbab0059151989d47736e9522b1759d9e4ce4a16`. This is a signing convenience only; it does not bypass wallet confirmation or activate autonomy.

Build and run a no-broadcast simulation first:

```bash
cd contracts
export RH_MAINNET_RPC_URL="https://your-managed-primary"
forge build
forge script script/DeployRuleWalletV2Mainnet.s.sol:DeployRuleWalletV2Mainnet \
  --rpc-url robinhood_mainnet \
  --sender 0xYOUR_HARDWARE_WALLET_ADDRESS \
  -vvvv
```

Before any signature, record and review:

- chain: Robinhood Chain mainnet, ID `4663`;
- transaction type: contract creation (`to` is empty);
- value: `0 ETH`;
- calldata: exact factory init code from the dry-run broadcast artifact;
- constructor: `(4663, 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168)`;
- expected result: one `RuleWalletFactory` whose `deploymentChainId`, `canonicalStablecoin`, `VERSION`, and `VERSION_HASH` match the release.

Only after an owner explicitly approves that exact payload should a human run an external hardware-wallet command such as:

```bash
forge script script/DeployRuleWalletV2Mainnet.s.sol:DeployRuleWalletV2Mainnet \
  --rpc-url robinhood_mainnet \
  --broadcast \
  --ledger
```

RuleWallet/Codex must stop before that signature and show the exact transaction. Never replace `--ledger` with a pasted seed phrase or a committed raw key.

## Verify on Blockscout

After the receipt is final and the address is independently checked:

```bash
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(uint256,address)" \
  4663 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168)

forge verify-contract 0xFACTORY \
  src/RuleWalletFactory.sol:RuleWalletFactory \
  --chain-id 4663 \
  --rpc-url robinhood_mainnet \
  --verifier blockscout \
  --verifier-url https://robinhoodchain.blockscout.com/api/ \
  --constructor-args "$CONSTRUCTOR_ARGS"
```

Compare runtime bytecode, compiler `0.8.24`, optimizer settings, constructor arguments, canonical USDG, version hash, deployment transaction, and repository commit. Then set `NEXT_PUBLIC_RULEWALLET_MAINNET_FACTORY_ADDRESS` and redeploy the frontend.

## Personal V2 account

`/mainnet` requires four distinct owner/guardian/agent/approver addresses. It first simulates factory deployment and displays exact chain, factory, value, calldata, predicted account, and result. The connected owner signs in the wallet. Each recipient, asset policy, pause/unpause, deposit, and withdrawal is then a separate simulated wallet transaction.

No platform-wide maximum balance or owner withdrawal limit exists. Agent policies remain mandatory and bounded.

## Autonomous signer and scheduler

1. Deploy [`services/aws-kms-signer`](../services/aws-kms-signer) in a separate AWS account or security boundary.
2. Use two managed Robinhood Chain RPC URLs from different hosts and explicit signer-side fee ceilings.
3. Read the authenticated identity endpoint and record its public signer address, KMS key ID, and `sha256:` public-key attestation.
4. Add the personal account to the signer allowlist and grant only that signer address `AGENT_ROLE`.
5. Configure the matching Vercel variables from [`ENVIRONMENT.md`](ENVIRONMENT.md), durable Redis, authenticated HTTPS alerts, and `CRON_SECRET`.
6. Configure a five-minute Vercel Pro Cron or a durable external scheduler that calls `GET /api/cron/mainnet-agent` with `Authorization: Bearer <CRON_SECRET>`. Only then set `MAINNET_SCHEDULER_MODE=vercel-pro-cron` or `external-durable`.
7. Keep `ENABLE_MAINNET_AUTONOMY=false` while `/api/mainnet/status` reports any incomplete gate.
8. Run one restrictive canary with an allowlisted recipient and small owner-configured limits. Only then set `ENABLE_MAINNET_AUTONOMY=true` and redeploy the same reviewed commit.

The repository's `vercel.json` schedules only the daily testnet job so it remains deployable on Vercel Hobby. Mainnet must use a five-minute Vercel Pro Cron or an authenticated durable external scheduler. Do not claim the scheduler gate is ready or expose the route without `CRON_SECRET`.

## Rollback and containment

Frontend rollback cannot reverse an onchain transaction. If display/signing integrity is suspect:

1. disable mainnet autonomy and scheduled jobs;
2. guardian-pauses affected accounts using a separately verified wallet/device;
3. roll Vercel back to the last verified deployment;
4. preserve logs, receipts, roles, policy state, and commit hashes;
5. follow [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).

V2 is non-upgradeable. A contract flaw requires pause, owner withdrawal to a verified recovery address, new version deployment, and explicit owner migration.
