// ABI (Application Binary Interface) do contrato MuraroToken.
// Inclui as funções `owner()` e `balanceOf(address)` para leitura e
// `mintAndTransfer(address,uint256)` para cunhar e transferir tokens,
// permitindo integração do frontend via libs EVM (ex.: viem/wagmi).
export const muraroTokenAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintAndTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
