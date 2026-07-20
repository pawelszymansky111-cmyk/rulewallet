# Provider integration guide

RuleWallet distinguishes discovery, quoting, checkout, payment, fulfillment, and reconciliation. A provider is never marked live merely because an API key exists.

## Current adapters

| Adapter | Implemented | Credential still required | Money movement |
| --- | --- | --- | --- |
| Direct onchain | Exact ETH/USDG recipient quotes and V3 onchain policy validation | Verified V3 factory/account plus funded restricted agent | V3 transfer only; no arbitrary calls |
| Duffel Flights | Official test-mode offer request and structured quote | `duffel_test_…` access token | Disabled; test inventory cannot issue real travel |
| Duffel Stays | Official test-mode accommodation suggestion and availability search | `duffel_test_…` token plus Stays access | Disabled; search-stage price is not a final quote or booking |
| Ticketmaster Discovery | Official event search and hosted checkout URL | Discovery API key | Provider-hosted checkout only |
| Shopify | Capability record and sandbox cart | Merchant domain/token plus merchant agreement | Disabled |
| Stripe Issuing | Capability record and policy design | Approved Issuing account, funding, compliance, and webhooks | Disabled |
| Food partner | Interface slot and sandbox data | Authorized ordering partner | Disabled |

## Requirements for a live provider

1. Obtain a provider account and production authorization.
2. Store credentials only in server-side encrypted deployment variables.
3. Implement a structured request and authoritative quote with expiry.
4. Bind the cart to provider, items, merchant, account, asset, amount, chain, recipient, and an intent hash.
5. Re-check the authoritative price immediately before purchase.
6. Map settlement to an exact V3 allowlisted recipient or an approved card/payment rail.
7. Add an idempotency key covering quote, cart, user, and provider order.
8. Verify provider webhooks against their raw body before parsing, enforce timestamp tolerance, atomically reject repeated event IDs, and tolerate out-of-order delivery.
9. Model pending, confirmed, partially fulfilled, failed, cancelled, refunded, and reconciled states separately.
10. Add sandbox contract tests, fault injection, a low-value production canary, and an incident playbook.

## Address verification

RuleWallet does not publish a merchant address unless an authoritative provider source identifies it. A user-entered address may be allowlisted by that user, but the UI labels it “user trusted,” not “official provider.” Provider records expose the official domain, documentation source, last verification timestamp, payment rail, assets, settlement description, automatic-payment support, and refund/cancellation boundary.

## Webhook contract

A future live adapter must verify the raw request body before JSON parsing, check a provider timestamp tolerance, claim a durable event ID, and update an order only through valid forward state transitions. Duplicate or late events are stored for audit but must never duplicate payment or fulfillment. RuleWallet's own outbound alerts use `X-RuleWallet-Timestamp`, `X-RuleWallet-Delivery-Id`, and `X-RuleWallet-Signature`; receivers verify `v1=HMAC-SHA256(timestamp.deliveryId.rawBody)`, enforce a five-minute window, and persist delivery IDs atomically.
