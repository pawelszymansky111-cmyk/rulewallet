# RuleWallet public testnet launch kit

## Security-beta launch checklist

- [ ] `npm run verify` passes from a clean checkout.
- [ ] The mandatory current-state mainnet fork confirms canonical USDG is `USDG` with 6 decimals.
- [ ] `/demo`, `/start`, `/app/agent`, `/activity`, `/docs`, and `/mainnet` render on mobile and desktop.
- [ ] `/app` shows live balance, limits, role state, next schedule, and recent receipt without demo placeholders.
- [ ] Payment templates prefill only bounded direct testnet transfers and never bypass trusted-recipient or limit checks.
- [ ] `/app/notifications` reports the adapter state without exposing endpoint credentials.
- [ ] `/mainnet` says “Experimental, unaudited mainnet,” rejects incompatible factories, and keeps autonomy fail-closed until every production gate passes.
- [ ] No seed phrase, private key, signer credential, RPC credential, or Redis credential appears in Git history or build output.
- [ ] No blockchain transaction was broadcast during release verification.
- [ ] Publish the hackathon copy and X thread only after the production deployment health check passes.

## Positioning

**Tagline:** Agents act. Rules hold.

**One sentence:** RuleWallet gives autonomous onchain agents narrow, enforceable authority with spending caps, target allowlists, human thresholds, public receipts, and instant revocation.

RuleWallet is original open-source testnet infrastructure. Never imply a Robinhood partnership, an audit, mainnet readiness, custody certification, or a token.

## Canonical links

- Product: https://rulewallet.vercel.app
- Guided demo: https://rulewallet.vercel.app/demo
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

**Bio:** Give agents a budget. Keep the keys. Programmable spending controls and public receipts for autonomous onchain agents. Live on testnet. Open source.

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

1. Open `/demo`; show `Policy: enforcing`, the live block, agent nonce, and confirmed receipt count.
2. Continue to the receipt and open its transaction on the testnet explorer.
3. Open the simulator; show one allowed payment and one blocked untrusted recipient.
4. End on the line: **Give agents a budget. Keep the keys.**

Do not record wallet secrets, browser notifications, personal tabs, Vercel environment variables, or mainnet balances.

## Community outreach

> I’m building RuleWallet, an open-source policy account for autonomous onchain agents. The public Robinhood Chain testnet demo now has a dedicated agent role, scheduled execution, hard onchain limits, and explorer-backed receipts. I’m looking for one concrete action your agent needs and one failure the policy must block. Would you try the two-minute demo? https://rulewallet.vercel.app/demo

Approach Robinhood Chain builders, account-abstraction teams, autonomous-agent developers, and onchain security researchers. Contribute useful feedback before posting a link, and ask for a concrete failure case rather than generic promotion.

## Release checklist

- [ ] Production deployment is `READY` and aliased to `rulewallet.vercel.app`.
- [ ] `/api/mainnet/status` reports the verified factory, canonical 6-decimal USDG, signer identity, and every production gate accurately.
- [ ] `/api/public/metrics` returns current block, policy, agent, and receipt data.
- [ ] `/start`, `/demo`, `/hackathon`, `/activity`, `/docs`, and `/security` pass desktop and mobile checks.
- [ ] The latest transaction hash opens on the Robinhood Chain testnet explorer.
- [ ] The public GitHub branch or merged main commit matches the verified production artifact.
- [ ] X profile and every post say testnet; no token or affiliation claim appears.
- [ ] Private vulnerability reporting is enabled before soliciting security review.

## Non-negotiable disclosure

RuleWallet is experimental and not independently audited. Testnet assets have no value. Mainnet autonomy remains disabled until every published production gate passes; do not deposit real funds during the preview. There is no token, sale, airdrop, investment product, or affiliation with Robinhood Markets.
