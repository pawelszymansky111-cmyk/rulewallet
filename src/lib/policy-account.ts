import { getAddress, isAddress, type Address } from "viem";

export const deploymentStorageKey = "rulewallet:testnet-deployment:v1";

export type AddressBookEntry = {
  address: Address;
  label: string;
  kind: "wallet" | "contract";
  source?: string;
  createdAt: string;
};

export function policyAccountStorageKey(owner: Address, chainId: number) {
  return `rulewallet:policy-account:v1:${chainId}:${owner.toLowerCase()}`;
}

export function addressBookStorageKey(
  owner: Address,
  policyAccount: Address,
  chainId: number,
) {
  return `rulewallet:address-book:v1:${chainId}:${owner.toLowerCase()}:${policyAccount.toLowerCase()}`;
}

export function parseStoredAddress(value: string | null): Address | undefined {
  if (!value || !isAddress(value)) return undefined;
  return getAddress(value);
}

export function parseAddressBook(value: string | null): AddressBookEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): AddressBookEntry[] => {
      if (
        !entry ||
        typeof entry !== "object" ||
        !isAddress(entry.address) ||
        typeof entry.label !== "string" ||
        !entry.label.trim() ||
        (entry.kind !== "wallet" && entry.kind !== "contract") ||
        typeof entry.createdAt !== "string" ||
        (entry.source !== undefined && typeof entry.source !== "string")
      ) {
        return [];
      }
      return [
        {
          address: getAddress(entry.address),
          label: entry.label.trim().slice(0, 80),
          kind: entry.kind,
          source: entry.source?.slice(0, 240),
          createdAt: entry.createdAt,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function upsertAddressBookEntry(
  entries: AddressBookEntry[],
  next: AddressBookEntry,
) {
  return [
    next,
    ...entries.filter(
      (entry) => entry.address.toLowerCase() !== next.address.toLowerCase(),
    ),
  ];
}
