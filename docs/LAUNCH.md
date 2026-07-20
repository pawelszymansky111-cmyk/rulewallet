# RuleWallet V3 launch kit

## Security-beta launch checklist

- [ ] `npm run verify` passes from a clean checkout.
- [ ] The mandatory current-state mainnet fork confirms canonical USDG is `USDG` with 6 decimals.
- [ ] `/command`, `/approvals`, `/mainnet`, `/app`, `/app/operator`, `/activity`, and `/docs` render on mobile and desktop.
- [ ] `/app` shows live balance, limits, role state, next schedule, and recent receipt without demo placeholders.
- [ ] Payment templates prefill only bounded direct testnet transfers and never bypass trusted-recipient or limit checks.
- [ ] `/app/notifications` reports the adapter state without exposing endpoint credentials.
- [ ] `/mainnet` accepts only exact V3 factory/helper/account/registry provenance and keeps autonomy fail-closed until every production gate passes.
- [ ] Provider status distinguishes official test/search data, hosted checkout, disabled purchase adapters, and confirmed payments.
- [ ] No seed phrase, private key, signer credential, RPC credential, or Redis credential appears in Git history or build output.
- [ ] No blockchain transaction was broadcast during release verification.
- [ ] Publish the hackathon copy and X thread only after the production deployment health check passes.

## Positioning

**Tagline:** Tell the agent what to buy. Keep the keys and the limits.

**One sentence:** RuleWallet gives AI agents merchant, category, time, amount, approval, and expiry-bounded payment authority without giving them the owner key.

RuleWallet is original open-source testnet infrastructure. Never imply a Robinhood partnership, an audit, mainnet readiness, custody certification, or a token.

## Canonical links

- Product: https://rulewallet.vercel.app/command
- Guided demo: [`COMMAND_CENTER_DEMO.md`](COMMAND_CENTER_DEMO.md)
- Hackathon submission: https://rulewallet.vercel.app/hackathon
- Owner onboarding: https://rulewallet.vercel.app/start
- Public receipts: https://rulewallet.vercel.app/activity
- Documentation: https://rulewallet.vercel.app/docs
- Security model: https://rulewallet.vercel.app/security
- Repository: https://github.com/pawelszymansky111-cmyk/rulewallet
- X thread: [`X_LAUNCH_THREAD.md`](X_LAUNCH_THREAD.md)
- Demo runbook: [`PUBLIC_DEMO.md`](PUBLIC_DEMO.md)
- Submission copy: [`HACKATHON_SUBMISSION.md`](HACKATHON_SUBMISSION.md)
- Pitch script: [`PITCH_SCRIPT.md`](PITCH_SCRIPT.md)

## X profile

**Display name:** RuleWallet

**Handle candidates:** `@RuleWalletDev`, `@UseRuleWallet`, `@RuleWalletHQ` — verify availability before claiming.

**Bio:** The spending command center for AI agents. Passkey wallets, merchant budgets, approvals, scheduled payments, and public receipts on Robinhood Chain. Open source.

**Website:** https://rulewallet.vercel.app/demo

## Launch assets

- Text-free key visual: `public/social/rulewallet-testnet-launch.png`
- 1200×630 social export: `public/social/rulewallet-testnet-launch-1200x630.png`
- Generated Open Graph preview: https://rulewallet.vercel.app/opengraph-image
- Generated X preview: https://rulewallet.vercel.app/twitter-image
- X profile banner (PNG): `public/social/rulewallet-x-banner.png`
- Editable X banner source: `public/social/rulewallet-x-banner.svg`

The new white-and-green preview and banner use the RuleWallet R mark, product UI motifs, and no third-party marks. Use the generated preview for link cards and the 1500×500 PNG for the X profile.

## Two-minute judge recording

1. Open `/command`; unlock/connect a wallet and show a named V3 account.
2. Show a merchant/category/budget policy simulation and exact calldata.
3. Request a provider quote, create a guarded order, and open the approval inbox.
4. Show one receipt and one blocked policy violation. End on: **Tell the agent what to buy. Keep the keys and the limits.**

Do not record wallet secrets, browser notifications, personal tabs, Vercel environment variables, or mainnet balances.

## Community outreach

> I’m building RuleWallet, an open-source spending command center for AI agents. Users create a wallet, add merchant/category/time budgets, approve exceptions, and verify public receipts. I’m looking for one commerce action your agent needs and one failure the policy must block. Would you try the testnet Command Center? https://rulewallet.vercel.app/command

Approach Robinhood Chain builders, account-abstraction teams, autonomous-agent developers, and onchain security researchers. Contribute useful feedback before posting a link, and ask for a concrete failure case rather than generic promotion.

## Release checklist

- [x] Production deployment is `READY` and aliased to `rulewallet.vercel.app` (verified 2026-07-20).
- [x] `/api/mainnet/status` accurately reports the missing V3 factory and production signer gates while confirming canonical six-decimal USDG.
- [x] `/api/public/metrics` returns the current block, policy, agent, and receipt data.
- [x] Every public route returns HTTP 200; Command Center, Start, Approvals, and Demo pass desktop/mobile browser checks without runtime errors or horizontal overflow.
- [x] The latest confirmed testnet receipt opens on the Robinhood Chain testnet explorer.
- [x] The public `agent/spending-command-center` branch matches the verified production artifact (verified 2026-07-20).
- [ ] X profile and every post say testnet; no token or affiliation claim appears.
- [ ] Private vulnerability reporting is enabled before soliciting security review.

## Non-negotiable disclosure

RuleWallet is experimental and not independently audited. Testnet assets have no value. Mainnet autonomy remains disabled until every published production gate passes; do not deposit real funds during the preview. There is no token, sale, airdrop, investment product, or affiliation with Robinhood Markets.
