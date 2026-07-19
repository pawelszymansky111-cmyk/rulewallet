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

## Personal policy account and trusted addresses

1. Deploy your own contract at `/app/deploy`, or open `/app/services` and enter an existing RuleWallet policy-account address.
2. Select **Verify and use**. RuleWallet checks the pinned testnet runtime bytecode and confirms that the connected wallet holds `DEFAULT_ADMIN_ROLE`.
3. Enter a private local label and the full EVM recipient address.
4. Select **Preview permission** and verify the chain, policy account, target, detected wallet/contract type, permission, and scope.
5. Sign `setTargetAllowed(target, true)` in your wallet.
6. Disable the address at any time with another simulated, explicit wallet transaction.

Labels are stored only in the current browser and are not identity verification. The onchain `allowedTargets` mapping is authoritative. Always verify a recipient address through a second trusted channel.

The ecosystem section is for discovery. Protocol contracts are not one-click enabled because the current policy account cannot restrict arbitrary router calldata. A service becomes automation-ready only after RuleWallet ships and audits a dedicated adapter that constrains selectors, assets, recipients, and minimum output.

## Scheduled strategies

1. Open `/app/agent` with the onchain admin wallet connected.
2. Grant `AGENT_ROLE` to the displayed dedicated agent address in MetaMask.
3. Fund that address with only enough testnet ETH to pay gas.
4. Choose payroll, subscription, contractor, or agent allowance as a starting template—or enter a custom name, amount, and daily/weekly cadence.
5. Enter an already allowlisted target and review the prefilled values. Templates never create permission or bypass policy.
6. Sign the short-lived admin message; it does not move funds.
7. Use **Run now** for a canary execution, then verify its receipt on `/activity`.
8. Pause a strategy with another admin signature, revoke `AGENT_ROLE`, or emergency-pause the contract at any time.

The scheduled agent cannot edit policies or targets and refuses amounts above the human-approval threshold.

## Owner funds and recovery

1. Open `/app`, connect the account owner, and confirm the selected policy account.
2. Enter a small faucet-ETH amount under **Owner funds** and simulate the direct deposit before signing it in the wallet.
3. To recover funds, first use the guardian or owner pause control in `/app/agent`.
4. Return to **Owner funds**, enter the amount and recovery recipient, and simulate `emergencyWithdrawNative`.
5. Sign only after the preview shows chain `46630`, the intended policy account, amount, and recipient.
6. Open the resulting explorer receipt and unpause only after the incident or recovery is resolved.

Deposits do not grant the agent additional authority. Owner recovery remains separate from agent limits, requires `DEFAULT_ADMIN_ROLE`, and is available only while the account is paused.

## Notifications

Open `/app/notifications` to see whether external delivery is configured. In-app receipts always remain available. An operator may configure a server-only authenticated HTTPS adapter to route confirmed execution, approval, failure, and unusual-spending events to email, Telegram, Slack, or an incident platform.

Notification delivery happens only after the receipt is stored. The destination receives no wallet, signer, or policy-management credential. Test the adapter with a deliberately blocked testnet request and compare the event to `/activity`.

## Human approval

1. Connect an independent wallet with `APPROVER_ROLE`.
2. Obtain the request ID from the `RequestCreated` explorer event.
3. Enter the request ID and record an approval.
4. After the threshold is reached, execute the approved request.

Execution rechecks active policy, allowlists, transaction limit, rolling spend, slippage metadata, expiry, pause state, and asset balance. Approval cannot override a failed hard rule.

## Emergency

The guardian may pause immediately. Only the delayed default admin can unpause or recover assets, and recovery is available only while paused. Follow the incident runbook before taking recovery actions.
