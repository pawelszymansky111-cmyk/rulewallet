# Security policy

## Prototype warning

RuleWallet is pre-audit testnet software. The current repository contains a policy simulator and interface prototype, not a production signer or custody system. Do not use it with real assets.

## Reporting a vulnerability

Do not open a public GitHub issue. Use the repository's **Security → Report a vulnerability** flow so maintainers can respond privately.

Please include:

- affected commit and component;
- realistic impact and preconditions;
- minimal reproduction steps or proof of concept;
- suggested mitigation, if known;
- whether you intend to publish the finding.

Expect an acknowledgement within five business days once maintainers are configured. No bounty is promised. We will credit reporters who request attribution after a fix is available.

## In scope

- policy evaluation that permits a request which should be blocked;
- bypass of approval thresholds or allowlists;
- unsafe handling of secrets introduced in future integrations;
- cross-request replay or policy-version confusion;
- injection or authorization flaws in future hosted services.

## Out of scope

- denial of service against a local development instance;
- findings that require real funds, phishing, or social engineering;
- vulnerabilities in third-party protocols without a RuleWallet-specific impact;
- claims based only on automated scanner output.
