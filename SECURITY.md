# Security policy

## Status

RuleWallet is unaudited testnet software. It includes a real policy contract and wallet-connected transaction flow, but it is not certified for mainnet or real funds. Do not deposit valuable assets.

Mainnet is disabled in code and configuration. No RuleWallet contributor will ask for a seed phrase, private key, keystore file, remote-control session, or funds.

## Reporting a vulnerability

Do not open a public GitHub issue. Use the repository's **Security → Report a vulnerability** flow.

Include:

- affected commit, contract, route, and chain;
- realistic impact and required preconditions;
- minimal reproduction or proof of concept using test assets;
- suggested mitigation, if known;
- whether disclosure is planned.

Do not test with third-party or real funds. No bounty is promised. Acknowledgement is targeted within five business days after maintainers configure the private reporting workflow.

## In scope

- bypassing an allowlist, asset limit, rolling limit, nonce, expiry, pause, or approval threshold;
- executing a pending request after cancellation or expiry;
- reentrancy or malicious-token behavior that causes incorrect accounting;
- frontend transaction substitution after a successful simulation;
- leaking managed RPC credentials or adding any backend signing key;
- CSP, RPC proxy, or API behavior that enables a material RuleWallet-specific attack.

## Known limitations

- No independent audit or formal verification has been completed.
- The 24-hour limit conservatively retains 25 one-hour buckets. It never undercounts the prior 24 hours, but spend can remain counted for up to one additional hour.
- Admin and role configuration is safe only when role keys are independently secured.
- RPC rate limiting is per runtime instance; Vercel Firewall or a distributed limiter is still required for hostile traffic.
- No production monitoring provider is configured.
- Router swaps and arbitrary token approvals are disabled because generic calldata cannot safely enforce slippage or outflow limits.
- A testnet deployment and explorer verification still require an explicit signer transaction.

## Incident handling

Follow [`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md). The first response to suspected contract compromise is guardian pause, followed by evidence preservation and multisig review. Never rush an unreviewed upgrade—the account is intentionally non-upgradeable.
