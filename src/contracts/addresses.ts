import type { Address } from "viem";

export const HARDHAT_CHAIN_ID = 31337;

export type ContractAddresses = {
  tokenAddress: Address;
  nftAddress: Address;
};

// Deploy atual (terminal):
// MuraroToken: 0x5FbDB2315678afecb367f032d93F642f64180aa3
// MuraroNFT:   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
const LOCALHOST_ADDRESSES: ContractAddresses = {
  tokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  nftAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

export function getAddresses(chainId?: number): ContractAddresses | null {
  if (!chainId) return null;
  if (chainId === HARDHAT_CHAIN_ID) return LOCALHOST_ADDRESSES;
  return null;
}
