# User guide

## Connect safely

1. Open the RuleWallet deployment from a trusted bookmark.
2. Connect an injected wallet or WalletConnect session.
3. Switch to **Robinhood Chain Testnet (46630)**.
4. Confirm the header and banner both say testnet.
5. Never enter a seed phrase in the site.

## Agent execution

1. The connected agent wallet must hold `AGENT_ROLE`.
2. Enter an allowlisted target and testnet ETH amount.
3. Select **Simulate onchain**.
4. Read the chain, policy address, target, value, calldata, nonce, expiry, and approval path.
5. Select **Sign exact testnet call** only if every field matches your intent.
6. Verify the resulting hash on the Robinhood Chain testnet explorer.

Amounts below the configured approval threshold execute immediately if all hard rules pass. Larger amounts create a pending request.

## Scheduled strategies

1. Open `/app/agent` with the onchain admin wallet connected.
2. Grant `AGENT_ROLE` to the displayed dedicated agent address in MetaMask.
3. Fund that address with only enough testnet ETH to pay gas.
4. Create a daily or weekly recurring transfer to an already allowlisted target. Sign the short-lived admin message; it does not move funds.
5. Use **Run now** for a canary execution, then verify its receipt on `/activity`.
6. Pause a strategy with another admin signature, revoke `AGENT_ROLE`, or emergency-pause the contract at any time.

The scheduled agent cannot edit policies or targets and refuses amounts above the human-approval threshold.

## Human approval

1. Connect an independent wallet with `APPROVER_ROLE`.
2. Obtain the request ID from the `RequestCreated` explorer event.
3. Enter the request ID and record an approval.
4. After the threshold is reached, execute the approved request.

Execution rechecks active policy, allowlists, transaction limit, rolling spend, slippage metadata, expiry, pause state, and asset balance. Approval cannot override a failed hard rule.

## Emergency

The guardian may pause immediately. Only the delayed default admin can unpause or recover assets, and recovery is available only while paused. Follow the incident runbook before taking recovery actions.
