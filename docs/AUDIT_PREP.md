# Audit preparation

## Audit target

- `contracts/src/RuleWalletPolicyAccount.sol`
- deployment and role configuration scripts;
- ABI consumed by `src/lib/rulewallet-contract.ts`;
- wallet simulation/signing flow;
- testnet deployment bytecode and constructor arguments.

## Reviewer focus

1. Access-control graph and delayed admin transfer.
2. Native and token balance accounting.
3. Conservative 25-bucket implementation of the 24-hour rolling limit, including the up-to-one-hour over-count boundary.
4. Request state transitions, nonce consumption, expiry, cancellation, and approval uniqueness.
5. Reentrancy around external calls and emergency recovery.
6. Malicious ERC-20 behavior and unsupported token semantics.
7. Event completeness and offchain indexer assumptions.
8. Browser simulation-to-signature binding.
9. Deployment reproducibility and explorer verification.

## Evidence already present

- deterministic compiler configuration in `contracts/foundry.toml`;
- non-upgradeable implementation;
- OpenZeppelin Contracts pinned to `5.6.1`;
- unit tests for allowlists, limits, approvals, nonce replay, expiry, pause, recovery, reentrancy, and false-return tokens;
- 512-run fuzz test;
- 128-run, depth-32 invariant campaigns;
- explicit mainnet release checklist.

## Required before audit begins

- freeze the commit and compiler image;
- publish deployed testnet address and constructor arguments;
- verify source and bytecode on Blockscout;
- add router adapters only as separate review scopes;
- resolve all static-analysis findings or document accepted risk;
- provide role owner/key-management diagram;
- run a public testnet canary and capture receipts;
- commission at least one independent smart-contract audit.

Coverage and passing tests are evidence, not an audit.
