"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BookOpen,
  Check,
  CircleHelp,
  Code2,
  ExternalLink,
  Eye,
  Fuel,
  Gauge,
  KeyRound,
  Network,
  PauseCircle,
  PlayCircle,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import { ExperienceModeToggle } from "@/components/experience-mode-toggle";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const simpleSteps = [
  {
    icon: PlayCircle,
    title: "Watch the demo",
    text: "See a real testnet policy, blocked request, approval, and public receipt without connecting a wallet.",
    href: "/demo",
    action: "Start 2-minute demo",
    external: false,
    newTab: false,
  },
  {
    icon: Network,
    title: "Connect on testnet",
    text: "Connect MetaMask and use Robinhood Chain testnet. Faucet ETH is only for testing and has no value.",
    href: "https://docs.robinhood.com/chain/connecting/",
    action: "Network instructions",
    external: true,
    newTab: true,
  },
  {
    icon: Rocket,
    title: "Create your RuleWallet",
    text: "Deploy a personal policy account, then choose exactly who the agent may pay and how much it may spend.",
    href: "/app/deploy",
    action: "Open setup console",
    external: false,
    newTab: true,
  },
  {
    icon: Eye,
    title: "Verify every result",
    text: "Run a tiny canary, inspect the explorer receipt, and practice pause and revoke before using automation.",
    href: "/activity",
    action: "View public activity",
    external: false,
    newTab: false,
  },
] as const;

const features = [
  {
    icon: Gauge,
    title: "Spending limits",
    text: "Per-transaction and rolling 24-hour limits are enforced by the account.",
  },
  {
    icon: Users,
    title: "Trusted recipients",
    text: "The agent can send only to addresses you explicitly enable.",
  },
  {
    icon: ShieldCheck,
    title: "Human approval",
    text: "Higher-value actions wait for an independent approver.",
  },
  {
    icon: PauseCircle,
    title: "Emergency stop",
    text: "A guardian can pause activity without taking ownership of your funds.",
  },
  {
    icon: Eye,
    title: "Readable previews",
    text: "The chain, value, contract, and expected result appear before every signature.",
  },
  {
    icon: Bot,
    title: "Bounded automation",
    text: "Agents receive one narrow role, never your owner wallet or recovery phrase.",
  },
] as const;

const proSetup = [
  [
    "1",
    "Choose an environment",
    "Use chain 46630 for the public testnet. Chain 4663 is experimental, unaudited mainnet software.",
  ],
  [
    "2",
    "Deploy or select an account",
    "The versioned factory creates a personal, non-upgradeable policy account controlled by the owner.",
  ],
  [
    "3",
    "Separate operational roles",
    "OWNER, GUARDIAN, AGENT, and APPROVER should be different addresses with intentionally scoped authority.",
  ],
  [
    "4",
    "Configure hard policy",
    "Enable recipients and set asset-specific per-transaction, rolling 24-hour, and approval thresholds.",
  ],
  [
    "5",
    "Authorize one strategy",
    "EIP-712 binds chain, account, asset, recipient, amount, nonce, expiry, cadence, and execution cap.",
  ],
  [
    "6",
    "Monitor and rehearse recovery",
    "Track receipts, alerts, nonce state, pause behavior, revocation, and owner withdrawal before scaling.",
  ],
] as const;

const roles = [
  [
    "Owner",
    "Deploys the account, sets policy, authorizes strategies, and withdraws funds.",
    "Wallet signature required",
  ],
  [
    "Guardian",
    "Pauses the account during an incident.",
    "Cannot withdraw owner funds",
  ],
  [
    "Agent",
    "Requests only direct ETH or canonical USDG transfers within policy.",
    "Never receives admin authority",
  ],
  [
    "Approver",
    "Approves requests above the configured human threshold.",
    "Cannot override a failed hard rule",
  ],
] as const;

const answers = [
  [
    "Do I need crypto to try it?",
    "No. The public demo is read-only, and the testnet uses valueless faucet ETH.",
  ],
  [
    "Does RuleWallet see my seed phrase?",
    "No. Wallet connection exposes a public address. Signatures stay inside your wallet.",
  ],
  [
    "Can an agent spend everything?",
    "No. Agent authority requires enabled assets, trusted recipients, transaction limits, rolling limits, and optional approvals.",
  ],
  [
    "Is mainnet ready for large balances?",
    "No. The mainnet release is experimental and unaudited, and autonomous execution remains gated without a secure signer.",
  ],
] as const;

export function StartExperience() {
  const { mode } = useExperienceMode();
  const pro = mode === "pro";

  const setup = pro
    ? proSetup
    : ([
        [
          "1",
          "Choose where to practice",
          "Start on the free test network. The real-money network is separate and clearly marked.",
        ],
        [
          "2",
          "Create your protected account",
          "Your wallet creates a personal account whose rules cannot be secretly changed by our backend.",
        ],
        [
          "3",
          "Give each helper one job",
          "Use separate addresses for ownership, emergency pause, automation, and larger-payment approval.",
        ],
        [
          "4",
          "Choose who and how much",
          "Add trusted recipients and set a maximum for one transfer, one day, and transfers needing approval.",
        ],
        [
          "5",
          "Approve one exact plan",
          "Your wallet signs a plan that fixes the network, account, recipient, amount, timing, and expiry.",
        ],
        [
          "6",
          "Watch it and practise stopping it",
          "Check public receipts, test pause and revoke, and confirm that you can withdraw before adding more funds.",
        ],
      ] as const);

  const displayedRoles = pro
    ? roles
    : ([
        [
          "Main wallet (Owner)",
          "Creates the account, chooses the rules, approves plans, and withdraws funds.",
          "Every change needs your wallet signature",
        ],
        [
          "Emergency contact (Guardian)",
          "Stops activity if something looks wrong.",
          "Can pause, but cannot take your funds",
        ],
        [
          "Automation wallet (Agent)",
          "Makes only the transfers that match all of your rules.",
          "Cannot change rules or become the owner",
        ],
        [
          "Payment reviewer (Approver)",
          "Checks transfers above the amount you choose.",
          "Cannot approve a transfer that breaks a hard limit",
        ],
      ] as const);

  return (
    <main>
      <section className="border-b border-grid">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_0.7fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <Badge variant="outline" className="border-primary/25 text-primary">
              {pro ? <SlidersHorizontal /> : <Wallet />}{" "}
              {pro ? "Advanced operator setup" : "Beginner-friendly setup"}
            </Badge>
            <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              {pro
                ? "Control every policy boundary."
                : "Understand RuleWallet before signing anything."}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              {pro
                ? "Inspect roles, contracts, thresholds, EIP-712 strategies, receipts, and recovery controls from one technical setup path."
                : "See the complete product in clear language: what each control means, what your wallet will sign, and how to stop automation at any time."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/demo">
                  Try the demo <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/app" target="_blank" rel="noreferrer">
                  Open console in new tab <ExternalLink />
                </a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/docs">
                  <BookOpen /> {pro ? "Technical docs" : "How it works"}
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-primary/20 bg-primary/[0.035] lime-shadow">
            <CardHeader>
              <CardTitle>Choose your experience</CardTitle>
              <CardDescription>
                The setting is saved on this device. It never changes your
                wallet or onchain policy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ExperienceModeToggle className="w-full justify-between px-4 py-3" />
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div
                  className={`rounded-xl border p-4 ${!pro ? "border-primary/30 bg-primary/[0.08]" : "border-grid"}`}
                >
                  <p className="font-medium">Simple</p>
                  <p className="mt-1 text-muted-foreground">
                    Every feature, explained in everyday language.
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-4 ${pro ? "border-primary/30 bg-primary/[0.08]" : "border-grid"}`}
                >
                  <p className="font-medium">Pro</p>
                  <p className="mt-1 text-muted-foreground">
                    The same features with contract and operator terms.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
            Your path
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Four steps from curious to confident.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Start without a wallet. Connect only when you understand what will
            happen.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {simpleSteps.map((step, index) => {
            const Icon = step.icon;
            const link = (
              <>
                {step.action}{" "}
                {step.external || step.newTab ? (
                  <ExternalLink />
                ) : (
                  <ArrowRight />
                )}
              </>
            );
            return (
              <Card key={step.title}>
                <CardHeader className="gap-5 sm:grid sm:grid-cols-[48px_1fr]">
                  <span className="grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/[0.06] text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-primary uppercase">
                      Step {index + 1}
                    </p>
                    <CardTitle className="mt-1 text-lg">{step.title}</CardTitle>
                    <CardDescription className="mt-2 leading-6">
                      {step.text}
                    </CardDescription>
                    <Button asChild variant="outline" className="mt-4">
                      {step.external || step.newTab ? (
                        <a href={step.href} target="_blank" rel="noreferrer">
                          {link}
                        </a>
                      ) : (
                        <Link href={step.href}>{link}</Link>
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-grid bg-card/55">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Plain-language controls with onchain enforcement.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title}>
                  <CardHeader>
                    <Icon className="mb-3 size-5 text-primary" />
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription className="leading-6">
                      {feature.text}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <CircleHelp className="size-6 text-primary" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              Quick answers
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              The things a careful first-time user should know before
              connecting.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {answers.map(([question, answer]) => (
              <Card key={question}>
                <CardHeader>
                  <CardTitle>{question}</CardTitle>
                  <CardDescription className="leading-6">
                    {answer}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <Alert className="border-amber-500/25 bg-amber-50 text-amber-950">
          <ShieldCheck className="text-amber-700" />
          <AlertTitle>
            {pro
              ? "Mainnet remains a separate high-risk environment"
              : "Real funds are separate from the free demo"}
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            Testnet and mainnet use separate registries. Mainnet is experimental
            and unaudited, and autonomous execution fails closed without a
            secure KMS, MPC, or HSM-backed signer.
          </AlertDescription>
        </Alert>
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
              {pro ? "Technical setup" : "Complete setup"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {pro
                ? "The complete operator path."
                : "What happens from start to finish."}
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              {pro
                ? "Each mutation is simulated first and signed separately. No backend administrator can bypass account policy."
                : "Every change is previewed first and signed by you. RuleWallet cannot silently change your rules or move your money."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/mainnet">
                  {pro ? "Open mainnet lab" : "See real-funds setup"}{" "}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/security">
                  {pro ? "Threat model" : "Read safety guide"}
                </Link>
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-grid bg-card">
            {setup.map(([number, title, text]) => (
              <div
                key={number}
                className="grid gap-2 px-5 py-5 sm:grid-cols-[48px_190px_1fr]"
              >
                <span className="font-mono text-xs text-primary">{number}</span>
                <span className="font-medium">{title}</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-grid bg-card/55">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
              {pro ? "Role separation" : "Who can do what"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {pro
                ? "Four roles. No shared super-key."
                : "Four separate jobs keep one key from controlling everything."}
            </h2>
          </div>
          <Card className="mt-10">
            <CardContent className="overflow-x-auto px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{pro ? "Role" : "Person or wallet"}</TableHead>
                    <TableHead>{pro ? "Purpose" : "What it does"}</TableHead>
                    <TableHead>
                      {pro ? "Boundary" : "What it cannot do"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRoles.map(([role, purpose, boundary]) => (
                    <TableRow key={role}>
                      <TableCell className="font-medium text-primary">
                        {role}
                      </TableCell>
                      <TableCell>{purpose}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {boundary}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Code2 className="mb-3 size-5 text-primary" />
              <CardTitle>
                {pro ? "Build locally" : "Open source and verifiable"}
              </CardTitle>
              <CardDescription>
                {pro
                  ? "Clone the repository, install dependencies, run the full app and Foundry test suites, then start Next.js."
                  : "Anyone can inspect the contracts and application. Builders can run the same tests locally."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg border border-grid bg-muted/50 p-4 font-mono text-xs leading-6 text-muted-foreground">
                git clone .../rulewallet{`\n`}npm install{`\n`}npm run verify
                {`\n`}npm run dev
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <KeyRound className="mb-3 size-5 text-primary" />
              <CardTitle>
                {pro ? "Signer boundary" : "Your keys stay in your wallet"}
              </CardTitle>
              <CardDescription>
                {pro
                  ? "Owner, approver, and guardian actions stay in user wallets. Production agent autonomy requires a non-exportable signer."
                  : "RuleWallet only sees your public address. Owner and safety actions are signed inside your wallet, never on our server."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/docs">
                  {pro ? "Read integration model" : "Learn about signatures"}
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Fuel className="mb-3 size-5 text-primary" />
              <CardTitle>
                {pro ? "Operate safely" : "Practise before funding"}
              </CardTitle>
              <CardDescription>
                {pro
                  ? "Use testnet first, keep mainnet autonomy disabled during setup, run a small canary, and rehearse pause and withdrawal."
                  : "Use the free test network first. Try one tiny test, pause the account, and check withdrawal before considering real funds."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <a href="/app" target="_blank" rel="noreferrer">
                  Open console <ExternalLink />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-grid">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:py-24">
          <div className="mx-auto flex w-fit items-center gap-2 text-sm text-primary">
            <Check className="size-4" /> No seed phrase entered into RuleWallet
          </div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Demo first. Configure second. Fund last.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            The console opens separately so this guide stays available while you
            work.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/demo">
                Start demo <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/app" target="_blank" rel="noreferrer">
                Open console in new tab <ExternalLink />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
