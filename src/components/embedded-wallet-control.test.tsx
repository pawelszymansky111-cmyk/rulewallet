// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddedWalletControl } from "./embedded-wallet-control";

const privy = vi.hoisted(() => ({
  authenticated: true,
  wallets: [] as Array<{ address: string; walletClientType: string }>,
  createWallet: vi.fn(),
  exportWallet: vi.fn(),
  setWalletRecovery: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: privy.authenticated,
    login: privy.login,
    logout: privy.logout,
  }),
  useWallets: () => ({ wallets: privy.wallets, ready: true }),
  useCreateWallet: () => ({ createWallet: privy.createWallet }),
  useExportWallet: () => ({ exportWallet: privy.exportWallet }),
  useSetWalletRecovery: () => ({ setWalletRecovery: privy.setWalletRecovery }),
}));

afterEach(() => cleanup());

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  privy.authenticated = true;
  privy.wallets = [];
  privy.createWallet.mockReset().mockResolvedValue({ address: "0x1111111111111111111111111111111111111111" });
  privy.exportWallet.mockReset().mockResolvedValue(undefined);
  privy.setWalletRecovery.mockReset().mockResolvedValue(undefined);
  privy.login.mockReset();
  privy.logout.mockReset();
});

describe("EmbeddedWalletControl", () => {
  it("creates a wallet and immediately opens the isolated recovery flow", async () => {
    render(<EmbeddedWalletControl />);

    fireEvent.click(screen.getByRole("button", { name: "Create wallet with recovery" }));

    await waitFor(() => expect(privy.createWallet).toHaveBeenCalledWith(undefined));
    await waitFor(() => expect(privy.setWalletRecovery).toHaveBeenCalledOnce());
    expect(screen.getByRole("status").textContent).toContain("recovery flow completed");
  });

  it("opens provider-controlled recovery and export without exposing a secret", async () => {
    const address = "0x2222222222222222222222222222222222222222";
    privy.wallets = [{ address, walletClientType: "privy" }];
    render(<EmbeddedWalletControl />);

    fireEvent.click(screen.getByRole("button", { name: "Set recovery method" }));
    await waitFor(() => expect(privy.setWalletRecovery).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Export securely" }));
    await waitFor(() => expect(privy.exportWallet).toHaveBeenCalledWith({ address }));
    expect(screen.getByText(/RuleWallet cannot read the recovery secret or exported key/)).toBeTruthy();
  });

  it("creates additional role wallets without reopening primary-wallet recovery", async () => {
    privy.wallets = [{ address: "0x3333333333333333333333333333333333333333", walletClientType: "privy" }];
    render(<EmbeddedWalletControl />);

    fireEvent.click(screen.getByRole("button", { name: "Create another wallet" }));

    await waitFor(() => expect(privy.createWallet).toHaveBeenCalledWith({ createAdditional: true }));
    expect(privy.setWalletRecovery).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("secure export before funding");
  });

  it("reports an incomplete recovery separately from a failed creation", async () => {
    privy.setWalletRecovery.mockRejectedValueOnce(new Error("Recovery cancelled"));
    render(<EmbeddedWalletControl />);

    fireEvent.click(screen.getByRole("button", { name: "Create wallet with recovery" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("wallet was created");
    expect(alert.textContent).toContain("Recovery cancelled");
  });
});
