import {
  createHash,
  createPublicKey,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  GetPublicKeyCommand,
  KMSClient,
  SignCommand,
} from "@aws-sdk/client-kms";
import {
  decodeFunctionData,
  getAddress,
  hexToBytes,
  isAddress,
  isHex,
  keccak256,
  parseAbi,
  recoverAddress,
  serializeTransaction,
  toFunctionSelector,
  toHex,
  zeroAddress,
} from "viem";
import { publicKeyToAddress } from "viem/accounts";

const CHAIN_ID = 4663;
const CANONICAL_USDG = getAddress("0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168");
const CURVE_ORDER = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
const HALF_CURVE_ORDER = CURVE_ORDER / BigInt(2);
const EXECUTE_SELECTOR = toFunctionSelector(
  "executeSignedStrategy((uint256,address,address,address,uint128,uint64,uint64,uint32,uint32),bytes,uint64)",
);
const accountAbi = parseAbi([
  "function executeSignedStrategy((uint256 chainId,address account,address asset,address recipient,uint128 amount,uint64 nonce,uint64 expiry,uint32 intervalSeconds,uint32 maxExecutions) strategy,bytes ownerSignature,uint64 requestDeadline) returns (uint256 requestId)",
]);

let kmsClient;
let dynamoClient;
let identityPromise;

export class AmbiguousBroadcastError extends Error {
  constructor(transactionHash) {
    super("Broadcast outcome is ambiguous; the durable signer lock remains until operator reconciliation.");
    this.name = "AmbiguousBroadcastError";
    this.transactionHash = transactionHash;
  }
}

function kms() {
  kmsClient ??= new KMSClient({});
  return kmsClient;
}

function dynamo() {
  dynamoClient ??= new DynamoDBClient({});
  return dynamoClient;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify(body),
  };
}

function authenticate(event) {
  const expected = Buffer.from(required("SIGNER_AUTH_TOKEN"));
  const authorization = event.headers?.authorization ?? event.headers?.Authorization ?? "";
  const supplied = Buffer.from(authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
  if (expected.length < 32 || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("Unauthorized signer request.");
  }
}

function allowedAccounts() {
  const values = required("RULEWALLET_ALLOWED_ACCOUNTS")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0 || values.some((value) => !isAddress(value))) {
    throw new Error("RULEWALLET_ALLOWED_ACCOUNTS must contain valid addresses.");
  }
  return new Set(values.map((value) => getAddress(value)));
}

function positiveInteger(value, label) {
  if (typeof value !== "string" || !/^\d+$/.test(value) || BigInt(value) <= BigInt(0)) {
    throw new Error(`${label} must be a positive integer string.`);
  }
  return BigInt(value);
}

function readLength(bytes, offset) {
  const first = bytes[offset];
  if (first < 0x80) return { length: first, next: offset + 1 };
  const count = first & 0x7f;
  if (count === 0 || count > 2) throw new Error("Unsupported DER length.");
  let length = 0;
  for (let index = 0; index < count; index += 1) length = (length << 8) | bytes[offset + 1 + index];
  return { length, next: offset + 1 + count };
}

export function parseDerSignature(signature) {
  const bytes = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
  if (bytes[0] !== 0x30) throw new Error("Invalid DER signature sequence.");
  const sequence = readLength(bytes, 1);
  let offset = sequence.next;
  if (offset + sequence.length !== bytes.length || bytes[offset] !== 0x02) throw new Error("Invalid DER signature length.");
  const rLength = readLength(bytes, offset + 1);
  const rBytes = bytes.slice(rLength.next, rLength.next + rLength.length);
  offset = rLength.next + rLength.length;
  if (bytes[offset] !== 0x02) throw new Error("Invalid DER S component.");
  const sLength = readLength(bytes, offset + 1);
  const sBytes = bytes.slice(sLength.next, sLength.next + sLength.length);
  if (sLength.next + sLength.length !== bytes.length) throw new Error("Trailing DER signature data.");
  const r = BigInt(toHex(rBytes));
  const rawS = BigInt(toHex(sBytes));
  if (r <= BigInt(0) || r >= CURVE_ORDER || rawS <= BigInt(0) || rawS >= CURVE_ORDER) {
    throw new Error("DER signature values are out of range.");
  }
  return { r, s: rawS > HALF_CURVE_ORDER ? CURVE_ORDER - rawS : rawS };
}

function base64UrlBytes(value) {
  return Buffer.from(value, "base64url");
}

async function getIdentity() {
  identityPromise ??= (async () => {
    const keyId = required("KMS_KEY_ID");
    const response = await kms().send(new GetPublicKeyCommand({ KeyId: keyId }));
    if (!response.PublicKey || response.KeySpec !== "ECC_SECG_P256K1" || response.KeyUsage !== "SIGN_VERIFY") {
      throw new Error("KMS key must be a non-exportable ECC_SECG_P256K1 SIGN_VERIFY key.");
    }
    const keyObject = createPublicKey({ key: Buffer.from(response.PublicKey), format: "der", type: "spki" });
    const jwk = keyObject.export({ format: "jwk" });
    if (!jwk.x || !jwk.y) throw new Error("KMS public key coordinates are unavailable.");
    const publicKey = toHex(Buffer.concat([Buffer.from([4]), base64UrlBytes(jwk.x), base64UrlBytes(jwk.y)]));
    const signerAddress = publicKeyToAddress(publicKey);
    const attestationSha256 = `sha256:${createHash("sha256").update(response.PublicKey).digest("hex")}`;
    return {
      signerAddress,
      keyId,
      attestationSha256,
      chainId: CHAIN_ID,
      nonExportable: true,
      allowedSelectors: [EXECUTE_SELECTOR],
      zeroValueOnly: true,
    };
  })();
  return identityPromise;
}

export function validateIntent(intent, accounts = allowedAccounts()) {
  if (!intent || intent.chainId !== CHAIN_ID) throw new Error("Only Robinhood Chain mainnet (4663) is allowed.");
  if (!isAddress(intent.to) || !accounts.has(getAddress(intent.to))) throw new Error("Target account is not allowlisted by the signer.");
  if (!isHex(intent.data) || intent.data.slice(0, 10).toLowerCase() !== EXECUTE_SELECTOR.toLowerCase()) {
    throw new Error("Only executeSignedStrategy calldata is allowed.");
  }
  if (intent.value !== "0") throw new Error("Signer permits zero-value contract calls only.");
  if (!Number.isSafeInteger(intent.nonce) || intent.nonce < 0) throw new Error("Invalid transaction nonce.");
  if (typeof intent.idempotencyKey !== "string" || !/^[a-zA-Z0-9:_\-.]{20,300}$/.test(intent.idempotencyKey)) {
    throw new Error("Invalid idempotency key.");
  }
  const gas = positiveInteger(intent.gas, "gas");
  const maxFeePerGas = positiveInteger(intent.maxFeePerGas, "maxFeePerGas");
  const maxPriorityFeePerGas = positiveInteger(intent.maxPriorityFeePerGas, "maxPriorityFeePerGas");
  if (maxFeePerGas < maxPriorityFeePerGas) throw new Error("maxFeePerGas must cover the priority fee.");
  if (gas > positiveInteger(required("SIGNER_MAX_GAS"), "SIGNER_MAX_GAS")) throw new Error("Gas exceeds signer ceiling.");
  if (maxFeePerGas > positiveInteger(required("SIGNER_MAX_FEE_PER_GAS_WEI"), "SIGNER_MAX_FEE_PER_GAS_WEI")) throw new Error("Fee exceeds signer ceiling.");
  if (maxPriorityFeePerGas > positiveInteger(required("SIGNER_MAX_PRIORITY_FEE_PER_GAS_WEI"), "SIGNER_MAX_PRIORITY_FEE_PER_GAS_WEI")) throw new Error("Priority fee exceeds signer ceiling.");

  const decoded = decodeFunctionData({ abi: accountAbi, data: intent.data });
  if (decoded.functionName !== "executeSignedStrategy") throw new Error("Unexpected function selector.");
  const [strategy] = decoded.args;
  if (strategy.chainId !== BigInt(CHAIN_ID) || getAddress(strategy.account) !== getAddress(intent.to)) {
    throw new Error("Signed strategy chain or account does not match the transaction.");
  }
  if (strategy.asset !== zeroAddress && getAddress(strategy.asset) !== CANONICAL_USDG) {
    throw new Error("Strategy asset is not native ETH or canonical USDG.");
  }
  if (strategy.expiry <= BigInt(Math.floor(Date.now() / 1000))) throw new Error("Strategy has expired.");
  return { gas, maxFeePerGas, maxPriorityFeePerGas };
}

async function rpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(12_000),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error?.message ?? `${method} RPC request failed.`);
  return result.result;
}

async function verifyRpcNonce(signerAddress, nonce) {
  const urls = [required("SIGNER_RPC_URL"), required("SIGNER_RPC_FALLBACK_URL")];
  if (urls[0] === urls[1] || new URL(urls[0]).protocol !== "https:" || new URL(urls[1]).protocol !== "https:" || new URL(urls[0]).host === new URL(urls[1]).host) {
    throw new Error("Signer requires two distinct HTTPS RPC hosts.");
  }
  const observations = await Promise.all(urls.map(async (url) => ({
    chainId: Number(BigInt(await rpc(url, "eth_chainId", []))),
    nonce: Number(BigInt(await rpc(url, "eth_getTransactionCount", [signerAddress, "pending"]))),
  })));
  if (observations.some((value) => value.chainId !== CHAIN_ID || value.nonce !== nonce)) {
    throw new Error("Signer RPC chain or pending nonce disagreement.");
  }
  return urls;
}

async function signTransaction(intent, limits, signerAddress) {
  const transaction = {
    type: "eip1559",
    chainId: CHAIN_ID,
    nonce: intent.nonce,
    to: getAddress(intent.to),
    value: BigInt(0),
    data: intent.data,
    gas: limits.gas,
    maxFeePerGas: limits.maxFeePerGas,
    maxPriorityFeePerGas: limits.maxPriorityFeePerGas,
  };
  const digest = keccak256(serializeTransaction(transaction));
  const signed = await kms().send(new SignCommand({
    KeyId: required("KMS_KEY_ID"),
    Message: Buffer.from(hexToBytes(digest)),
    MessageType: "DIGEST",
    SigningAlgorithm: "ECDSA_SHA_256",
  }));
  if (!signed.Signature) throw new Error("KMS returned no signature.");
  const { r, s } = parseDerSignature(signed.Signature);
  for (const yParity of [0, 1]) {
    const signature = { r: toHex(r, { size: 32 }), s: toHex(s, { size: 32 }), yParity };
    const recovered = await recoverAddress({ hash: digest, signature });
    if (getAddress(recovered) === getAddress(signerAddress)) {
      return serializeTransaction(transaction, signature);
    }
  }
  throw new Error("KMS signature could not recover the configured signer address.");
}

function fingerprint(intent) {
  return createHash("sha256").update(JSON.stringify(intent)).digest("hex");
}

async function existingIdempotency(key) {
  const response = await dynamo().send(new GetItemCommand({
    TableName: required("IDEMPOTENCY_TABLE"),
    Key: { idempotencyKey: { S: key } },
    ConsistentRead: true,
  }));
  return response.Item;
}

async function claimIdempotency(intent) {
  const table = required("IDEMPOTENCY_TABLE");
  const digest = fingerprint(intent);
  try {
    await dynamo().send(new PutItemCommand({
      TableName: table,
      Item: {
        idempotencyKey: { S: intent.idempotencyKey },
        fingerprint: { S: digest },
        status: { S: "pending" },
        expiresAt: { N: String(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60) },
      },
      ConditionExpression: "attribute_not_exists(idempotencyKey)",
    }));
    return { claimed: true, fingerprint: digest };
  } catch (error) {
    if (error?.name !== "ConditionalCheckFailedException") throw error;
    const item = await existingIdempotency(intent.idempotencyKey);
    if (item?.fingerprint?.S !== digest) throw new Error("Idempotency key was reused for different transaction data.");
    if (item?.status?.S === "completed" && item?.transactionHash?.S) {
      return { claimed: false, transactionHash: item.transactionHash.S, providerRequestId: item.providerRequestId?.S ?? "replayed" };
    }
    throw new Error("An identical signer request is already pending.");
  }
}

async function completeIdempotency(intent, transactionHash, providerRequestId) {
  await dynamo().send(new UpdateItemCommand({
    TableName: required("IDEMPOTENCY_TABLE"),
    Key: { idempotencyKey: { S: intent.idempotencyKey } },
    UpdateExpression: "SET #status = :completed, transactionHash = :hash, providerRequestId = :request",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":completed": { S: "completed" },
      ":hash": { S: transactionHash },
      ":request": { S: providerRequestId },
    },
  }));
}

async function releaseIdempotency(intent) {
  await dynamo().send(new DeleteItemCommand({
    TableName: required("IDEMPOTENCY_TABLE"),
    Key: { idempotencyKey: { S: intent.idempotencyKey } },
    ConditionExpression: "fingerprint = :fingerprint AND #status = :pending",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":fingerprint": { S: fingerprint(intent) },
      ":pending": { S: "pending" },
    },
  })).catch(() => undefined);
}

async function markAmbiguousIdempotency(intent, transactionHash) {
  await dynamo().send(new UpdateItemCommand({
    TableName: required("IDEMPOTENCY_TABLE"),
    Key: { idempotencyKey: { S: intent.idempotencyKey } },
    UpdateExpression: "SET #status = :ambiguous, transactionHash = :hash",
    ConditionExpression: "fingerprint = :fingerprint AND #status = :pending",
    ExpressionAttributeNames: { "#status": "status" },
    ExpressionAttributeValues: {
      ":ambiguous": { S: "ambiguous" },
      ":hash": { S: transactionHash },
      ":fingerprint": { S: fingerprint(intent) },
      ":pending": { S: "pending" },
    },
  }));
}

async function broadcast(rawTransaction, urls) {
  const expectedHash = keccak256(rawTransaction);
  const results = await Promise.allSettled(urls.map((url) => rpc(url, "eth_sendRawTransaction", [rawTransaction])));
  const hashes = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  if (hashes.length > 0 && hashes.every((hash) => hash.toLowerCase() === expectedHash.toLowerCase())) {
    return expectedHash;
  }
  const observations = await Promise.allSettled(
    urls.map((url) => rpc(url, "eth_getTransactionByHash", [expectedHash])),
  );
  if (observations.some((result) => result.status === "fulfilled" && result.value)) {
    return expectedHash;
  }
  throw new AmbiguousBroadcastError(expectedHash);
}

export async function handler(event, context) {
  try {
    authenticate(event);
    const identity = await getIdentity();
    const method = event.requestContext?.http?.method ?? event.httpMethod;
    if (method === "GET") return json(200, identity);
    if (method !== "POST") return json(405, { error: "Method not allowed." });

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body ?? "", "base64").toString("utf8")
      : event.body ?? "";
    const intent = JSON.parse(rawBody);
    const headerKey = event.headers?.["idempotency-key"] ?? event.headers?.["Idempotency-Key"];
    if (headerKey !== intent.idempotencyKey) throw new Error("Idempotency header and body do not match.");
    const limits = validateIntent(intent);
    const claim = await claimIdempotency(intent);
    if (!claim.claimed) {
      return json(200, {
        transactionHash: claim.transactionHash,
        signerAddress: identity.signerAddress,
        providerRequestId: claim.providerRequestId,
      });
    }

    try {
      const urls = await verifyRpcNonce(identity.signerAddress, intent.nonce);
      const rawTransaction = await signTransaction(intent, limits, identity.signerAddress);
      const transactionHash = await broadcast(rawTransaction, urls);
      const providerRequestId = context?.awsRequestId ?? randomUUID();
      await completeIdempotency(intent, transactionHash, providerRequestId);
      return json(200, { transactionHash, signerAddress: identity.signerAddress, providerRequestId });
    } catch (error) {
      if (error instanceof AmbiguousBroadcastError) {
        await markAmbiguousIdempotency(intent, error.transactionHash);
        return json(202, {
          transactionHash: error.transactionHash,
          signerAddress: identity.signerAddress,
          providerRequestId: context?.awsRequestId ?? randomUUID(),
          ambiguous: true,
        });
      } else {
        await releaseIdempotency(intent);
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signer request failed.";
    const status = /Unauthorized/.test(message) ? 401 : /already pending/.test(message) ? 409 : 400;
    return json(status, { error: message.slice(0, 300) });
  }
}
