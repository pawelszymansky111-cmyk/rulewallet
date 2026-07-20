import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedCommerceRecord = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  ciphertext: string;
  tag: string;
};

export function commerceDataEncryptionConfigured(
  value = process.env.COMMERCE_DATA_ENCRYPTION_KEY,
) {
  return Boolean(value && /^[a-fA-F0-9]{64}$/.test(value));
}

function keyBytes(value = process.env.COMMERCE_DATA_ENCRYPTION_KEY) {
  if (!commerceDataEncryptionConfigured(value)) {
    throw new Error("COMMERCE_DATA_ENCRYPTION_KEY must be a 32-byte hex key.");
  }
  return Buffer.from(value!, "hex");
}

export function isEncryptedCommerceRecord(value: unknown): value is EncryptedCommerceRecord {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Partial<EncryptedCommerceRecord>;
  return envelope.version === 1
    && envelope.algorithm === "aes-256-gcm"
    && typeof envelope.iv === "string"
    && typeof envelope.ciphertext === "string"
    && typeof envelope.tag === "string";
}

export function encryptCommerceRecord(
  value: unknown,
  associatedData: string,
  key?: string,
): EncryptedCommerceRecord {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
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

export function decryptCommerceRecord(
  value: unknown,
  associatedData: string,
  key?: string,
): unknown {
  if (!isEncryptedCommerceRecord(value)) {
    throw new Error("Stored commerce record is not encrypted with the current release.");
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyBytes(key),
      Buffer.from(value.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(associatedData, "utf8"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext) as unknown;
  } catch {
    throw new Error("Commerce record decryption or authentication failed.");
  }
}
