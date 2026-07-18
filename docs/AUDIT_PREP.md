# Audit preparation

## Primary scope

- `contracts/src/RuleWalletFactory.sol`
- `contracts/src/RuleWalletPolicyAccountV2.sol`
- `contracts/script/DeployRuleWalletV2Mainnet.s.sol`
- V2 ABI/registry and `/mainnet` simulation-to-signing flow
- `SecureAgentSigner` boundary, durable lock ownership, RPC failover, and mainnet status gates

V1 remains a separate testnet-compatibility scope.

## Reviewer focus

1. CREATE2 salt/address calculation, version registry, constructor immutables, and wrong-chain guard.
2. Owner/default-admin/agent/approver/guardian role graph and role rotation.
3. ETH/USDG-only boundary and absence of arbitrary call/approval/upgrade paths.
4. Positive asset-policy validation, conservative 25-bucket rolling accounting, pending-request revalidation, and optional threshold semantics.
5. EIP-712 type/domain encoding, owner recovery, nonce-to-digest binding, interval, expiry, revocation, execution cap, and pending approval interaction.
6. Reentrancy, recipient failure, canonical token behavior, owner withdrawals, and pause behavior.
7. Event completeness, public receipt assumptions, and confirmation/reorg handling.
8. UI simulation-to-send binding and exact transaction preview.
9. Secure signer allowlisting, idempotency, nonce serialization, credential lifecycle, and fail-closed behavior.

## Evidence

- Solidity `0.8.24`, Cancun EVM, optimizer 1,000 runs, no metadata bytecode hash;
- OpenZeppelin Contracts pinned to `5.6.1`;
- non-upgradeable V2 implementation and versioned factory;
- unit/factory/role/limit/approval/withdrawal/strategy/replay/pause/token tests;
- 512-run fuzz campaigns and 128-run depth-32 V1/V2 invariants;
- optional current-state chain `4663` fork verifying canonical USDG code and V2 deployment;
- deterministic generated web artifacts checked against Foundry output;
- release checklist, architecture, threat model, deployment guide, and incident runbook.

Passing tests and coverage are evidence, not an audit. Source verification is evidence of code identity, not safety.
