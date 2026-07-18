# Deployment and rollback

## Web release

1. Run `npm run verify` from a clean commit.
2. Deploy a preview and verify `/`, `/start`, `/mainnet`, `/api/health`, and `/api/mainnet/status`.
3. Confirm mainnet autonomy is `false` unless every signer/monitoring gate is complete.
4. Promote the exact verified artifact; do not rebuild a different commit.
5. Keep mainnet factory/account variables empty until their source and constructor arguments are verified on Blockscout.

## Mainnet factory: prepare only

The repository does not broadcast a factory deployment automatically. The only mainnet script pins chain `4663` and canonical USDG `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` and never reads a private key.

The `/mainnet` page also exposes the same pinned factory artifact through a browser-wallet flow. It reads the connected wallet nonce, predicts the factory address, checks that the address has no code, simulates the contract creation, verifies init-code checksum `0xa878628ad64c1f77bdb0a6fb2550ed0cc543ae0a25de446dad335e53557c2445`, and displays the complete calldata before enabling the MetaMask signature. This is a signing convenience only; it does not bypass wallet confirmation or activate autonomy.

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

RuleWallet/Codex must stop before that signature. Never replace `--ledger` with a pasted seed phrase or a committed raw key.

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

## Rollback and containment

Frontend rollback cannot reverse an onchain transaction. If display/signing integrity is suspect:

1. disable mainnet autonomy and scheduled jobs;
2. guardian-pauses affected accounts using a separately verified wallet/device;
3. roll Vercel back to the last verified deployment;
4. preserve logs, receipts, roles, policy state, and commit hashes;
5. follow [`INCIDENT_RESPONSE.md`](INCIDENT_RESPONSE.md).

V2 is non-upgradeable. A contract flaw requires pause, owner withdrawal to a verified recovery address, new version deployment, and explicit owner migration.
