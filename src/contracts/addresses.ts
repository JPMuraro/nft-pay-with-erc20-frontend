/**
 * Define os endereços dos contratos por chainId e retorna null quando a rede não é suportada,
 * evitando leituras incorretas (ex.: owner virando 0x0000…0000 por ausência de bytecode).
 */
import type { Address } from "viem";

export const HARDHAT_CHAIN_ID = 31337 as const;

export type ContractsAddresses = {
  chainId: number;
  tokenAddress: Address;
  nftAddress: Address;
};

const LOCALHOST: ContractsAddresses = {
  chainId: HARDHAT_CHAIN_ID,
  tokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  nftAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

export function getAddresses(chainId?: number): ContractsAddresses | null {
  if (!chainId || chainId === HARDHAT_CHAIN_ID) return LOCALHOST;
  return null;
}
