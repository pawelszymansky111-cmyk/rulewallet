"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { useConnection } from "wagmi";
import { robinhoodTestnet } from "@/lib/chains";
import {
  deploymentStorageKey,
  parseStoredAddress,
  policyAccountStorageKey,
} from "@/lib/policy-account";
import { ruleWalletAddress } from "@/lib/rulewallet-contract";

type PolicyAccountContextValue = {
  address: Address | undefined;
  source: "personal" | "demo" | "none";
  hydrated: boolean;
  selectPolicyAccount: (address: Address) => void;
  useDemoAccount: () => void;
};

const PolicyAccountContext = createContext<PolicyAccountContextValue | undefined>(undefined);

export function PolicyAccountProvider({ children }: { children: React.ReactNode }) {
  const connection = useConnection();
  const [personalAddress, setPersonalAddress] = useState<Address>();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHydrated(false);
      setPersonalAddress(undefined);
      if (!connection.address) {
        setHydrated(true);
        return;
      }

      const owner = getAddress(connection.address);
      const selected = parseStoredAddress(
        window.localStorage.getItem(policyAccountStorageKey(owner, robinhoodTestnet.id)),
      );
      if (selected) {
        setPersonalAddress(selected);
        setHydrated(true);
        return;
      }

      try {
        const saved = window.localStorage.getItem(deploymentStorageKey);
        const deployment = saved ? JSON.parse(saved) : undefined;
        if (
          deployment &&
          isAddress(deployment.address) &&
          isAddress(deployment.owner) &&
          deployment.owner.toLowerCase() === owner.toLowerCase()
        ) {
          const address = getAddress(deployment.address);
          window.localStorage.setItem(
            policyAccountStorageKey(owner, robinhoodTestnet.id),
            address,
          );
          setPersonalAddress(address);
        }
      } catch {
        window.localStorage.removeItem(deploymentStorageKey);
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [connection.address]);

  const value = useMemo<PolicyAccountContextValue>(() => {
    function selectPolicyAccount(address: Address) {
      if (!connection.address) return;
      const selected = getAddress(address);
      window.localStorage.setItem(
        policyAccountStorageKey(getAddress(connection.address), robinhoodTestnet.id),
        selected,
      );
      setPersonalAddress(selected);
    }

    function useDemoAccount() {
      if (connection.address) {
        window.localStorage.removeItem(
          policyAccountStorageKey(getAddress(connection.address), robinhoodTestnet.id),
        );
      }
      setPersonalAddress(undefined);
    }

    return {
      address: personalAddress ?? ruleWalletAddress,
      source: personalAddress ? "personal" : ruleWalletAddress ? "demo" : "none",
      hydrated,
      selectPolicyAccount,
      useDemoAccount,
    };
  }, [connection.address, hydrated, personalAddress]);

  return <PolicyAccountContext.Provider value={value}>{children}</PolicyAccountContext.Provider>;
}

export function usePolicyAccount() {
  const context = useContext(PolicyAccountContext);
  if (!context) throw new Error("usePolicyAccount must be used inside PolicyAccountProvider");
  return context;
}
