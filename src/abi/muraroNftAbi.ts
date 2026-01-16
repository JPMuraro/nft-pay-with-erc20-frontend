// ABI (Application Binary Interface) do contrato MuraroNFT,
// contendo as definições das funções públicas `owner()`
// e `price()` (leitura) e `setPrice(uint256)` 
// (atualização), para permitir que o frontend 
// interaja com o contrato via bibliotecas 
// EVM (ex.: viem/wagmi).
export const muraroNftAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "price",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "setPrice",
    stateMutability: "nonpayable",
    inputs: [{ name: "newPrice", type: "uint256" }],
    outputs: [],
  },
] as const;
