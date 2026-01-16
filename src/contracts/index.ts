import type { Address } from "viem";
import { getAddresses, HARDHAT_CHAIN_ID } from "./addresses";

export { HARDHAT_CHAIN_ID } from "./addresses";
export { ERC20_ABI, ERC721_ABI } from "./abis";

export function getContracts(chainId?: number): {
  tokenAddress: Address;
  nftAddress: Address;
} | null {
  const addrs = getAddresses(chainId);
  if (!addrs) return null;
  return {
    tokenAddress: addrs.tokenAddress,
    nftAddress: addrs.nftAddress,
  };
}
