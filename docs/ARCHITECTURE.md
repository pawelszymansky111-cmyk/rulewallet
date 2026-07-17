# Architecture

## Current repository

The MVP is a Next.js application with a pure TypeScript policy engine. Fixtures model a Robinhood Chain testnet workflow, but no RPC call, signing operation, database, or wallet connection occurs.

```text
src/lib/policy.ts                 Pure rules and decision type
src/components/policy-playground Interactive request simulator
src/components/policy-builder    Local policy configuration and export
src/app/app                      Operator workflow and evidence views
src/app/docs                     Public product specification
src/app/security                 Threat model and disclosure boundary
```

The evaluator has no network dependency and returns rule-level evidence. This makes behavior fast to test and keeps product semantics separate from UI state.

## Intended production components

### 1. Agent adapter

Accept an MCP tool call, SDK request, or authenticated API request. Normalize it into a versioned schema. Reject ambiguous or unsupported fields.

### 2. Simulation and enrichment

Decode calldata, estimate asset changes, resolve contract identity, and attach oracle and market-state evidence. Time-stamp every external input and fail closed when it is stale.

### 3. Policy engine

Evaluate immutable policy version plus normalized request. Produce a signed decision artifact with hard-rule results and a reason code.

### 4. Approval service

For `review` outcomes, present the exact simulated effect to an authenticated operator. Bind the approval to request hash, policy version, chain ID, nonce, and expiry.

### 5. Scoped executor

Use a revocable session key or smart-account permission that cannot exceed the same policy. Never place a master private key in an agent runtime.

### 6. Receipt store

Persist the request, enriched evidence, decision, approval identity, execution response, and transaction hash. Use append-only records and explicit retention rules.

## Trust boundaries

- Agent output is untrusted.
- Frontend labels are not security controls.
- RPC, oracle, contract metadata, and simulation results can be wrong or stale.
- Human approvals can be phished or issued from a compromised device.
- Allowed third-party contracts can still contain vulnerabilities.
- The production executor must independently enforce policy-bound authority.

## Near-term milestones

1. Freeze and test policy schema and reason codes.
2. Add Zod validation at every external boundary.
3. Integrate one Robinhood Chain testnet RPC and one known contract.
4. Add deterministic calldata decoding and effect simulation.
5. Implement authenticated approvals with replay protection.
6. Prototype a revocable scoped account and publish a threat-model review.
