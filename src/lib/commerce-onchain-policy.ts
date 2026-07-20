import {
  getAddress,
  zeroAddress,
  type Address,
  type PublicClient,
} from "viem";
import type { CommerceQuote, PolicyDecision } from "./commerce-types";
import {
  ruleWalletPolicyRegistryV3Abi,
  ruleWalletV3Abi,
} from "./mainnet-registry";
import {
  ruleWalletFactoryV3Abi,
  verifyFactoryV3,
} from "./v3-factory";

export const commerceCategoryIds = {
  direct: 0,
  travel: 1,
  food: 2,
  tickets: 3,
  shopping: 4,
  subscriptions: 5,
  payroll: 6,
} as const;

function blocked(
  code: PolicyDecision["code"],
  explanation: string,
): PolicyDecision {
  return { outcome: "blocked", code, explanation };
}

function conciseError(error: unknown) {
  if (!(error instanceof Error)) return "The contract rejected this payment.";
  return error.message
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 260);
}

export function providerCheckoutDecision(quote: CommerceQuote): PolicyDecision {
  return {
    outcome: "approval-required",
    code: "PROVIDER_CHECKOUT_REQUIRED",
    explanation: quote.checkoutUrl
      ? "Approve the exact cart, then complete payment on the provider's official hosted checkout. RuleWallet cannot pay this quote onchain because the provider has no verified recipient address."
      : "Approve the exact cart, then use a verified provider purchase integration. No onchain recipient or live purchase adapter is available for this quote.",
  };
}

export async function evaluateVerifiedV3Payment(input: {
  client: PublicClient;
  chainId: 4663 | 46630;
  factory: Address;
  stablecoin: Address;
  account: Address;
  owner: Address;
  quote: CommerceQuote;
  verifyFactory?: (
    client: PublicClient,
    factory: Address,
    expected: { chainId: number; canonicalStablecoin: Address },
  ) => Promise<{ verified: boolean }>;
}): Promise<PolicyDecision> {
  if (!input.quote.merchantRecipient) return providerCheckoutDecision(input.quote);

  const verify = input.verifyFactory ?? verifyFactoryV3;
  let factoryVerification;
  try {
    factoryVerification = await verify(input.client, input.factory, {
      chainId: input.chainId,
      canonicalStablecoin: input.stablecoin,
    });
  } catch (error) {
    return blocked(
      "ACCOUNT_NOT_VERIFIED",
      `The configured V3 factory could not be verified: ${conciseError(error)}`,
    );
  }
  if (!factoryVerification.verified) {
    return blocked(
      "ACCOUNT_NOT_VERIFIED",
      "The configured V3 factory does not match the pinned RuleWallet runtime and helper contracts.",
    );
  }

  try {
    const [expectedVersion, accountVersion, ownerRole, registry, accountStablecoin, active, paused] =
      await Promise.all([
        input.client.readContract({
          address: input.factory,
          abi: ruleWalletFactoryV3Abi,
          functionName: "VERSION_HASH",
        }),
        input.client.readContract({
          address: input.factory,
          abi: ruleWalletFactoryV3Abi,
          functionName: "accountVersion",
          args: [input.account],
        }),
        input.client.readContract({
          address: input.account,
          abi: ruleWalletV3Abi,
          functionName: "OWNER_ROLE",
        }),
        input.client.readContract({
          address: input.account,
          abi: ruleWalletV3Abi,
          functionName: "policyRegistry",
        }),
        input.client.readContract({
          address: input.account,
          abi: ruleWalletV3Abi,
          functionName: "canonicalStablecoin",
        }),
        input.client.readContract({
          address: input.account,
          abi: ruleWalletV3Abi,
          functionName: "policyActive",
        }),
        input.client.readContract({
          address: input.account,
          abi: ruleWalletV3Abi,
          functionName: "paused",
        }),
      ]);

    if (accountVersion !== expectedVersion) {
      return blocked(
        "ACCOUNT_NOT_VERIFIED",
        "This address was not deployed by the verified V3 factory at the expected version.",
      );
    }
    if (getAddress(String(accountStablecoin)) !== input.stablecoin) {
      return blocked(
        "ACCOUNT_NOT_VERIFIED",
        "The account is bound to a different stablecoin than the selected network registry.",
      );
    }
    const ownsAccount = await input.client.readContract({
      address: input.account,
      abi: ruleWalletV3Abi,
      functionName: "hasRole",
      args: [ownerRole, input.owner],
    });
    if (!ownsAccount) {
      return blocked(
        "OWNER_NOT_AUTHORIZED",
        "The connected wallet does not hold OWNER_ROLE on this V3 account.",
      );
    }
    if (!active) {
      return blocked("POLICY_INACTIVE", "This account's spending policy is inactive.");
    }
    if (paused) {
      return blocked("ACCOUNT_PAUSED", "This V3 account is paused; no agent payment can execute.");
    }

    const registryAddress = getAddress(String(registry));
    const [controller, registryStablecoin] = await Promise.all([
      input.client.readContract({
        address: registryAddress,
        abi: ruleWalletPolicyRegistryV3Abi,
        functionName: "controller",
      }),
      input.client.readContract({
        address: registryAddress,
        abi: ruleWalletPolicyRegistryV3Abi,
        functionName: "canonicalStablecoin",
      }),
    ]);
    if (
      getAddress(String(controller)) !== input.account ||
      getAddress(String(registryStablecoin)) !== input.stablecoin
    ) {
      return blocked(
        "ACCOUNT_NOT_VERIFIED",
        "The policy registry is not immutably paired with this account and canonical stablecoin.",
      );
    }

    const asset = input.quote.asset === "ETH" ? zeroAddress : input.stablecoin;
    const requiresApproval = await input.client.readContract({
      address: registryAddress,
      abi: ruleWalletPolicyRegistryV3Abi,
      functionName: "validatePayment",
      args: [
        getAddress(input.quote.merchantRecipient),
        asset,
        BigInt(input.quote.amountMinor),
        commerceCategoryIds[input.quote.category],
      ],
    });
    return requiresApproval
      ? {
          outcome: "approval-required",
          code: "HUMAN_APPROVAL_THRESHOLD",
          explanation:
            "The verified onchain policy accepts this payment but requires the configured human-approval threshold.",
        }
      : {
          outcome: "allowed",
          code: "OK",
          explanation:
            "The verified V3 account, merchant, category, time, amount, and live spend counters all permit this payment.",
        };
  } catch (error) {
    return blocked(
      "ONCHAIN_POLICY_REJECTED",
      `The verified onchain policy rejected this payment: ${conciseError(error)}`,
    );
  }
}
