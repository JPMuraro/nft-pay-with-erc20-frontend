/**
 * Utilitários EVM para encurtar endereços/hashes e validar/normalizar strings no formato de address.
 */
import type { Address } from "viem";

export function shortAddress(
  value?: Address | `0x${string}` | string | null,
  chars: number = 6,
  tail: number = 4
): string {
  if (!value) return "0x0000…0000";

  const v = String(value);
  if (!v.startsWith("0x")) return v;

  const minLen = 2 + chars + tail;
  if (v.length <= minLen) return v;

  return `${v.slice(0, 2 + chars)}…${v.slice(-tail)}`;
}

export const shortAddr = shortAddress;
export const shortHex = shortAddress;
export const shortTx = shortAddress;
export const shorten = shortAddress;
export const ellipsis = shortAddress;

export function isAddressLike(v?: string | null): v is Address {
  if (!v) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

export function normalizeAddress(v: string): string {
  return v.trim();
}
