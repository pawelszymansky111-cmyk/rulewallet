import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Hex } from "viem";

export type EncryptedStrategySignature = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  ciphertext: string;
  tag: string;
};

export function strategyEncryptionKeyConfigured(value = process.env.MAINNET_STRATEGY_ENCRYPTION_KEY) {
  return Boolean(value && /^[a-fA-F0-9]{64}$/.test(value));
}

function keyBytes(value = process.env.MAINNET_STRATEGY_ENCRYPTION_KEY) {
  if (!strategyEncryptionKeyConfigured(value)) {
    throw new Error("MAINNET_STRATEGY_ENCRYPTION_KEY must be a 32-byte hex key.");
  }
  return Buffer.from(value!, "hex");
}

export function encryptStrategySignature(
  signature: Hex,
  associatedData: string,
  key?: string,
): EncryptedStrategySignature {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(signature.slice(2), "hex")),
    cipher.final(),
  ]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptStrategySignature(
  encrypted: EncryptedStrategySignature,
  associatedData: string,
  key?: string,
): Hex {
  if (encrypted.version !== 1 || encrypted.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported strategy-signature encryption envelope.");
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyBytes(key),
      Buffer.from(encrypted.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(associatedData, "utf8"));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]);
    const signature = `0x${plaintext.toString("hex")}` as Hex;
    if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) throw new Error("Invalid signature plaintext.");
    return signature;
  } catch {
    throw new Error("Strategy signature decryption or authentication failed.");
  }
}
