"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, LogOut, Network, Wallet } from "lucide-react";
import { formatEther } from "viem";
import {
  useBalance,
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { robinhoodTestnet } from "@/lib/chains";
import { cn } from "@/lib/utils";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletControl({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const connection = useConnection();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const balance = useBalance({
    address: connection.address,
    chainId: robinhoodTestnet.id,
    query: { enabled: Boolean(connection.address) },
  });

  const correctNetwork = connection.chainId === robinhoodTestnet.id;

  async function copyAddress() {
    if (!connection.address) return;
    await navigator.clipboard.writeText(connection.address);
    setCopied(true);
  }

  const connectedAddress = connection.address;

  if (!connection.isConnected || !connectedAddress) {
    return (
      <div className="relative">
        <Button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          className="bg-primary text-primary-foreground hover:bg-primary/85"
          size={compact ? "sm" : "default"}
          onClick={() => setOpen((current) => !current)}
        >
          <Wallet /> Connect wallet
        </Button>
        {open && (
          <div role="dialog" aria-label="Wallet connections" className="absolute top-[calc(100%+0.6rem)] right-0 z-50 w-64 rounded-xl border border-primary/15 bg-popover p-2 shadow-2xl shadow-black/40">
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Testnet only. RuleWallet never asks for a seed phrase.
            </p>
            {connect.connectors.map((connector) => (
              <Button
                key={connector.uid}
                type="button"
                variant="ghost"
                className="w-full justify-start"
                disabled={connect.isPending}
                onClick={() => connect.connect({ connector })}
              >
                <Wallet /> {connector.name}
              </Button>
            ))}
            {!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && (
              <p className="px-2 py-2 text-[11px] leading-5 text-amber-200/80">
                WalletConnect appears after its public project ID is configured.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        variant="outline"
        size={compact ? "sm" : "default"}
        className={cn(
          "border-primary/20 bg-primary/[0.05]",
          !correctNetwork && "border-amber-400/30 text-amber-200",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn("size-2 rounded-full", correctNetwork ? "bg-primary" : "bg-amber-300")} />
        {shortAddress(connectedAddress)} <ChevronDown />
      </Button>
      {open && (
        <div role="dialog" aria-label="Connected wallet" className="absolute top-[calc(100%+0.6rem)] right-0 z-50 w-72 rounded-xl border border-primary/15 bg-popover p-3 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{shortAddress(connectedAddress)}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {balance.data ? `${Number(formatEther(balance.data.value)).toFixed(4)} ETH` : "Balance loading"}
              </p>
            </div>
            <Badge variant="outline" className={correctNetwork ? "text-primary" : "text-amber-200"}>
              {correctNetwork ? "Testnet" : `Chain ${connection.chainId}`}
            </Badge>
          </div>
          {!correctNetwork && (
            <Button
              type="button"
              className="mt-3 w-full bg-primary text-primary-foreground"
              onClick={() => switchChain.switchChain({ chainId: robinhoodTestnet.id })}
            >
              <Network /> Switch to testnet
            </Button>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-grid pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={copyAddress}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Address"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => disconnect.disconnect()}>
              <LogOut /> Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
