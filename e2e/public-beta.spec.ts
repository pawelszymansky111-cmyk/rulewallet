import { expect, test } from "@playwright/test";

test("the start page explains both modes and keeps the console separate", async ({ page }) => {
  await page.goto("/start");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Understand RuleWallet");
  await expect(page.getByText("Every feature, explained in everyday language.")).toBeVisible();
  await expect(page.getByText("The same features with contract and operator terms.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Try the demo/ })).toHaveAttribute("href", "/demo");
  const consoleLinks = page.getByRole("link", { name: /Open console in new tab/ });
  await expect(consoleLinks).toHaveCount(2);
  await expect(consoleLinks.first()).toHaveAttribute("target", "_blank");
  await expect(consoleLinks.last()).toHaveAttribute("target", "_blank");
});

test("the command center exposes accounts, purchasing, providers, and approvals", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tell RuleWallet what to buy");
  await expect(page.getByText("01 · Accounts")).toBeVisible();
  await expect(page.getByText("02 · Agent request", { exact: true })).toBeVisible();
  await expect(page.getByText("03 · Providers")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What is happening now" })).toBeVisible();
  await expect(page.getByText("Upcoming recurring payment")).toBeVisible();
  await expect(page.getByText("Pending approvals")).toBeVisible();
  await expect(page.getByText("Confirmed public receipts")).toBeVisible();
  await expect(page.getByText("Blocked or failed attempts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause automatic merchant payments" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoke merchant" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Needs my approval/ })).toHaveAttribute("href", "/approvals");
  await expect(page.getByRole("link", { name: /Technical console/ })).toHaveAttribute("target", "_blank");
  await expect(page.getByText(/Quotes are sandbox-only/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("the guided demo and approval inbox clearly separate testnet from signatures", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("bounded autonomy working onchain");
  await expect(page.getByText(/Testnet ETH has no value/)).toBeVisible();

  await page.goto("/approvals");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Review exact purchase requests");
  await expect(page.getByText(/Connect the account owner/).first()).toBeVisible();
});

test("provider status never presents sandbox adapters as real purchasing", async ({ request }) => {
  const response = await request.get("/api/commerce/providers");
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as {
    providers: Array<{ mode: string; canPurchase: boolean; handlesRealFunds: boolean }>;
  };
  expect(body.providers.length).toBeGreaterThan(0);
  for (const provider of body.providers) {
    if (provider.mode !== "live") {
      expect(provider.canPurchase).toBe(false);
      expect(provider.handlesRealFunds).toBe(false);
    }
  }
});

test("an approved direct order can prefill an exact one-execution mainnet authorization", async ({ page }) => {
  const intentHash = `0x${"1".repeat(64)}`;
  await page.goto(`/mainnet?name=Order%20demo&account=0x0000000000000000000000000000000000000001&recipient=0x0000000000000000000000000000000000000002&amount=25&asset=USDG&category=0&intentHash=${intentHash}&maxExecutions=1`);
  await expect(page.getByLabel("Strategy name")).toHaveValue("Order demo");
  await expect(page.getByLabel("V3 account")).toHaveValue("0x0000000000000000000000000000000000000001");
  await expect(page.getByLabel("Trusted merchant")).toHaveValue("0x0000000000000000000000000000000000000002");
  await expect(page.getByLabel("Existing commerce intent hash (optional)")).toHaveValue(intentHash);
  await expect(page.getByLabel("Max executions")).toHaveValue("1");
});
