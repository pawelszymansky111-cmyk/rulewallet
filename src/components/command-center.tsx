"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import {
  Activity,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileCheck2,
  Gauge,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Plane,
  ReceiptText,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Ticket,
  Utensils,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { parseUnits } from "viem";
import { EmbeddedWalletGate } from "@/components/embedded-wallet-gate";
import { V3AccountManager } from "@/components/v3-account-manager";
import { V3AccountDashboard } from "@/components/v3-account-dashboard";
import { V3PolicyWorkspace } from "@/components/v3-policy-workspace";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CommerceCategory,
  ApprovalRequest,
  CommerceProvider,
  CommerceQuote,
  PurchaseOrder,
} from "@/lib/commerce-types";

type ProviderResponse = {
  providers: CommerceProvider[];
  storageConfigured: boolean;
  sessionConfigured: boolean;
  encryptionConfigured: boolean;
  livePurchasesEnabled: boolean;
  disclosure: string;
};

type QuoteResponse = {
  quote: CommerceQuote;
  persisted: boolean;
  disclosure?: string;
};

type OrderResponse = {
  order: PurchaseOrder;
  paymentBroadcast: false;
  nextStep: string;
};

type CommerceSessionResponse = {
  authenticated: boolean;
  address?: string;
  message?: string;
  expiresAt?: string | number;
};

type PrivateOperations = {
  orders: PurchaseOrder[];
  approvals: ApprovalRequest[];
};

type PublicOperations = {
  nextScheduledRun?: string;
  confirmed: number;
  blocked: number;
  failed: number;
  source: "mainnet" | "testnet-demo";
};

const categoryIcons = {
  travel: Plane,
  food: Utensils,
  tickets: Ticket,
  shopping: ShoppingBag,
  subscriptions: Clock3,
  payroll: CircleDollarSign,
  direct: Send,
} satisfies Record<CommerceCategory, typeof Plane>;

const quickIntents = [
  { providerId: "duffel-flights", category: "travel" as const, icon: Plane, label: "Find a flight", query: "Warsaw to London, next Friday, economy" },
  { providerId: "duffel-stays", category: "travel" as const, icon: Building2, label: "Find a hotel", query: "New York hotel" },
  { providerId: "food-partner", category: "food" as const, icon: Utensils, label: "Order food", query: "Vegetarian dinner delivered tonight" },
  { providerId: "ticketmaster-discovery", category: "tickets" as const, icon: Ticket, label: "Buy tickets", query: "Two concert tickets in Warsaw this month" },
  { providerId: "shopify-storefront", category: "shopping" as const, icon: ShoppingBag, label: "Shop online", query: "USB-C travel charger under $60" },
];

const commerceCategories: CommerceCategory[] = [
  "travel", "food", "tickets", "shopping", "subscriptions", "payroll", "direct",
];

const onchainCategory: Record<CommerceCategory, number> = {
  direct: 0,
  travel: 1,
  food: 2,
  tickets: 3,
  shopping: 4,
  subscriptions: 5,
  payroll: 6,
};

export type CommandCenterInitialIntent = {
  providerId?: string;
  category?: string;
  query?: string;
  recipient?: string;
  policyAccount?: string;
  asset?: string;
  amount?: string;
};

function parseError(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`);
  return data;
}

function formatAssetAmount(quote: CommerceQuote) {
  const decimals = quote.asset === "USDG" ? 6 : 18;
  const atomic = quote.amountMinor.padStart(decimals + 1, "0");
  const whole = atomic.slice(0, -decimals);
  const fraction = atomic.slice(-decimals).replace(/0+$/, "").slice(0, quote.asset === "USDG" ? 2 : 6);
  return `${whole}${fraction ? `.${fraction}` : ""} ${quote.asset}`;
}

function decimalAssetAmount(quote: CommerceQuote) {
  return formatAssetAmount(quote).split(" ")[0];
}

function shortAddress(value: string) {
  return value ? `${value.slice(0, 7)}…${value.slice(-5)}` : "Not selected";
}

export function CommandCenter({
  embeddedWalletsConfigured,
  initialIntent = {},
}: {
  embeddedWalletsConfigured: boolean;
  initialIntent?: CommandCenterInitialIntent;
}) {
  const { mode } = useExperienceMode();
  const pro = mode === "pro";
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [providerId, setProviderId] = useState(initialIntent.providerId ?? "duffel-flights");
  const [category, setCategory] = useState<CommerceCategory>(
    commerceCategories.includes(initialIntent.category as CommerceCategory)
      ? initialIntent.category as CommerceCategory
      : "travel",
  );
  const [query, setQuery] = useState(initialIntent.query ?? "Warsaw to London, next Friday, economy");
  const [recipient, setRecipient] = useState(initialIntent.recipient ?? "");
  const [policyAccount, setPolicyAccount] = useState(initialIntent.policyAccount ?? "");
  const [asset, setAsset] = useState<"USDG" | "ETH">(initialIntent.asset === "ETH" ? "ETH" : "USDG");
  const [directAmount, setDirectAmount] = useState(initialIntent.amount ?? "10");
  const [origin, setOrigin] = useState("WAW");
  const [destination, setDestination] = useState("LHR");
  const [departureDate, setDepartureDate] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  const [passengers, setPassengers] = useState("1");
  const [cabinClass, setCabinClass] = useState<"economy" | "premium_economy" | "business" | "first">("economy");
  const [checkInDate, setCheckInDate] = useState(() => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  const [checkOutDate, setCheckOutDate] = useState(() => new Date(Date.now() + 17 * 86_400_000).toISOString().slice(0, 10));
  const [stayGuests, setStayGuests] = useState("2");
  const [stayRooms, setStayRooms] = useState("1");

  const providersQuery = useQuery({
    queryKey: ["commerce-providers"],
    queryFn: () => jsonRequest<ProviderResponse>("/api/commerce/providers"),
    staleTime: 30_000,
  });

  const quoteMutation = useMutation({
    mutationFn: () => {
      const directRail = providerId === "direct-onchain" || providerId === "recurring-payments";
      return jsonRequest<QuoteResponse>("/api/commerce/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          category,
          query,
          asset,
          chainId: chainId === 4663 || chainId === 46630 ? chainId : undefined,
          account: policyAccount || undefined,
          recipient: directRail ? recipient : undefined,
          exactAmountMinor: directRail ? parseUnits(directAmount, asset === "USDG" ? 6 : 18).toString() : undefined,
          travel: providerId === "duffel-flights" ? {
            origin: origin.toUpperCase(),
            destination: destination.toUpperCase(),
            departureDate,
            passengers: Number(passengers),
            cabinClass,
          } : undefined,
          stay: providerId === "duffel-stays" ? {
            checkInDate,
            checkOutDate,
            guests: Number(stayGuests),
            rooms: Number(stayRooms),
          } : undefined,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
    },
  });

  async function ensureCommerceSession(owner: string) {
    const challenge = await jsonRequest<CommerceSessionResponse>(`/api/commerce/session?address=${owner}`);
    if (challenge.authenticated) return;
    if (!challenge.message) throw new Error("The commerce login challenge was incomplete.");
    const signature = await signMessageAsync({ message: challenge.message });
    await jsonRequest<CommerceSessionResponse>("/api/commerce/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: owner, message: challenge.message, signature }),
    });
  }

  const privateOperationsQuery = useQuery({
    queryKey: ["command-private-operations", address, policyAccount],
    enabled: false,
    queryFn: async (): Promise<PrivateOperations> => {
      if (!address) throw new Error("Connect the owner wallet before unlocking private activity.");
      await ensureCommerceSession(address);
      const suffix = new URLSearchParams({ owner: address });
      if (policyAccount) suffix.set("account", policyAccount);
      const [ordersResponse, approvalsResponse] = await Promise.all([
        jsonRequest<{ orders: PurchaseOrder[] }>(`/api/commerce/orders?${suffix}`),
        jsonRequest<{ approvals: ApprovalRequest[] }>(`/api/commerce/approvals?owner=${address}`),
      ]);
      return { orders: ordersResponse.orders, approvals: approvalsResponse.approvals };
    },
  });

  const publicOperationsQuery = useQuery({
    queryKey: ["command-public-operations", chainId, policyAccount],
    queryFn: async (): Promise<PublicOperations> => {
      if (chainId === 4663) {
        const [strategiesResponse, activityResponse] = await Promise.all([
          jsonRequest<{ strategies: Array<{ account: string; active: boolean; nextRunAt: string }> }>("/api/mainnet/strategies"),
          jsonRequest<{ executions: Array<{ account: string; status: string }> }>("/api/mainnet/activity"),
        ]);
        const selected = policyAccount.toLowerCase();
        const strategies = strategiesResponse.strategies.filter(
          (strategy) => (!selected || strategy.account.toLowerCase() === selected) && strategy.active,
        );
        const executions = activityResponse.executions.filter(
          (execution) => !selected || execution.account.toLowerCase() === selected,
        );
        return {
          nextScheduledRun: strategies.map((strategy) => strategy.nextRunAt).sort()[0],
          confirmed: executions.filter((execution) => execution.status === "confirmed" || execution.status === "late_confirmed").length,
          blocked: executions.filter((execution) => execution.status === "blocked").length,
          failed: executions.filter((execution) => execution.status === "failed" || execution.status === "timed_out").length,
          source: "mainnet",
        };
      }
      const metrics = await jsonRequest<{
        automation: {
          nextScheduledRun?: string;
          confirmedExecutions: number;
          blockedExecutions: number;
          failedExecutions: number;
        };
      }>("/api/public/metrics");
      return {
        nextScheduledRun: metrics.automation.nextScheduledRun,
        confirmed: metrics.automation.confirmedExecutions,
        blocked: metrics.automation.blockedExecutions,
        failed: metrics.automation.failedExecutions,
        source: "testnet-demo",
      };
    },
    staleTime: 15_000,
  });

  const orderMutation = useMutation({
    mutationFn: async (quote: CommerceQuote) => {
      const selectedAccount = policyAccount || address;
      if (!selectedAccount || !address) throw new Error("Connect an owner wallet and enter a V3 account.");
      if (chainId !== 4663 && chainId !== 46630) {
        throw new Error("Switch the owner wallet to Robinhood Chain mainnet or testnet first.");
      }
      await ensureCommerceSession(address);
      return jsonRequest<OrderResponse>("/api/commerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          account: selectedAccount,
          owner: address,
          chainId,
        }),
      });
    },
  });

  const providers = providersQuery.data?.providers ?? [];
  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const quote = quoteMutation.data?.quote;
  const order = orderMutation.data?.order;
  const privateOrders = privateOperationsQuery.data?.orders ?? [];
  const privateApprovals = privateOperationsQuery.data?.approvals ?? [];
  const pendingApprovalCount = privateApprovals.filter((approval) => approval.status === "pending").length
    + (order?.status === "awaiting-approval" && !privateOrders.some((item) => item.id === order.id) ? 1 : 0);
  const recentOrder = order ?? privateOrders[0];
  const publicOperations = publicOperationsQuery.data;
  const authorizationUrl = recentOrder?.status === "approved"
    && recentOrder.paymentRail === "direct-onchain"
    && recentOrder.cart.chainId === 4663
    && recentOrder.cart.quote.merchantRecipient
    ? `/mainnet?${new URLSearchParams({
        name: `Order ${recentOrder.id.slice(0, 8)}`,
        account: recentOrder.cart.account,
        recipient: recentOrder.cart.quote.merchantRecipient,
        amount: decimalAssetAmount(recentOrder.cart.quote),
        asset: recentOrder.cart.quote.asset,
        category: String(onchainCategory[recentOrder.cart.quote.category]),
        intentHash: recentOrder.cart.intentHash,
        maxExecutions: "1",
      })}`
    : undefined;

  function chooseIntent(intent: (typeof quickIntents)[number]) {
    setCategory(intent.category);
    setQuery(intent.query);
    setProviderId(intent.providerId);
  }

  function chooseProvider(value: string) {
    setProviderId(value);
    const provider = providers.find((item) => item.id === value);
    if (provider) setCategory(provider.category);
  }

  return (
    <main className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8 lg:py-8">
      <aside className="h-fit rounded-2xl border border-primary/20 bg-white/85 p-3 shadow-sm lg:sticky lg:top-24">
        <p className="px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
          Command Center
        </p>
        <nav aria-label="Command Center" className="space-y-1 text-sm">
          {[
            ["#overview", Gauge, pro ? "Overview" : "Home"],
            ["#accounts", WalletCards, pro ? "Accounts" : "My wallets"],
            ["#agent", Bot, pro ? "Purchase intents" : "Ask RuleWallet"],
            ["#merchants", Store, pro ? "Provider adapters" : "Services"],
            ["/approvals", FileCheck2, pro ? "Approval queue" : "Needs my approval"],
            ["/activity", Activity, pro ? "Execution receipts" : "Payment history"],
          ].map(([href, Icon, label]) => (
            <Link
              key={String(href)}
              href={String(href)}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-muted-foreground transition hover:bg-primary/[0.07] hover:text-foreground"
            >
              <span className="flex items-center gap-2.5"><Icon className="size-4" />{String(label)}</span>
              <ChevronRight className="size-3" />
            </Link>
          ))}
        </nav>
        <div className="mt-3 border-t border-primary/15 pt-3">
          <a
            href="/app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-primary hover:bg-primary/[0.07]"
          >
            Technical console <ExternalLink className="size-3" />
          </a>
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <section id="overview" className="command-hero overflow-hidden rounded-3xl border border-primary/20 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <Badge className="border-primary/20 bg-white text-primary" variant="outline">
                <ShieldCheck /> Policy-controlled spending
              </Badge>
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                {pro ? "Authorize intent. Enforce policy. Reconcile execution." : "Tell RuleWallet what to buy. Stay in control."}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {pro
                  ? "Create bounded commerce intents across direct onchain and provider rails. Every payment remains bound to account, merchant, category, time, amount, nonce, and expiry."
                  : "Create a request for travel, food, tickets, shopping, or a direct payment. Small trusted purchases can run automatically; anything unusual waits for you."}
              </p>
            </div>
            <div className="grid min-w-[250px] grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-primary/15 bg-white/85 p-3">
                <p className="text-xs text-muted-foreground">Owner wallet</p>
                <p className="mt-1 font-mono font-medium">{address ? shortAddress(address) : "Not connected"}</p>
              </div>
              <div className="rounded-xl border border-primary/15 bg-white/85 p-3">
                <p className="text-xs text-muted-foreground">Live purchasing</p>
                <p className="mt-1 font-medium text-amber-700">Gated</p>
              </div>
            </div>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [LockKeyhole, pro ? "Policy engine" : "Hard limits", "V3 contract-ready"],
              [FileCheck2, pro ? "Approval inbox" : "Ask me when needed", "EIP-712 signed"],
              [ReceiptText, pro ? "Reconciliation" : "Readable receipts", "No fake confirmations"],
              [KeyRound, pro ? "Signer boundary" : "Keys stay protected", "Mainnet automation gated"],
            ].map(([Icon, title, value]) => (
              <div key={String(title)} className="rounded-2xl border border-primary/15 bg-white/80 p-4">
                <Icon className="size-4 text-primary" />
                <p className="mt-3 text-sm font-medium">{String(title)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{String(value)}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="operations-heading" className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Live operations</p>
              <h2 id="operations-heading" className="mt-2 text-2xl font-semibold tracking-tight">{pro ? "Execution and approval state" : "What is happening now"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void publicOperationsQuery.refetch()} disabled={publicOperationsQuery.isFetching}>
                {publicOperationsQuery.isFetching ? <LoaderCircle className="animate-spin" /> : <Activity />} Refresh public receipts
              </Button>
              <Button variant="outline" size="sm" onClick={() => void privateOperationsQuery.refetch()} disabled={!address || privateOperationsQuery.isFetching}>
                {privateOperationsQuery.isFetching ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />} Unlock my orders
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-4"><Clock3 className="size-4 text-primary" /><p className="mt-3 text-xs text-muted-foreground">Upcoming recurring payment</p><p className="mt-1 font-medium">{publicOperations?.nextScheduledRun ? new Date(publicOperations.nextScheduledRun).toLocaleString() : "None scheduled"}</p><p className="mt-1 text-[11px] text-muted-foreground">{publicOperations?.source === "mainnet" ? "Selected mainnet account" : "Public testnet demo"}</p></CardContent></Card>
            <Card><CardContent className="p-4"><FileCheck2 className="size-4 text-primary" /><p className="mt-3 text-xs text-muted-foreground">Pending approvals</p><p className="mt-1 text-2xl font-semibold">{privateOperationsQuery.data || order ? pendingApprovalCount : "—"}</p><Link href="/approvals" className="mt-1 inline-flex text-xs text-primary">Open inbox →</Link></CardContent></Card>
            <Card><CardContent className="p-4"><ReceiptText className="size-4 text-primary" /><p className="mt-3 text-xs text-muted-foreground">Confirmed public receipts</p><p className="mt-1 text-2xl font-semibold">{publicOperations?.confirmed ?? "—"}</p><Link href="/activity" className="mt-1 inline-flex text-xs text-primary">View receipts →</Link></CardContent></Card>
            <Card><CardContent className="p-4"><XCircle className="size-4 text-amber-700" /><p className="mt-3 text-xs text-muted-foreground">Blocked or failed attempts</p><p className="mt-1 text-2xl font-semibold">{publicOperations ? publicOperations.blocked + publicOperations.failed : "—"}</p><p className="mt-1 text-[11px] text-muted-foreground">Failures never become approvals automatically.</p></CardContent></Card>
          </div>
          {recentOrder ? (
            <Alert className="border-primary/25 bg-primary/[0.04]">
              <ShoppingBag />
              <AlertTitle>Latest private order · {recentOrder.status}</AlertTitle>
              <AlertDescription>
                <span>{recentOrder.cart.quote.summary} · {formatAssetAmount(recentOrder.cart.quote)}. Private history is shown only after the connected owner unlocks a short-lived session.</span>
                {authorizationUrl ? <Button asChild size="sm" className="mt-3"><Link href={authorizationUrl}>Prepare exact payment authorization <ArrowRight /></Link></Button> : null}
              </AlertDescription>
            </Alert>
          ) : privateOperationsQuery.data ? (
            <p className="rounded-xl border border-dashed border-primary/20 p-4 text-sm text-muted-foreground">No private orders exist for this owner and selected account.</p>
          ) : (
            <p className="rounded-xl border border-dashed border-primary/20 p-4 text-sm text-muted-foreground">Unlock private activity with the connected owner wallet to load order and approval history. The login signature cannot move funds.</p>
          )}
          {privateOperationsQuery.error ? <Alert variant="destructive"><XCircle /><AlertTitle>Private activity unavailable</AlertTitle><AlertDescription>{parseError(privateOperationsQuery.error)}</AlertDescription></Alert> : null}
        </section>

        <section id="accounts" className="scroll-mt-24 space-y-4">
          <div>
            <p className="eyebrow">01 · Accounts</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {pro ? "Owner identities and policy accounts" : "Choose how you want to sign in"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Connect a wallet you already use or create an embedded passkey wallet. One owner can deploy
              multiple named V3 accounts for shopping, travel, subscriptions, or teams.
            </p>
          </div>
          <EmbeddedWalletGate configured={embeddedWalletsConfigured} />
          <V3AccountDashboard accountInput={policyAccount} onAccountInputChange={setPolicyAccount} />
          <V3AccountManager onAccountCreated={setPolicyAccount} />
          <V3PolicyWorkspace
            selectedAccount={policyAccount}
            onSelectedAccountChange={setPolicyAccount}
            initialChainId={chainId === 4663 ? 4663 : 46630}
            initialMerchant={initialIntent.recipient}
            initialCategory={onchainCategory[category]}
            initialAssetSymbol={asset}
            initialPerTransaction={initialIntent.amount}
          />
        </section>

        <section id="agent" className="scroll-mt-24">
          <Card className="border-primary/25 shadow-[0_22px_70px_oklch(0.4_0.1_145/0.09)]">
            <CardHeader>
              <p className="eyebrow">02 · Agent request</p>
              <CardTitle className="text-2xl">{pro ? "Create a bounded purchase intent" : "What should RuleWallet do?"}</CardTitle>
              <CardDescription>
                Quotes are sandbox-only until a provider explicitly reports live purchase capability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quickIntents.map((intent) => {
                  const Icon = intent.icon;
                  return (
                    <button
                      key={intent.providerId}
                      type="button"
                      onClick={() => chooseIntent(intent)}
                      className={`rounded-xl border p-4 text-left transition ${providerId === intent.providerId ? "border-primary/45 bg-primary/[0.08]" : "border-primary/15 bg-white hover:border-primary/35"}`}
                    >
                      <Icon className="size-5 text-primary" />
                      <span className="mt-3 block font-medium">{intent.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.65fr_1fr_0.45fr]">
                <div>
                  <Label>Provider</Label>
                  <Select value={providerId} onValueChange={chooseProvider}>
                    <SelectTrigger className="mt-2 w-full"><SelectValue placeholder="Choose a provider" /></SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>{provider.name} · {provider.mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="purchase-query">{pro ? "Intent parameters" : "Describe what you want"}</Label>
                  <Input id="purchase-query" className="mt-2" value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
                <div>
                  <Label>Asset</Label>
                  <Select value={asset} onValueChange={(value) => setAsset(value as "USDG" | "ETH")}>
                    <SelectTrigger className="mt-2 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="USDG">USDG</SelectItem><SelectItem value="ETH">ETH</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              {providerId === "direct-onchain" || providerId === "recurring-payments" ? (
                <div className="grid gap-4 sm:grid-cols-[1fr_0.35fr]">
                  <div>
                    <Label htmlFor="recipient">Exact trusted recipient</Label>
                    <Input id="recipient" className="mt-2 font-mono" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0x…" />
                  </div>
                  <div>
                    <Label htmlFor="direct-amount">Exact amount ({asset})</Label>
                    <Input id="direct-amount" className="mt-2" inputMode="decimal" value={directAmount} onChange={(event) => setDirectAmount(event.target.value)} />
                  </div>
                </div>
              ) : null}

              {providerId === "duffel-flights" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div><Label htmlFor="flight-origin">From (IATA)</Label><Input id="flight-origin" className="mt-2 uppercase" maxLength={3} value={origin} onChange={(event) => setOrigin(event.target.value.toUpperCase())} /></div>
                  <div><Label htmlFor="flight-destination">To (IATA)</Label><Input id="flight-destination" className="mt-2 uppercase" maxLength={3} value={destination} onChange={(event) => setDestination(event.target.value.toUpperCase())} /></div>
                  <div><Label htmlFor="flight-date">Departure</Label><Input id="flight-date" className="mt-2" type="date" value={departureDate} onChange={(event) => setDepartureDate(event.target.value)} /></div>
                  <div><Label htmlFor="flight-passengers">Adults</Label><Input id="flight-passengers" className="mt-2" type="number" min={1} max={9} value={passengers} onChange={(event) => setPassengers(event.target.value)} /></div>
                  <div><Label htmlFor="flight-cabin">Cabin</Label><select id="flight-cabin" className="mt-2 h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" value={cabinClass} onChange={(event) => setCabinClass(event.target.value as typeof cabinClass)}><option value="economy">Economy</option><option value="premium_economy">Premium economy</option><option value="business">Business</option><option value="first">First</option></select></div>
                </div>
              ) : null}

              {providerId === "duffel-stays" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div><Label htmlFor="stay-check-in">Check-in</Label><Input id="stay-check-in" className="mt-2" type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} /></div>
                  <div><Label htmlFor="stay-check-out">Check-out</Label><Input id="stay-check-out" className="mt-2" type="date" value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} /></div>
                  <div><Label htmlFor="stay-guests">Guests</Label><Input id="stay-guests" className="mt-2" type="number" min={1} max={16} value={stayGuests} onChange={(event) => setStayGuests(event.target.value)} /></div>
                  <div><Label htmlFor="stay-rooms">Rooms</Label><Input id="stay-rooms" className="mt-2" type="number" min={1} max={8} value={stayRooms} onChange={(event) => setStayRooms(event.target.value)} /></div>
                </div>
              ) : null}

              {selectedProvider ? (
                <Alert>
                  <Store />
                  <AlertTitle>{selectedProvider.name} · {selectedProvider.mode}</AlertTitle>
                  <AlertDescription>{selectedProvider.disclosure}</AlertDescription>
                </Alert>
              ) : null}

              {providersQuery.data && (!providersQuery.data.storageConfigured || !providersQuery.data.sessionConfigured || !providersQuery.data.encryptionConfigured) ? (
                <Alert className="border-amber-400/30 bg-amber-50 text-amber-900">
                  <LockKeyhole />
                  <AlertTitle>Private order lifecycle is not configured</AlertTitle>
                  <AlertDescription>Quotes still work, but an operator must configure durable Redis plus separate session and AES-256-GCM data-encryption keys before orders and approvals can be stored privately.</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={() => quoteMutation.mutate()}
                  disabled={quoteMutation.isPending || query.trim().length < 3 || providersQuery.isPending}
                >
                  {quoteMutation.isPending ? <LoaderCircle className="animate-spin" /> : <Bot />}
                  {pro ? "Request structured quote" : "Find an option"}
                </Button>
                <p className="text-xs text-muted-foreground">No wallet signature · No payment · Quote expires in 10 minutes</p>
              </div>

              {quoteMutation.error ? (
                <Alert variant="destructive"><XCircle /><AlertTitle>Quote failed</AlertTitle><AlertDescription>{parseError(quoteMutation.error)}</AlertDescription></Alert>
              ) : null}

              {quote ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/[0.035] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Badge variant="outline" className={quote.providerMode === "live" ? "border-primary/35 text-primary" : "border-amber-400/40 text-amber-800"}>{quote.sourceReference.startsWith("direct-mainnet:") ? "Verified mainnet direct quote" : quote.sourceReference.startsWith("duffel-stays-test:") ? "Live stays sandbox" : quote.sourceReference.startsWith("duffel-test:") ? "Live provider sandbox" : quote.sourceReference.startsWith("ticketmaster:") ? "Live provider discovery" : "Sandbox demo"}</Badge>
                      <h3 className="mt-3 text-xl font-semibold">{quote.summary}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{quote.disclosure}</p>
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-white px-5 py-4 text-right">
                      <p className="text-xs text-muted-foreground">Exact quote</p>
                      <p className="mt-1 text-2xl font-semibold">{formatAssetAmount(quote)}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-lg bg-white p-3"><p className="text-xs text-muted-foreground">Merchant</p><p className="mt-1 font-medium">{quote.merchantName}</p></div>
                    <div className="rounded-lg bg-white p-3"><p className="text-xs text-muted-foreground">Policy account</p><p className="mt-1 font-mono text-xs">{shortAddress(policyAccount || address || "")}</p></div>
                    <div className="rounded-lg bg-white p-3"><p className="text-xs text-muted-foreground">Payment</p><p className="mt-1 font-medium">Not sent</p></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {quote.checkoutUrl ? <Button asChild variant="outline"><a href={quote.checkoutUrl} target="_blank" rel="noreferrer">Continue to official checkout <ExternalLink /></a></Button> : null}
                    <Button
                      onClick={() => orderMutation.mutate(quote)}
                      disabled={!quoteMutation.data?.persisted || !address || !policyAccount || orderMutation.isPending}
                    >
                      {orderMutation.isPending ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
                      Unlock, simulate policy, and create approval
                    </Button>
                    {!quoteMutation.data?.persisted ? <p className="self-center text-xs text-amber-800">Durable storage is required for the approval lifecycle.</p> : null}
                  </div>
                </div>
              ) : null}

              {orderMutation.error ? (
                <Alert variant="destructive"><XCircle /><AlertTitle>Order simulation failed</AlertTitle><AlertDescription>{parseError(orderMutation.error)}</AlertDescription></Alert>
              ) : null}
              {order ? (
                <Alert className="border-primary/35 bg-primary/[0.05]">
                  <CheckCircle2 />
                  <AlertTitle>Guarded order created · {order.status}</AlertTitle>
                  <AlertDescription>
                    {orderMutation.data?.nextStep} No blockchain transaction was broadcast. {order.approvalId ? <Link href="/approvals" className="font-medium text-primary">Open Approval Inbox →</Link> : null}
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section id="merchants" className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">03 · Providers</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{pro ? "Adapter capability registry" : "Services RuleWallet can work with"}</h2>
            </div>
            <Badge variant="outline">Live status, not marketing claims</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {providers.map((provider) => {
              const Icon = categoryIcons[provider.category];
              return (
                <Card key={provider.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-primary/[0.08] text-primary"><Icon className="size-5" /></span>
                      <Badge variant="outline" className={provider.handlesRealFunds ? "text-primary" : "text-amber-800"}>{provider.mode}</Badge>
                    </div>
                    <CardTitle className="mt-3">{provider.name}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-muted p-2"><span className="text-muted-foreground">Quote</span><p className="mt-1 font-medium">{provider.canQuote ? "Available" : "Unavailable"}</p></div>
                      <div className="rounded-lg bg-muted p-2"><span className="text-muted-foreground">Real purchase</span><p className="mt-1 font-medium">{provider.canPurchase ? "Available" : "Disabled"}</p></div>
                    </div>
                    <dl className="mt-3 space-y-2 border-t pt-3 text-xs">
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Official domain</dt><dd className="text-right font-medium">{provider.officialDomain}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Rail</dt><dd className="text-right font-medium">{provider.rail}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Assets</dt><dd className="text-right font-medium">{provider.paymentAssets.join(" · ")}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Automatic pay</dt><dd className="text-right font-medium">{provider.automaticPaymentSupported ? "Supported" : "Disabled"}</dd></div>
                      <div><dt className="text-muted-foreground">Settlement</dt><dd className="mt-1 leading-5">{provider.settlement}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Refund / cancel</dt><dd className="text-right font-medium">{provider.refunds} / {provider.cancellations}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Checked</dt><dd className="text-right font-medium">{new Date(provider.verifiedAt).toLocaleDateString()}</dd></div>
                    </dl>
                    {provider.documentationUrl ? <a href={provider.documentationUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-primary">Official docs <ExternalLink className="size-3" /></a> : null}
                    <a href={provider.verificationSource} target="_blank" rel="noreferrer" className="mt-2 ml-3 inline-flex items-center gap-1 text-sm text-primary">Verification source <ExternalLink className="size-3" /></a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            [Settings2, pro ? "Policy parameters" : "Set my limits", "Merchant, category, per-transaction, daily, weekly, monthly, and UTC schedules."],
            [FileCheck2, pro ? "Approval queue" : "Review unusual requests", "Approve or reject exact expiring requests; hard rules cannot be overridden."],
            [ReceiptText, pro ? "Execution ledger" : "See what happened", "Quote, policy decision, payment evidence, provider confirmation, and reconciliation."],
          ].map(([Icon, title, text], index) => (
            <Card key={String(title)}>
              <CardHeader><Icon className="size-5 text-primary" /><CardTitle className="mt-3">{String(title)}</CardTitle><CardDescription>{String(text)}</CardDescription></CardHeader>
              <CardContent><Button asChild variant="outline" className="w-full"><Link href={index === 1 ? "/approvals" : index === 2 ? "/activity" : "/app/policies/new"}>{index === 0 ? "Configure" : "Open"} <ArrowRight /></Link></Button></CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
