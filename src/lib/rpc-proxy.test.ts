import factoryArtifact from "@/generated/rulewallet-factory-v3.json";
import { describe, expect, it } from "vitest";
import { encodeDeployData, type Abi, type Hex } from "viem";
import {
  RPC_MAX_PAYLOAD_BYTES,
  rpcPayloadBytes,
  rpcPayloadIsTooLarge,
} from "./rpc-proxy";

const OWNER = "0xEd7A64Ff77da059fcE68E7704D97276fcF853570";
const USDG = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";

describe("read-only RPC proxy payload limits", () => {
  it("accepts the exact V3.1 mainnet factory gas-estimation request", () => {
    const data = encodeDeployData({
      abi: factoryArtifact.abi as Abi,
      bytecode: factoryArtifact.bytecode as Hex,
      args: [BigInt(4663), USDG],
    });
    const request = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_estimateGas",
      params: [{ from: OWNER, data }],
    });

    expect(rpcPayloadBytes(request)).toBeGreaterThan(64_000);
    expect(rpcPayloadBytes(request)).toBeLessThanOrEqual(RPC_MAX_PAYLOAD_BYTES);
    expect(rpcPayloadIsTooLarge(request)).toBe(false);
  });

  it("still rejects oversized RPC bodies", () => {
    expect(rpcPayloadIsTooLarge("x".repeat(RPC_MAX_PAYLOAD_BYTES + 1))).toBe(true);
  });
});
