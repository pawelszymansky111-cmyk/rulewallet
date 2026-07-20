import "server-only";
import { encodeFunctionData, getAddress, parseAbi, type Hex } from "viem";
import { getIndependentMainnetPublicClients, getMainnetPublicClient } from "@/lib/mainnet-clients";
import {
  claimMainnetExecutionLock,
  getMainnetStrategy,
  listMainnetStrategies,
  releaseMainnetExecutionLock,
  claimMainnetSignerLock,
  saveMainnetExecution,
  saveMainnetStrategy,
  getMainnetPendingSignerTransaction,
  saveMainnetPendingSignerTransaction,
  clearMainnetPendingSignerTransaction,
} from "@/lib/mainnet-agent-store";
import type { MainnetAgentStrategy, MainnetAgentExecution } from "@/lib/mainnet-agent-types";
import {
  ROBINHOOD_MAINNET_USDG,
  ruleWalletPolicyRegistryV3Abi,
  ruleWalletV3Abi,
} from "@/lib/mainnet-registry";
import { sendMainnetAlert } from "@/lib/mainnet-monitoring";
import { getMainnetAgentSigner, mainnetSignerStatus } from "@/lib/secure-agent-signer";
import { getServerEnvironment } from "@/lib/server-env";
import {
  assertRpcAgreement,
  assertWithinMainnetFeeCeilings,
  mainnetAutonomyReady,
  mainnetProductionGates,
} from "@/lib/mainnet-safety";
import {
  mainnetFactoryV3Address,
  ruleWalletFactoryV3Abi,
  verifyFactoryV3,
} from "@/lib/v3-factory";
import { keccak256 } from "viem";

const erc20MetadataAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

function errorText(error: unknown) {
  return error instanceof Error ? error.message.split("\n")[0].slice(0, 400) : "Unknown mainnet execution error";
}

function strategyTuple(strategy: MainnetAgentStrategy) {
  return {
    chainId: BigInt(strategy.chainId),
    account: strategy.account,
    asset: strategy.asset,
    recipient: strategy.recipient,
    amount: BigInt(strategy.amount),
    category: strategy.category,
    intentHash: strategy.intentHash as Hex,
    nonce: BigInt(strategy.nonce),
    expiry: BigInt(strategy.expiry),
    intervalSeconds: strategy.intervalSeconds,
    maxExecutions: strategy.maxExecutions,
  } as const;
}

async function record(
  strategy: MainnetAgentStrategy,
  status: "blocked" | "failed",
  reason: string,
  trigger: "schedule" | "manual" = "schedule",
): Promise<MainnetAgentExecution> {
  const execution = await saveMainnetExecution({
    id: crypto.randomUUID(),
    strategyId: strategy.id,
    strategyName: strategy.name,
    account: strategy.account,
    asset: strategy.asset,
    recipient: strategy.recipient,
    amount: strategy.amount,
    trigger,
    status,
    reason,
    createdAt: new Date().toISOString(),
  });
  await sendMainnetAlert({
    severity: status === "failed" ? "high" : "medium",
    code: `AUTONOMY_${status.toUpperCase()}`,
    summary: reason,
    account: strategy.account,
    strategyId: strategy.id,
    occurredAt: execution.createdAt,
  }).catch(() => false);
  return execution;
}

export async function executeMainnetStrategy(
  strategyId: string,
  trigger: "schedule" | "manual" = "schedule",
) {
  const strategy = await getMainnetStrategy(strategyId);
  if (!strategy) throw new Error("Mainnet strategy not found.");
  if (!strategy.active) return record(strategy, "blocked", "Strategy is inactive.", trigger);

  const environment = getServerEnvironment();
  const signerStatus = mainnetSignerStatus();
  if (environment.ENABLE_MAINNET !== "true" || environment.ENABLE_MAINNET_AUTONOMY !== "true") {
    return record(strategy, "blocked", "Autonomous mainnet execution is disabled by environment policy.", trigger);
  }
  if (!signerStatus.configured || !signerStatus.address) {
    return record(strategy, "blocked", signerStatus.reason ?? "Secure signer is not configured.", trigger);
  }

  const client = getMainnetPublicClient();
  const signer = getMainnetAgentSigner();
  const [signerIdentity, factoryVerification, usdgSymbol, usdgDecimals] = await Promise.all([
    signer.verifyIdentity().catch(() => undefined),
    mainnetFactoryV3Address
      ? verifyFactoryV3(client, mainnetFactoryV3Address, {
          chainId: 4663,
          canonicalStablecoin: ROBINHOOD_MAINNET_USDG,
        }).catch(() => undefined)
      : Promise.resolve(undefined),
    client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "symbol" }).catch(() => undefined),
    client.readContract({ address: ROBINHOOD_MAINNET_USDG, abi: erc20MetadataAbi, functionName: "decimals" }).catch(() => undefined),
  ]);
  const runtimeVerification = {
    signerIdentityVerified: Boolean(signerIdentity),
    factoryVerified: factoryVerification?.verified ?? false,
    canonicalAssetVerified: usdgSymbol === "USDG" && usdgDecimals === 6,
  };
  if (!mainnetAutonomyReady(environment, runtimeVerification)) {
    const incomplete = mainnetProductionGates(environment, runtimeVerification)
      .filter((gate) => !gate.ready)
      .map((gate) => gate.id)
      .join(", ");
    return record(strategy, "blocked", `Production autonomy gates are incomplete: ${incomplete}.`, trigger);
  }

  const lock = await claimMainnetExecutionLock(strategy.id);
  if (!lock) return record(strategy, "blocked", "A durable execution lock is already held.", trigger);

  const signerLock = await claimMainnetSignerLock(signerStatus.address);
  if (!signerLock) {
    await releaseMainnetExecutionLock(lock);
    return record(strategy, "blocked", "The signer-global durable nonce lock is already held.", trigger);
  }

  try {
    const existingPending = await getMainnetPendingSignerTransaction(signerStatus.address);
    if (existingPending) return record(strategy, "blocked", `Signer nonce ${existingPending.nonce} is still reserved by pending transaction ${existingPending.transactionHash}.`, trigger);
    const independentClients = getIndependentMainnetPublicClients();
    const typedStrategy = strategyTuple(strategy);
    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    if (BigInt(strategy.expiry) <= nowSeconds) return record(strategy, "blocked", "Strategy signature expired.", trigger);
    if (!mainnetFactoryV3Address) {
      return record(strategy, "blocked", "Verified V3 mainnet factory is not configured.", trigger);
    }

    const [agentRole, policyActive, paused, policyRegistry, digest, expectedVersion, accountVersion, accountStablecoin] = await Promise.all([
      client.readContract({ address: strategy.account, abi: ruleWalletV3Abi, functionName: "AGENT_ROLE" }),
      client.readContract({ address: strategy.account, abi: ruleWalletV3Abi, functionName: "policyActive" }),
      client.readContract({ address: strategy.account, abi: ruleWalletV3Abi, functionName: "paused" }),
      client.readContract({ address: strategy.account, abi: ruleWalletV3Abi, functionName: "policyRegistry" }),
      client.readContract({ address: strategy.account, abi: ruleWalletV3Abi, functionName: "strategyDigest", args: [typedStrategy] }),
      client.readContract({ address: mainnetFactoryV3Address, abi: ruleWalletFactoryV3Abi, functionName: "VERSION_HASH" }),
      client.readContract({ address: mainnetFactoryV3Address, abi: ruleWalletFactoryV3Abi, functionName: "accountVersion", args: [strategy.account] }),
      client.readContract({ address: strategy.account, abi: ruleWalletV3Abi, functionName: "canonicalStablecoin" }),
    ]);
    const [
      hasAgentRole,
      registryController,
      registryStablecoin,
      merchantPolicy,
      assetPolicy,
      merchantAssetPolicy,
      categoryBudget,
      requiresApproval,
    ] = await Promise.all([
      client.readContract({ address: strategy.account, abi: ruleWalletV3Abi, functionName: "hasRole", args: [agentRole, signer.address] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "controller" }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "canonicalStablecoin" }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "merchantPolicies", args: [strategy.recipient] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "assetPolicies", args: [strategy.asset] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "merchantAssetPolicies", args: [strategy.recipient, strategy.asset] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "categoryBudgets", args: [strategy.category, strategy.asset] }),
      client.readContract({ address: policyRegistry, abi: ruleWalletPolicyRegistryV3Abi, functionName: "validatePayment", args: [strategy.recipient, strategy.asset, BigInt(strategy.amount), strategy.category] }),
    ]);
    if (
      accountVersion !== expectedVersion
      || accountStablecoin !== ROBINHOOD_MAINNET_USDG
      || getAddress(registryController) !== getAddress(strategy.account)
      || getAddress(registryStablecoin) !== ROBINHOOD_MAINNET_USDG
    ) {
      return record(strategy, "blocked", "Account provenance, V3 registry controller, or canonical USDG binding is invalid.", trigger);
    }
    if (strategy.digest && digest.toLowerCase() !== strategy.digest.toLowerCase()) return record(strategy, "blocked", "Stored and onchain EIP-712 strategy digests disagree.", trigger);
    if (!policyActive) return record(strategy, "blocked", "Onchain policy is inactive.", trigger);
    if (paused) return record(strategy, "blocked", "Policy account is paused.", trigger);
    if (!merchantPolicy[0]) return record(strategy, "blocked", "Merchant is no longer trusted.", trigger);
    if (merchantPolicy[2] !== strategy.category) return record(strategy, "blocked", "Merchant category no longer matches the signed strategy.", trigger);
    if (!assetPolicy[0]) return record(strategy, "blocked", "Asset policy is disabled.", trigger);
    if (!merchantAssetPolicy[0]) return record(strategy, "blocked", "This asset is disabled for the merchant.", trigger);
    if (!categoryBudget[0]) return record(strategy, "blocked", "The category budget is disabled.", trigger);
    if (!hasAgentRole) return record(strategy, "blocked", "Secure signer does not hold AGENT_ROLE.", trigger);

    const requestDeadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
    const simulation = await client.simulateContract({
      account: signer.address,
      address: strategy.account,
      abi: ruleWalletV3Abi,
      functionName: "executeSignedStrategy",
      args: [typedStrategy, strategy.signature as Hex, requestDeadline],
    });
    const data = encodeFunctionData({
      abi: ruleWalletV3Abi,
      functionName: "executeSignedStrategy",
      args: [typedStrategy, strategy.signature as Hex, requestDeadline],
    });
    const [nonce, estimatedGas, fees] = await Promise.all([
      client.getTransactionCount({ address: signer.address, blockTag: "pending" }),
      client.estimateContractGas({ account: signer.address, address: strategy.account, abi: ruleWalletV3Abi, functionName: "executeSignedStrategy", args: [typedStrategy, strategy.signature as Hex, requestDeadline] }),
      client.estimateFeesPerGas(),
    ]);
    if (!fees.maxFeePerGas || !fees.maxPriorityFeePerGas) throw new Error("RPC did not return EIP-1559 fee estimates.");
    const agreement = await Promise.all(independentClients.map(async (rpc) => ({
      chainId: await rpc.getChainId(),
      nonce: await rpc.getTransactionCount({ address: signer.address, blockTag: "pending" }),
      codeHash: keccak256(await rpc.getCode({ address: strategy.account }) ?? "0x"),
    })));
    const agreed = assertRpcAgreement(agreement);
    if (agreed.chainId !== 4663 || agreed.nonce !== nonce) throw new Error("Primary and independent RPC nonce observations disagree.");
    const gas = estimatedGas * BigInt(120) / BigInt(100);
    assertWithinMainnetFeeCeilings({ gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas });

    const submitted = await signer.submitTransaction({
      chainId: 4663,
      to: strategy.account,
      data,
      value: "0",
      gas: gas.toString(),
      maxFeePerGas: fees.maxFeePerGas.toString(),
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas.toString(),
      nonce,
      idempotencyKey: `rulewallet:4663:${strategy.id}:${digest}:${nonce}`,
      expectedResult: !requiresApproval && simulation.result === BigInt(0)
        ? "Direct policy-compliant transfer and RequestExecuted event"
        : `Pending human approval request ${simulation.result}`,
    });
    await saveMainnetPendingSignerTransaction(signer.address, {
      transactionHash: submitted.transactionHash,
      nonce,
      strategyId: strategy.id,
      submittedAt: new Date().toISOString(),
      signerAddress: signer.address,
      to: strategy.account,
      data,
      value: "0",
    });
    await saveMainnetExecution({
      id: crypto.randomUUID(), strategyId: strategy.id, strategyName: strategy.name,
      account: strategy.account, asset: strategy.asset, recipient: strategy.recipient,
      amount: strategy.amount, trigger, status: "pending",
      reason: `Submitted with signer-global nonce ${nonce}; awaiting 3 confirmations.`,
      transactionHash: submitted.transactionHash, createdAt: new Date().toISOString(),
    });
    let replacementReason: string | undefined;
    let receipt;
    try {
      receipt = await client.waitForTransactionReceipt({
        hash: submitted.transactionHash,
        confirmations: 3,
        timeout: 180_000,
        onReplaced: ({ reason }) => { replacementReason = reason; },
      });
    } catch (confirmationError) {
      if (/timed? out|timeout/i.test(errorText(confirmationError))) {
        return saveMainnetExecution({
          id: crypto.randomUUID(), strategyId: strategy.id, strategyName: strategy.name,
          account: strategy.account, asset: strategy.asset, recipient: strategy.recipient,
          amount: strategy.amount, trigger, status: "timed_out",
          reason: "Confirmation timed out. The nonce remains reserved and late confirmation must be reconciled before retrying.",
          transactionHash: submitted.transactionHash, createdAt: new Date().toISOString(),
        });
      }
      throw confirmationError;
    }
    const finalHash = receipt.transactionHash;
    const transaction = await client.getTransaction({ hash: finalHash });
    if (
      receipt.status !== "success" || transaction.from !== signer.address
      || !transaction.to || getAddress(transaction.to) !== getAddress(strategy.account)
      || transaction.input.toLowerCase() !== data.toLowerCase() || transaction.value !== BigInt(0)
      || transaction.nonce !== nonce
    ) {
      await sendMainnetAlert({ severity: "critical", code: "SIGNED_TRANSACTION_MISMATCH", summary: "Signer receipt did not match the approved transaction intent.", account: strategy.account, strategyId: strategy.id, transactionHash: finalHash, occurredAt: new Date().toISOString() }).catch(() => false);
      throw new Error("Secure signer transaction did not match the exact approved intent.");
    }
    await clearMainnetPendingSignerTransaction(signer.address, submitted.transactionHash);

    const now = new Date();
    await saveMainnetStrategy({
      ...strategy,
      lastRunAt: now.toISOString(),
      nextRunAt: new Date(now.getTime() + strategy.intervalSeconds * 1000).toISOString(),
    });
    return saveMainnetExecution({
      id: crypto.randomUUID(), strategyId: strategy.id, strategyName: strategy.name,
      account: strategy.account, asset: strategy.asset, recipient: strategy.recipient,
      amount: strategy.amount, trigger, status: replacementReason ? "replaced" : "confirmed",
      reason: replacementReason ? `Transaction ${replacementReason}; replacement intent was revalidated and confirmed.` : !requiresApproval && simulation.result === BigInt(0) ? "Merchant, asset, category, time, and spend-policy checks passed; transfer confirmed." : `Pending human approval request ${simulation.result}.`,
      transactionHash: finalHash, blockNumber: receipt.blockNumber.toString(), confirmations: 3,
      createdAt: now.toISOString(),
    });
  } catch (error) {
    return record(strategy, "failed", errorText(error), trigger);
  } finally {
    await releaseMainnetExecutionLock(signerLock);
    await releaseMainnetExecutionLock(lock);
  }
}

export async function runDueMainnetStrategies() {
  const now = Date.now();
  const strategies = await listMainnetStrategies();
  const due = strategies.filter((strategy) => strategy.active && new Date(strategy.nextRunAt).getTime() <= now);
  const executions = [];
  for (const strategy of due.slice(0, 10)) executions.push(await executeMainnetStrategy(strategy.id));
  return executions;
}

// Monitoring-only reconciliation. It never signs or submits a transaction.
export async function reconcileLateMainnetConfirmations() {
  const signerStatus = mainnetSignerStatus();
  if (!signerStatus.configured || !signerStatus.address) return [];
  const pending = await getMainnetPendingSignerTransaction(signerStatus.address);
  if (!pending) return [];
  const client = getMainnetPublicClient();
  const receipt = await client.getTransactionReceipt({ hash: pending.transactionHash }).catch(() => undefined);
  if (!receipt) return [];
  const strategy = await getMainnetStrategy(pending.strategyId);
  if (!strategy) {
    await sendMainnetAlert({ severity: "critical", code: "ORPHANED_PENDING_TRANSACTION", summary: "A pending signer transaction has no stored strategy.", transactionHash: pending.transactionHash, occurredAt: new Date().toISOString() }).catch(() => false);
    return [];
  }
  const transaction = await client.getTransaction({ hash: pending.transactionHash }).catch(() => undefined);
  if (!transaction
    || transaction.from !== pending.signerAddress
    || !transaction.to
    || getAddress(transaction.to) !== getAddress(pending.to)
    || transaction.input.toLowerCase() !== pending.data.toLowerCase()
    || transaction.value !== BigInt(0)
    || transaction.nonce !== pending.nonce) {
    await sendMainnetAlert({ severity: "critical", code: "LATE_TRANSACTION_MISMATCH", summary: "Late transaction data did not match the reserved signer intent.", account: strategy.account, strategyId: strategy.id, transactionHash: pending.transactionHash, occurredAt: new Date().toISOString() }).catch(() => false);
    return [];
  }
  const now = new Date();
  const late = await saveMainnetExecution({
    id: crypto.randomUUID(),
    strategyId: strategy.id,
    strategyName: strategy.name,
    account: strategy.account,
    asset: strategy.asset,
    recipient: strategy.recipient,
    amount: strategy.amount,
    trigger: "schedule",
    status: receipt.status === "success" ? "late_confirmed" : "failed",
    reason: receipt.status === "success"
      ? "A previously timed-out transaction was revalidated and confirmed late. The signer nonce reservation was cleared."
      : "A previously timed-out transaction was revalidated and reverted onchain.",
    transactionHash: pending.transactionHash,
    blockNumber: receipt.blockNumber.toString(),
    confirmations: 0,
    createdAt: now.toISOString(),
  });
  await clearMainnetPendingSignerTransaction(signerStatus.address, pending.transactionHash);
  if (receipt.status === "success") {
    await saveMainnetStrategy({
      ...strategy,
      lastRunAt: now.toISOString(),
      nextRunAt: new Date(now.getTime() + strategy.intervalSeconds * 1000).toISOString(),
    });
  }
  await sendMainnetAlert({ severity: "critical", code: "LATE_MAINNET_CONFIRMATION", summary: late.reason!, account: late.account, strategyId: late.strategyId, transactionHash: late.transactionHash, occurredAt: late.createdAt }).catch(() => false);
  return [late];
}
