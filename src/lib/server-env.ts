import "server-only";
import { z } from "zod";

const serverEnvironmentSchema = z.object({
  RH_TESTNET_RPC_URL: z.url().optional(),
  ENABLE_MAINNET: z.enum(["false"]).default("false"),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
});

type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (!cachedEnvironment) {
    cachedEnvironment = serverEnvironmentSchema.parse({
      RH_TESTNET_RPC_URL: process.env.RH_TESTNET_RPC_URL || undefined,
      ENABLE_MAINNET: process.env.ENABLE_MAINNET || "false",
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
      VERCEL_ENV: process.env.VERCEL_ENV,
    });
  }
  return cachedEnvironment;
}
