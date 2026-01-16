import type { Address } from "viem";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

/**
 * Topic0 do evento Transfer(address,address,uint256)
 * (mesma assinatura em ERC-20 e ERC-721; por isso filtramos pelo address do contrato NFT)
 */
export const TRANSFER_TOPIC0 =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" as const;

export type TxLog = {
  address: Address;
  topics: readonly `0x${string}`[];
  data: `0x${string}`;
};

export function isZeroAddress(addr?: string | null): boolean {
  if (!addr) return true;
  return addr.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

export function shortAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}

function topicToAddress(topic: `0x${string}`): Address {
  // topic é 32 bytes: pega os últimos 20 bytes (40 hex chars)
  const hex = topic.slice(-40);
  return (`0x${hex}`) as Address;
}

function hexToBigInt(hex: `0x${string}`): bigint {
  return BigInt(hex);
}

export function extractMintedTokenId(params: {
  receiptLogs: readonly TxLog[];
  nftAddress: Address;
  minter: Address;
}): bigint | null {
  const nftAddr = params.nftAddress.toLowerCase();
  const minter = params.minter.toLowerCase();

  // 1) Preferência: mint padrão => from == ZERO e to == minter
  for (const log of params.receiptLogs) {
    if (log.address.toLowerCase() !== nftAddr) continue;
    if (!log.topics || log.topics.length < 3) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC0) continue;

    // Caso padrão (tokenId indexed): topics[3]
    if (log.topics.length >= 4) {
      const from = topicToAddress(log.topics[1]).toLowerCase();
      const to = topicToAddress(log.topics[2]).toLowerCase();
      const tokenId = hexToBigInt(log.topics[3]);

      if (from === ZERO_ADDRESS.toLowerCase() && to === minter) return tokenId;
    }

    // Caso alternativo (tokenId não-indexado): tokenId pode estar no data
    if (log.topics.length === 3) {
      const from = topicToAddress(log.topics[1]).toLowerCase();
      const to = topicToAddress(log.topics[2]).toLowerCase();
      const tokenId = hexToBigInt(log.data);

      if (from === ZERO_ADDRESS.toLowerCase() && to === minter) return tokenId;
    }
  }

  // 2) Fallback: se não bater o "to==minter", ainda assim pega o primeiro mint (from==ZERO)
  for (const log of params.receiptLogs) {
    if (log.address.toLowerCase() !== nftAddr) continue;
    if (!log.topics || log.topics.length < 3) continue;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC0) continue;

    if (log.topics.length >= 4) {
      const from = topicToAddress(log.topics[1]).toLowerCase();
      const tokenId = hexToBigInt(log.topics[3]);
      if (from === ZERO_ADDRESS.toLowerCase()) return tokenId;
    }

    if (log.topics.length === 3) {
      const from = topicToAddress(log.topics[1]).toLowerCase();
      const tokenId = hexToBigInt(log.data);
      if (from === ZERO_ADDRESS.toLowerCase()) return tokenId;
    }
  }

  return null;
}
