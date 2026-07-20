import { afterEach, describe, expect, it, vi } from "vitest";
import { createProviderQuote, createSandboxQuote, listCommerceProviders } from "./commerce-providers";

afterEach(() => {
  delete process.env.DUFFEL_ACCESS_TOKEN;
  delete process.env.TICKETMASTER_API_KEY;
  vi.restoreAllMocks();
});

describe("commerce provider registry", () => {
  it("never presents a sandbox adapter as a real-funds purchase path", () => {
    for (const provider of listCommerceProviders()) {
      if (provider.mode === "sandbox") {
        expect(provider.handlesRealFunds).toBe(false);
        expect(provider.canPurchase).toBe(false);
      }
    }
  });

  it("creates an expiring, explicitly non-purchasable sandbox quote", () => {
    const now = new Date("2026-07-20T10:00:00.000Z");
    const quote = createSandboxQuote(
      {
        providerId: "duffel-flights",
        category: "travel",
        query: "Warsaw to London tomorrow",
        asset: "USDG",
        idempotencyKey: "4709aa74-c58d-4e5e-931a-e5d392222571",
      },
      now,
    );
    expect(quote.providerMode).toBe("sandbox");
    expect(quote.purchaseAvailable).toBe(false);
    expect(quote.sourceReference).toContain("4709aa74");
    expect(Date.parse(quote.expiresAt) - now.getTime()).toBe(600_000);
  });

  it("requires an exact EVM recipient for direct onchain quotes", () => {
    expect(() =>
      createSandboxQuote({
        providerId: "direct-onchain",
        category: "direct",
        query: "Pay invoice 42",
        asset: "USDG",
        idempotencyKey: "93a9fd7b-faae-4f53-beb4-fc2013d583bd",
      }),
    ).toThrow("exact recipient");
  });

  it("maps an official Duffel test offer without claiming a real booking", async () => {
    process.env.DUFFEL_ACCESS_TOKEN = "duffel_test_example";
    const requestFetch = vi.fn(async () => new Response(JSON.stringify({ data: {
      id: "orq_1",
      offers: [{
        id: "off_1", total_amount: "123.45", total_currency: "USD",
        expires_at: "2026-08-03T12:30:00.000Z", owner: { name: "Duffel Airways" },
        slices: [{ segments: [{ marketing_carrier_flight_number: "101" }] }],
      }],
    } }), { status: 200 }));
    const quote = await createProviderQuote({
      providerId: "duffel-flights", category: "travel", query: "WAW to LHR",
      asset: "USDG", idempotencyKey: "80a6e4ce-83f8-4e08-a9ef-d59e95290555",
      travel: { origin: "WAW", destination: "LHR", departureDate: "2026-08-03", passengers: 1, cabinClass: "economy" },
    }, new Date("2026-07-20T10:00:00.000Z"), requestFetch as typeof fetch);
    expect(quote.amountMinor).toBe("123450000");
    expect(quote.sourceReference).toBe("duffel-test:off_1");
    expect(quote.purchaseAvailable).toBe(false);
    expect(quote.disclosure).toContain("no real ticket");
  });

  it("maps Ticketmaster discovery to an official hosted checkout link", async () => {
    process.env.TICKETMASTER_API_KEY = "test-key";
    const requestFetch = vi.fn(async () => new Response(JSON.stringify({ _embedded: { events: [{
      id: "event-1", name: "Example Concert", url: "https://www.ticketmaster.com/example",
      priceRanges: [{ min: 49.5, currency: "USD" }],
    }] } }), { status: 200 }));
    const quote = await createProviderQuote({
      providerId: "ticketmaster-discovery", category: "tickets", query: "concert",
      asset: "USDG", idempotencyKey: "e34a2d8a-05b0-488d-bf73-7ec06bc6332e",
    }, new Date("2026-07-20T10:00:00.000Z"), requestFetch as typeof fetch);
    expect(quote.amountMinor).toBe("49500000");
    expect(quote.checkoutUrl).toBe("https://www.ticketmaster.com/example");
    expect(quote.purchaseAvailable).toBe(false);
  });
});
