import type {
  CommerceProvider,
  CommerceQuote,
  QuoteRequest,
} from "./commerce-types";

type ProviderDefinition = Omit<CommerceProvider, "mode" | "canQuote" | "canPurchase" | "handlesRealFunds"> & {
  configured: () => boolean;
  sandboxAvailable: boolean;
  livePurchaseAvailable: boolean;
};

const definitions: ProviderDefinition[] = [
  {
    id: "direct-onchain",
    name: "Direct stablecoin payment",
    category: "direct",
    rail: "direct-onchain",
    description: "Pay an exact trusted EVM recipient from a RuleWallet account.",
    officialDomain: "docs.robinhood.com",
    paymentAssets: ["ETH", "USDG"],
    settlement: "Exact user-allowlisted recipient; no address is labelled official by RuleWallet.",
    verificationSource: "https://docs.robinhood.com/chain/contracts/",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "not-applicable",
    cancellations: "not-applicable",
    documentationUrl: "https://docs.robinhood.com/crypto/robinhood-chain/",
    configured: () => true,
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "Testnet is operational. Mainnet needs a deployed V3 factory and a user-signed account setup.",
  },
  {
    id: "duffel-flights",
    name: "Duffel Flights",
    category: "travel",
    rail: "provider-api",
    description: "Search flight offers and prepare booking orders through Duffel.",
    officialDomain: "duffel.com",
    paymentAssets: ["USDG"],
    settlement: "Duffel API order/payment flow; no onchain settlement address is published.",
    verificationSource: "https://duffel.com/docs/api/overview/test-mode/duffel-airways",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "not-integrated",
    cancellations: "not-integrated",
    credential: "DUFFEL_ACCESS_TOKEN",
    documentationUrl: "https://duffel.com/docs/guides/getting-started-with-flights",
    configured: () => Boolean(process.env.DUFFEL_ACCESS_TOKEN),
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "Duffel test mode only in this release; it cannot spend real funds or issue real tickets.",
  },
  {
    id: "duffel-stays",
    name: "Duffel Stays",
    category: "travel",
    rail: "provider-api",
    description: "Search accommodation availability and prices through Duffel Stays.",
    officialDomain: "duffel.com",
    paymentAssets: ["USDG"],
    settlement: "Duffel Stays quote/booking flow; no onchain settlement address is published.",
    verificationSource: "https://duffel.com/docs/api/v2/search/stays-search",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "not-integrated",
    cancellations: "not-integrated",
    credential: "DUFFEL_ACCESS_TOKEN",
    documentationUrl: "https://duffel.com/docs/guides/getting-started-with-stays",
    configured: () => Boolean(process.env.DUFFEL_ACCESS_TOKEN),
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "Duffel Stays test search only. Booking needs separate Stays access and a complete provider payment, guest-data, confirmation, cancellation, and reconciliation integration.",
  },
  {
    id: "ticketmaster-discovery",
    name: "Ticketmaster Discovery",
    category: "tickets",
    rail: "hosted-checkout",
    description: "Search official event inventory and continue to the provider checkout.",
    officialDomain: "ticketmaster.com",
    paymentAssets: ["USDG"],
    settlement: "Ticketmaster-hosted checkout; RuleWallet does not receive a payment address.",
    verificationSource: "https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "provider-managed",
    cancellations: "provider-managed",
    credential: "TICKETMASTER_API_KEY",
    documentationUrl: "https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/",
    configured: () => Boolean(process.env.TICKETMASTER_API_KEY),
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "Discovery supports event search, not autonomous ticket purchase; checkout stays provider-hosted.",
  },
  {
    id: "shopify-storefront",
    name: "Shopify Storefront",
    category: "shopping",
    rail: "hosted-checkout",
    description: "Create provider carts and continue to a merchant-hosted checkout URL.",
    officialDomain: "shopify.dev",
    paymentAssets: ["USDG"],
    settlement: "Merchant-specific Shopify checkout; no universal settlement address.",
    verificationSource: "https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "provider-managed",
    cancellations: "provider-managed",
    credential: "SHOPIFY_STOREFRONT_DOMAIN",
    documentationUrl: "https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage",
    configured: () => Boolean(process.env.SHOPIFY_STOREFRONT_DOMAIN),
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "A merchant domain and checkout integration are required; RuleWallet never invents an order confirmation.",
  },
  {
    id: "stripe-issuing",
    name: "Stripe Issuing",
    category: "shopping",
    rail: "virtual-card",
    description: "Issue scoped virtual cards and apply card-network spending controls.",
    officialDomain: "stripe.com",
    paymentAssets: ["USDG"],
    settlement: "Stripe Issuing card rail after an approved commercial integration.",
    verificationSource: "https://docs.stripe.com/issuing/cards/virtual",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "not-integrated",
    cancellations: "not-integrated",
    credential: "STRIPE_SECRET_KEY",
    documentationUrl: "https://docs.stripe.com/issuing/cards/virtual",
    configured: () => Boolean(process.env.STRIPE_SECRET_KEY),
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "Sandbox simulation only; live Issuing requires provider approval, compliance, webhooks, and reconciliation.",
  },
  {
    id: "food-partner",
    name: "Food ordering partner",
    category: "food",
    rail: "provider-api",
    description: "A capability slot for an authorized food-ordering API partner.",
    officialDomain: "Not selected",
    paymentAssets: ["USDG"],
    settlement: "No provider or settlement route is configured.",
    verificationSource: "https://rulewallet.vercel.app/docs",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "not-integrated",
    cancellations: "not-integrated",
    configured: () => false,
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "No live provider is connected. The demo produces sandbox carts only.",
  },
  {
    id: "recurring-payments",
    name: "Subscriptions and payroll",
    category: "subscriptions",
    rail: "direct-onchain",
    description: "Prepare recurring direct stablecoin transfers under exact policy limits.",
    officialDomain: "docs.robinhood.com",
    paymentAssets: ["ETH", "USDG"],
    settlement: "Exact user-allowlisted recipient on Robinhood Chain.",
    verificationSource: "https://docs.robinhood.com/chain/contracts/",
    verifiedAt: "2026-07-20T00:00:00.000Z",
    refunds: "not-applicable",
    cancellations: "adapter-supported",
    configured: () => true,
    sandboxAvailable: true,
    livePurchaseAvailable: false,
    automaticPaymentSupported: false,
    disclosure: "Testnet schedules are available; mainnet automation remains gated by the non-exportable signer checks.",
  },
];

export function listCommerceProviders(): CommerceProvider[] {
  return definitions.map((provider) => {
    const configured = provider.configured();
    return {
      id: provider.id,
      name: provider.name,
      category: provider.category,
      rail: provider.rail,
      description: provider.description,
      officialDomain: provider.officialDomain,
      paymentAssets: provider.paymentAssets,
      settlement: provider.settlement,
      verificationSource: provider.verificationSource,
      verifiedAt: provider.verifiedAt,
      refunds: provider.refunds,
      cancellations: provider.cancellations,
      credential: provider.credential,
      documentationUrl: provider.documentationUrl,
      mode: configured ? "sandbox" : provider.sandboxAvailable ? "sandbox" : "credentials-required",
      canQuote: provider.sandboxAvailable || configured,
      canPurchase: configured && provider.livePurchaseAvailable,
      automaticPaymentSupported: configured && provider.automaticPaymentSupported,
      handlesRealFunds: configured && provider.livePurchaseAvailable,
      disclosure: provider.disclosure,
    };
  });
}

export function applyCommerceRuntimeReadiness(
  providers: CommerceProvider[],
  readiness: { directMainnetReady: boolean },
) {
  return providers.map((provider): CommerceProvider => {
    const directRail = provider.id === "direct-onchain" || provider.id === "recurring-payments";
    if (!directRail || !readiness.directMainnetReady) return provider;
    return {
      ...provider,
      mode: "live",
      canPurchase: true,
      automaticPaymentSupported: true,
      handlesRealFunds: true,
      disclosure: "Robinhood Chain mainnet direct payments are available only through the verified V3 factory, exact onchain policies, and protected non-exportable signer.",
    };
  });
}

export function applyDirectQuoteReadiness(
  quote: CommerceQuote,
  readiness: { chainId?: 4663 | 46630; directMainnetReady: boolean },
): CommerceQuote {
  const directRail = quote.providerId === "direct-onchain" || quote.providerId === "recurring-payments";
  if (!directRail || readiness.chainId !== 4663 || !readiness.directMainnetReady) return quote;
  return {
    ...quote,
    providerMode: "live",
    sourceReference: quote.sourceReference.replace(/^sandbox:/, "direct-mainnet:"),
    purchaseAvailable: true,
    disclosure: "Exact Robinhood Chain mainnet payment quote. Payment remains impossible unless the verified V3 account and every onchain rule accept this exact recipient, asset, amount, category, intent, nonce, and expiry.",
  };
}

export function getCommerceProvider(id: string) {
  return listCommerceProviders().find((provider) => provider.id === id);
}

function sandboxAmount(request: QuoteRequest) {
  if (request.exactAmountMinor) return request.exactAmountMinor;
  const normalized = `${request.providerId}:${request.query}`;
  const checksum = [...normalized].reduce((total, character) => total + character.charCodeAt(0), 0);
  if (request.asset === "ETH") {
    return String(BigInt((checksum % 9) + 1) * BigInt("10000000000000"));
  }
  return String(((checksum % 240) + 5) * 1_000_000);
}

export function createSandboxQuote(request: QuoteRequest, now = new Date()): CommerceQuote {
  const provider = getCommerceProvider(request.providerId);
  if (!provider || !provider.canQuote) throw new Error("This provider cannot create quotes.");
  if (
    provider.category !== request.category
      && request.providerId !== "direct-onchain"
      && request.providerId !== "recurring-payments"
  ) {
    throw new Error("The selected provider does not support this purchase category.");
  }
  if ((request.providerId === "direct-onchain" || request.providerId === "recurring-payments") && !request.recipient) {
    throw new Error("Direct onchain quotes require an exact recipient address.");
  }
  if ((request.providerId === "direct-onchain" || request.providerId === "recurring-payments") && !request.exactAmountMinor) {
    throw new Error("Direct onchain quotes require an exact positive amount.");
  }
  if (request.exactAmountMinor && request.providerId !== "direct-onchain" && request.providerId !== "recurring-payments") {
    throw new Error("Provider prices cannot be overwritten; request a new provider quote instead.");
  }
  const amountMinor = sandboxAmount(request);
  return {
    id: crypto.randomUUID(),
    providerId: provider.id,
    providerMode: "sandbox",
    category: request.category,
    asset: request.asset,
    currency: request.asset === "ETH" ? "ETH" : "USD",
    amountMinor,
    lines: [{ id: "sandbox-item", label: request.query, quantity: 1, unitAmountMinor: amountMinor }],
    merchantName: provider.name,
    merchantRecipient: request.recipient,
    summary: `${provider.name}: ${request.query}`,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
    sourceReference: `sandbox:${request.idempotencyKey}`,
    purchaseAvailable: false,
    disclosure: `${provider.disclosure} This quote is deterministic demo data and moves no funds.`,
  };
}

type FetchLike = typeof fetch;

function usdToMicroUnits(value: string) {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) throw new Error("Provider returned an invalid USD amount.");
  return `${match[1]}${(match[2] ?? "").padEnd(6, "0")}`.replace(/^0+(?=\d)/, "");
}

async function duffelTestQuote(request: QuoteRequest, now: Date, requestFetch: FetchLike) {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token?.startsWith("duffel_test_")) return undefined;
  if (!request.travel) throw new Error("Duffel flight search needs origin, destination, departure date, passengers, and cabin class.");
  const response = await requestFetch("https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=10000", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Duffel-Version": "v2",
    },
    body: JSON.stringify({ data: {
      cabin_class: request.travel.cabinClass,
      slices: [{
        origin: request.travel.origin,
        destination: request.travel.destination,
        departure_date: request.travel.departureDate,
      }],
      passengers: Array.from({ length: request.travel.passengers }, () => ({ type: "adult" })),
    } }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json() as {
    data?: { id?: string; offers?: Array<{
      id: string; total_amount: string; total_currency: string; expires_at: string;
      owner?: { name?: string }; slices?: Array<{ segments?: Array<{ marketing_carrier?: { name?: string }; marketing_carrier_flight_number?: string }> }>;
    }> };
    errors?: Array<{ message?: string }>;
  };
  if (!response.ok) throw new Error(payload.errors?.[0]?.message ?? `Duffel returned ${response.status}.`);
  const offer = payload.data?.offers
    ?.filter((item) => item.total_currency === "USD")
    .sort((left, right) => Number(left.total_amount) - Number(right.total_amount))[0];
  if (!offer) throw new Error("Duffel returned no USD-denominated test offers for this search.");
  const flight = offer.slices?.[0]?.segments?.[0];
  const label = `${request.travel.origin} → ${request.travel.destination} · ${request.travel.departureDate}`;
  return {
    id: crypto.randomUUID(),
    providerId: "duffel-flights",
    providerMode: "sandbox",
    category: "travel",
    asset: "USDG",
    currency: "USD",
    amountMinor: usdToMicroUnits(offer.total_amount),
    lines: [{ id: offer.id, label: `${label} · ${request.travel.passengers} passenger${request.travel.passengers === 1 ? "" : "s"}`, quantity: 1, unitAmountMinor: usdToMicroUnits(offer.total_amount) }],
    merchantName: offer.owner?.name ?? flight?.marketing_carrier?.name ?? "Duffel test airline",
    summary: `${label}${flight?.marketing_carrier_flight_number ? ` · flight ${flight.marketing_carrier_flight_number}` : ""}`,
    createdAt: now.toISOString(),
    expiresAt: offer.expires_at,
    sourceReference: `duffel-test:${offer.id}`,
    purchaseAvailable: false,
    disclosure: "Live Duffel test-mode inventory. Prices and schedules are sandbox data; no money is spent and no real ticket is issued.",
  } satisfies CommerceQuote;
}

function duffelHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip",
    "Duffel-Version": "v2",
  };
}

async function duffelStayTestQuote(request: QuoteRequest, now: Date, requestFetch: FetchLike) {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token?.startsWith("duffel_test_")) return undefined;
  if (!request.stay) throw new Error("Duffel Stays search needs check-in, check-out, guests, and rooms.");

  const suggestionsResponse = await requestFetch("https://api.duffel.com/stays/accommodation/suggestions", {
    method: "POST",
    headers: duffelHeaders(token),
    body: JSON.stringify({ data: { query: request.query } }),
    signal: AbortSignal.timeout(10_000),
  });
  const suggestionsPayload = await suggestionsResponse.json() as {
    data?: Array<{ accommodation_id?: string; accommodation_name?: string }>;
    errors?: Array<{ message?: string }>;
  };
  if (!suggestionsResponse.ok) {
    throw new Error(suggestionsPayload.errors?.[0]?.message ?? `Duffel Stays suggestions returned ${suggestionsResponse.status}.`);
  }
  const suggestion = suggestionsPayload.data?.find((item) => item.accommodation_id);
  if (!suggestion?.accommodation_id) throw new Error("Duffel Stays returned no accommodation suggestion for this search.");

  const searchResponse = await requestFetch("https://api.duffel.com/stays/search", {
    method: "POST",
    headers: duffelHeaders(token),
    body: JSON.stringify({ data: {
      rooms: request.stay.rooms,
      accommodation: { ids: [suggestion.accommodation_id], fetch_rates: true },
      check_in_date: request.stay.checkInDate,
      check_out_date: request.stay.checkOutDate,
      guests: Array.from({ length: request.stay.guests }, () => ({ type: "adult" })),
      instant_payment: true,
    } }),
    signal: AbortSignal.timeout(15_000),
  });
  const searchPayload = await searchResponse.json() as {
    data?: { results?: Array<{
      id: string;
      expires_at: string;
      cheapest_rate_total_amount: string;
      cheapest_rate_currency: string;
      accommodation?: { id?: string; name?: string; rating?: number };
    }> };
    errors?: Array<{ message?: string }>;
  };
  if (!searchResponse.ok) {
    throw new Error(searchPayload.errors?.[0]?.message ?? `Duffel Stays returned ${searchResponse.status}.`);
  }
  const result = searchPayload.data?.results
    ?.filter((item) => item.cheapest_rate_currency === "USD")
    .sort((left, right) => Number(left.cheapest_rate_total_amount) - Number(right.cheapest_rate_total_amount))[0];
  if (!result) {
    throw new Error("Duffel Stays returned no USD-denominated test accommodation for this search.");
  }
  const amountMinor = usdToMicroUnits(result.cheapest_rate_total_amount);
  const accommodationName = result.accommodation?.name ?? suggestion.accommodation_name ?? "Duffel test accommodation";
  const label = `${accommodationName} · ${request.stay.checkInDate} → ${request.stay.checkOutDate}`;
  return {
    id: crypto.randomUUID(),
    providerId: "duffel-stays",
    providerMode: "sandbox",
    category: "travel",
    asset: "USDG",
    currency: "USD",
    amountMinor,
    lines: [{
      id: result.id,
      label: `${label} · ${request.stay.rooms} room${request.stay.rooms === 1 ? "" : "s"} · ${request.stay.guests} guest${request.stay.guests === 1 ? "" : "s"}`,
      quantity: 1,
      unitAmountMinor: amountMinor,
    }],
    merchantName: accommodationName,
    summary: `${label}${result.accommodation?.rating ? ` · ${result.accommodation.rating}-star` : ""}`,
    createdAt: now.toISOString(),
    expiresAt: result.expires_at,
    sourceReference: `duffel-stays-test:${result.id}`,
    purchaseAvailable: false,
    disclosure: "Live Duffel Stays test-mode availability. This is the cheapest search-stage price, not a final booking quote; no money is spent and no accommodation is booked.",
  } satisfies CommerceQuote;
}

async function ticketmasterDiscoveryQuote(request: QuoteRequest, now: Date, requestFetch: FetchLike) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return undefined;
  const url = new URL("https://app.ticketmaster.com/discovery/v2/events.json");
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("keyword", request.query);
  url.searchParams.set("size", "10");
  url.searchParams.set("sort", "date,asc");
  const response = await requestFetch(url, { signal: AbortSignal.timeout(10_000) });
  const payload = await response.json() as {
    _embedded?: { events?: Array<{
      id: string; name: string; url?: string; dates?: { start?: { dateTime?: string; localDate?: string } };
      priceRanges?: Array<{ min?: number; currency?: string }>;
    }> };
    fault?: { faultstring?: string };
  };
  if (!response.ok) throw new Error(payload.fault?.faultstring ?? `Ticketmaster returned ${response.status}.`);
  const event = payload._embedded?.events?.find((item) => item.priceRanges?.some((price) => price.currency === "USD" && typeof price.min === "number"));
  const price = event?.priceRanges?.find((item) => item.currency === "USD" && typeof item.min === "number");
  if (!event || !price?.min) throw new Error("No event with a public USD starting price was found.");
  const priceText = price.min.toFixed(2);
  return {
    id: crypto.randomUUID(), providerId: "ticketmaster-discovery", providerMode: "sandbox",
    category: "tickets", asset: "USDG", currency: "USD", amountMinor: usdToMicroUnits(priceText),
    lines: [{ id: event.id, label: event.name, quantity: 1, unitAmountMinor: usdToMicroUnits(priceText) }],
    merchantName: "Ticketmaster", summary: `${event.name} · from $${priceText}`,
    createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
    sourceReference: `ticketmaster:${event.id}`, checkoutUrl: event.url,
    purchaseAvailable: false,
    disclosure: "Live Ticketmaster Discovery data. Availability and price must be rechecked on the official hosted checkout; RuleWallet does not claim a ticket purchase.",
  } satisfies CommerceQuote;
}

export async function createProviderQuote(
  request: QuoteRequest,
  now = new Date(),
  requestFetch: FetchLike = fetch,
): Promise<CommerceQuote> {
  if (request.providerId === "duffel-flights") {
    return await duffelTestQuote(request, now, requestFetch) ?? createSandboxQuote(request, now);
  }
  if (request.providerId === "duffel-stays") {
    return await duffelStayTestQuote(request, now, requestFetch) ?? createSandboxQuote(request, now);
  }
  if (request.providerId === "ticketmaster-discovery") {
    return await ticketmasterDiscoveryQuote(request, now, requestFetch) ?? createSandboxQuote(request, now);
  }
  return createSandboxQuote(request, now);
}
