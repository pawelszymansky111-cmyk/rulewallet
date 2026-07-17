# Incident response

## Severity

- **Critical:** unauthorized execution, role compromise, exploitable contract bug, or loss of funds.
- **High:** policy bypass without observed loss, malicious frontend deployment, or signing substitution.
- **Medium:** RPC outage, incorrect display, rate-limit failure, or unavailable approvals.
- **Low:** documentation or non-security UI defects.

## Immediate response

1. Stop automated agents outside the contract.
2. Guardian pauses the policy account.
3. Do not unpause, redeploy, or change roles until the incident lead confirms evidence preservation.
4. Record contract address, chain ID, block number, transaction hashes, current roles, policies, and deployment commit.
5. Revoke compromised application credentials and pause the Vercel production deployment if the frontend is involved.
6. Notify approvers and administrators through a pre-agreed out-of-band channel.

## Containment

- If a key is compromised, rotate the role through the admin multisig.
- If the frontend is compromised, roll back to the last verified Vercel deployment and invalidate affected sessions.
- If the contract is compromised, keep it paused. The implementation is non-upgradeable; recovery uses paused admin withdrawals to an independently verified recipient.
- If the RPC is unreliable, disable the managed endpoint and switch to a verified failover before resuming read operations.

## Recovery gates

- root cause reproduced on a fork or local chain;
- patch reviewed and all tests pass;
- new bytecode independently verified;
- role holders and recovery destination confirmed by multiple people;
- small-value testnet canary completes;
- postmortem owner approves resumption.

## Postmortem

Publish a timeline, affected versions, impact, root cause, containment, corrective actions, and prevention owners without exposing secrets or vulnerable users.
