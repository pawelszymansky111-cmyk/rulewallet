# Mainnet release checklist

Mainnet is blocked until every mandatory item is complete. Checking a box requires linked evidence, not a verbal assertion.

## Contracts

- [ ] Independent audit completed.
- [ ] All critical and high findings fixed and retested.
- [ ] Medium findings resolved or formally accepted with rationale.
- [ ] Deployment bytecode reproduced from the tagged commit.
- [ ] Source, constructor arguments, and bytecode verified on the explorer.
- [ ] Invariant, fuzz, unit, integration, static-analysis, and fork tests pass.
- [ ] Token semantics and every target/adapter reviewed.
- [ ] Emergency pause and paused recovery rehearsed.

## Authority

- [ ] Default admin is a verified multisig, not an individual EOA.
- [ ] Guardian and approver keys are independent.
- [ ] Multisig owners and threshold verified out of band.
- [ ] Hardware-wallet recovery and key-rotation drill completed.
- [ ] No agent holds admin, guardian, or approval authority.

## Operations

- [ ] Managed RPC primary and failover configured.
- [ ] Distributed rate limiting and WAF rules active.
- [ ] Contract events, errors, RPC latency, and balance alerts active.
- [ ] Incident-response contacts and runbook tested.
- [ ] Rollback and frontend integrity checks tested.
- [ ] Small-value mainnet canary completed under restrictive limits.

## Product and legal

- [ ] Every wallet prompt displays chain, contract, function, target, value, and expiry.
- [ ] Risk disclosures reviewed.
- [ ] Legal, regulatory, privacy, and sanctions/compliance review completed for intended jurisdictions.
- [ ] Public documentation matches deployed behavior.
- [ ] Explicit written owner approval received for the exact deployment commit and addresses.

`ENABLE_MAINNET` must remain `false` until the final approval is recorded. The current application does not include a mainnet Wagmi chain configuration.
