export const RPC_MAX_PAYLOAD_BYTES = 128_000;

export function rpcPayloadBytes(payload: string) {
  return new TextEncoder().encode(payload).byteLength;
}

export function rpcPayloadIsTooLarge(payload: string) {
  return rpcPayloadBytes(payload) > RPC_MAX_PAYLOAD_BYTES;
}
