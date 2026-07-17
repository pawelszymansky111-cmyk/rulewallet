# Contributing to RuleWallet

RuleWallet is an early security-oriented prototype. Contributions should make behavior easier to understand, test, or restrict.

## Before opening a change

1. Search existing issues and discussions.
2. Open an issue for changes to the policy model or trust boundary.
3. Keep a pull request narrow and explain the failure mode it addresses.
4. Add or update evaluator tests for policy behavior.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Product rules

- Fail closed when input or state is unknown.
- Never request, print, store, or transmit seed phrases or private keys.
- Keep hard-rule failures separate from human-review thresholds.
- Mark simulated data and testnet behavior clearly.
- Do not add token, sale, airdrop, or price-promotion features.
- Do not imply an audit, partnership, or affiliation that does not exist.

## Pull requests

Include a summary, screenshots for interface changes, test evidence, and any security tradeoffs. By contributing, you agree that your work is licensed under the repository's MIT license.
