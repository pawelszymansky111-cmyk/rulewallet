# Commerce capability matrix

This document separates working features from demos and future integrations. The UI obtains the same status from `/api/commerce/providers` and never treats a search result as proof of payment or fulfillment.

| Capability | Testnet | Mainnet | Current boundary |
| --- | --- | --- | --- |
| External wallet connection | Working | Working | User controls signatures |
| Passkey/email embedded owner wallet | Working when Privy is configured | Working when Privy is configured | Explicit create/recovery/export provider flows; RuleWallet never receives the private key |
| Multiple embedded role addresses | Working when Privy is configured | Working when Privy is configured | Independent devices/recovery recommended |
| Named personal V3 policy accounts | Working after V3 factory configuration | Working after V3 factory deployment | Separate owner/agent/approver/guardian required |
| ETH and six-decimal stablecoin balances | Valueless ETH + tUSDG | Real ETH + canonical USDG | Only these two agent assets |
| Merchant/category/time/spend policies | Working | Working after V3 deployment | Enforced by paired registry onchain |
| Automatic trusted-recipient payment | V3 contract path implemented; shared V3 deployment/signer required | Production-gated | Every rule still applies; no unlimited authority |
| Human approval requests | Working | Working after V3 deployment | Current role, expiry, signature, and policy revalidated |
| Scheduled EIP-712 transfers | Legacy V2 public demo plus V3 contract tests | Implemented, production-gated | A V3 testnet signer deployment and the mainnet production gates are external setup steps |
| Duffel flight offers | Official test-mode data with token | Test data only | No real payment or ticket |
| Duffel accommodation search | Official Stays test-mode availability with token and Stays access | Test data only | Search-stage price only; no final provider quote, payment, or booking |
| Ticketmaster event discovery | Official search data with key | Search + hosted checkout | No autonomous purchase API claim |
| Direct onchain invoice | Quote and V3 policy path | V3 transfer path after deployment | Exact trusted EVM recipient and user-entered amount required |
| Direct-order reconciliation | Working state machine and private order ledger | Working after signer/factory gates | Exact cart intent hash binds pending, confirmed, timeout, late, blocked, and failed receipts; ambiguous timeouts are never blindly retried |
| Shopify carts | Deterministic demo only | Disabled | Merchant domain/token/webhooks needed |
| Stripe Issuing virtual card | Deterministic demo only | Disabled | Provider approval, compliance, funding, controls, and webhooks needed |
| Food ordering | Deterministic demo only | Disabled | No authorized ordering API partner configured |
| Provider payment confirmation | State model and demo only | Disabled unless a real adapter exists | Must reconcile provider confirmation separately from chain receipt |
| Swaps, bridges, arbitrary calls, token approvals | Unsupported | Unsupported | Deliberate contract boundary |

## Definition of “working”

A feature is marked working only when the app constructs its real payload, validates provenance, simulates it, and either obtains a user wallet signature or routes it through the gated signer. A sandbox adapter may call a provider's official test/search API, but it never sets `purchaseAvailable=true`, `handlesRealFunds=true`, or an order status of `paid`.

## Enabling a real provider

A provider moves to live only after all of the following exist:

1. written provider access and production credentials;
2. structured quote/cart schema and server-side idempotency;
3. authoritative price/expiry recheck immediately before purchase;
4. payment/settlement rail mapped to an onchain trusted recipient or provider-approved virtual card;
5. provider webhooks with signature verification and replay protection;
6. cancellation/refund/partial-fulfillment handling;
7. reconciliation between blockchain/card receipt and provider order;
8. fault-injection tests and a restrictive production canary.

Until those conditions are met, the adapter remains search, hosted checkout, sandbox, or disabled.

Private quotes, carts, approvals, orders, and receipts require wallet-session authentication and authenticated AES-256-GCM storage. Approval recipients may reject an exact direct request and open a smaller replacement, or route to the policy workspace to trust the merchant within a wallet-signed limit; an existing signed quote is never silently edited.
