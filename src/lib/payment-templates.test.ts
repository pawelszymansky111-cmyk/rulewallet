import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import { getPaymentTemplate, paymentTemplates } from "./payment-templates";

describe("paymentTemplates", () => {
  it("provides every public launch use case", () => {
    expect(paymentTemplates.map((template) => template.id)).toEqual([
      "payroll",
      "subscription",
      "contractor",
      "allowance",
    ]);
  });

  it("keeps every template compatible with the testnet scheduler", () => {
    for (const template of paymentTemplates) {
      expect([24, 168]).toContain(template.cadenceHours);
      expect(parseEther(template.amountEth)).toBeGreaterThan(BigInt(0));
      expect(template.name.length).toBeGreaterThanOrEqual(3);
      expect(template.name.length).toBeLessThanOrEqual(48);
    }
  });

  it("returns a template by stable id", () => {
    expect(getPaymentTemplate("allowance")?.cadenceHours).toBe(24);
  });
});
