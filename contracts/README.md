# RuleWallet contracts

## Scope

`RuleWalletPolicyAccount` is a non-upgradeable, testnet-first account for allowlisted native calls and direct ERC-20 transfers. It does not support generic swaps, arbitrary token approvals, backend signing, or mainnet deployment.

## Commands

```bash
forge install foundry-rs/forge-std@v1.16.2 --no-git --shallow
forge fmt --check
forge build
forge test -vv
forge test --gas-report
```

The suite includes unit, malicious-token, reentrancy, fuzz, and invariant tests. An optional Robinhood testnet fork test runs when `RH_TESTNET_RPC_URL` is configured.

## Deployment

Use `script/DeployRuleWallet.s.sol`. It reads only public role addresses. The transaction signer is supplied interactively through the Foundry CLI, preferably a hardware wallet. Do not use a plaintext private key or commit a keystore.

After deployment:

1. Verify source and constructor arguments on Blockscout.
2. Configure native and token policies.
3. Configure target allowlists.
4. Confirm roles and approval threshold.
5. Transfer default administration to the intended multisig.
6. Fund with testnet assets only.
7. Run allowed, blocked, and approval-required canaries.
