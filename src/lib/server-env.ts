import "server-only";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  RH_TESTNET_RPC_URL: z.url().optional(),
  RH_TESTNET_RPC_FALLBACK_URL: z.url().optional(),
  RH_MAINNET_RPC_URL: z.url().optional(),
  RH_MAINNET_RPC_FALLBACK_URL: z.url().optional(),
  ENABLE_MAINNET: z.enum(["true", "false"]).default("false"),
  ENABLE_MAINNET_AUTONOMY: z.enum(["true", "false"]).default("false"),
  MAINNET_SIGNER_MODE: z.enum(["disabled", "external-kms"]).default("disabled"),
  MAINNET_AGENT_ADDRESS: z.string().optional(),
  MAINNET_SIGNER_ENDPOINT: z.url().optional(),
  MAINNET_SIGNER_AUTH_TOKEN: z.string().min(16).optional(),
  MAINNET_SIGNER_ALLOWED_HOST: z.string().optional(),
  MAINNET_SIGNER_KEY_ID: z.string().optional(),
  MAINNET_SIGNER_ATTESTATION_SHA256: z.string().optional(),
  MAINNET_MAX_GAS: z.string().regex(/^\d+$/).optional(),
  MAINNET_MAX_FEE_PER_GAS_WEI: z.string().regex(/^\d+$/).optional(),
  MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI: z.string().regex(/^\d+$/).optional(),
  MAINNET_ALERT_WEBHOOK_URL: z.url().optional(),
  MAINNET_ALERT_WEBHOOK_TOKEN: z.string().min(16).optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  KV_REST_API_URL: z.url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  MAINNET_SCHEDULER_MODE: z.enum(["vercel-pro-cron", "external-durable"]).optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
});

type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (!cachedEnvironment) {
    cachedEnvironment = serverEnvironmentSchema.parse({
      RH_TESTNET_RPC_URL: process.env.RH_TESTNET_RPC_URL || undefined,
      RH_TESTNET_RPC_FALLBACK_URL: process.env.RH_TESTNET_RPC_FALLBACK_URL || undefined,
      RH_MAINNET_RPC_URL: process.env.RH_MAINNET_RPC_URL || undefined,
      RH_MAINNET_RPC_FALLBACK_URL: process.env.RH_MAINNET_RPC_FALLBACK_URL || undefined,
      ENABLE_MAINNET: process.env.ENABLE_MAINNET || "false",
      ENABLE_MAINNET_AUTONOMY: process.env.ENABLE_MAINNET_AUTONOMY || "false",
      MAINNET_SIGNER_MODE: process.env.MAINNET_SIGNER_MODE || "disabled",
      MAINNET_AGENT_ADDRESS: process.env.MAINNET_AGENT_ADDRESS || undefined,
      MAINNET_SIGNER_ENDPOINT: process.env.MAINNET_SIGNER_ENDPOINT || undefined,
      MAINNET_SIGNER_AUTH_TOKEN: process.env.MAINNET_SIGNER_AUTH_TOKEN || undefined,
      MAINNET_SIGNER_ALLOWED_HOST: process.env.MAINNET_SIGNER_ALLOWED_HOST || undefined,
      MAINNET_SIGNER_KEY_ID: process.env.MAINNET_SIGNER_KEY_ID || undefined,
      MAINNET_SIGNER_ATTESTATION_SHA256: process.env.MAINNET_SIGNER_ATTESTATION_SHA256 || undefined,
      MAINNET_MAX_GAS: process.env.MAINNET_MAX_GAS || undefined,
      MAINNET_MAX_FEE_PER_GAS_WEI: process.env.MAINNET_MAX_FEE_PER_GAS_WEI || undefined,
      MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI: process.env.MAINNET_MAX_PRIORITY_FEE_PER_GAS_WEI || undefined,
      MAINNET_ALERT_WEBHOOK_URL: process.env.MAINNET_ALERT_WEBHOOK_URL || undefined,
      MAINNET_ALERT_WEBHOOK_TOKEN: process.env.MAINNET_ALERT_WEBHOOK_TOKEN || undefined,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || undefined,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || undefined,
      KV_REST_API_URL: process.env.KV_REST_API_URL || undefined,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || undefined,
      CRON_SECRET: process.env.CRON_SECRET || undefined,
      MAINNET_SCHEDULER_MODE: process.env.MAINNET_SCHEDULER_MODE || undefined,
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
      VERCEL_ENV: process.env.VERCEL_ENV,
    });
  }
  return cachedEnvironment;
}
