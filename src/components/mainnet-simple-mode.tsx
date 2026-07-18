"use client";

import Link from "next/link";
import { Eye, Settings2, ShieldAlert, Wallet } from "lucide-react";
import { useExperienceMode } from "@/components/experience-mode-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const phases = [
  [
    "1",
    "Connect the owner wallet",
    "Confirm Robinhood Chain mainnet and check the public address. Never enter a recovery phrase.",
  ],
  [
    "2",
    "Create or select an account",
    "A personal policy account separates owner authority from agent, guardian, and approver roles.",
  ],
  [
    "3",
    "Set recipients and limits",
    "Enable exactly who may receive funds and configure mandatory per-transfer and rolling limits.",
  ],
  [
    "4",
    "Start with a canary",
    "Deposit the smallest useful amount, verify one receipt, and rehearse pause and withdrawal.",
  ],
] as const;

export function MainnetSimpleMode() {
  const { mode } = useExperienceMode();
  const pro = mode === "pro";

  return (
    <div className="space-y-6">
      <Alert className="border-red-500/25 bg-red-50">
        <ShieldAlert className="text-red-700" />
        <AlertTitle className="text-red-900">
          {pro
            ? "Mainnet risk boundary"
            : "Stop and read this before using real funds"}
        </AlertTitle>
        <AlertDescription className="text-red-800">
          This manual-only preview uses real assets. The contracts are experimental and
          unaudited, and autonomous execution is compile-time disabled. Use the public
          testnet beta unless you understand every role and wallet prompt.
        </AlertDescription>
      </Alert>
      <div className="grid gap-4 md:grid-cols-2">
        {phases.map(([number, title, text]) => (
          <Card key={number}>
            <CardHeader>
              <p className="font-mono text-xs text-primary">{number}</p>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="leading-6">{text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="border-primary/25 bg-primary/[0.06]">
        <CardHeader>
          <Settings2 className="mb-2 size-5 text-primary" />
          <CardTitle>
            {pro
              ? "Complete operator controls are below"
              : "All controls are available below"}
          </CardTitle>
          <CardDescription>
            {pro
              ? "Inspect factory deployment, scoped roles, transaction previews, asset policies, funding, emergency controls, approvals, and EIP-712 strategy data."
              : "Nothing is hidden in Simple mode. Each technical control is shown below with guidance so you can understand the exact wallet action before signing."}
          </CardDescription>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/demo">
                <Eye /> Use the testnet demo
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <a href="/app" target="_blank" rel="noreferrer">
                <Wallet /> Open testnet console
              </a>
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
