import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { hardhat } from "wagmi/chains";

// Usa o Project ID que você já validou no ENV CHECK.
// Ajuste o nome da variável se você estiver usando outro nome no .env
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? import.meta.env.VITE_WC_PROJECT_ID;

if (!projectId) {
  // Não quebramos o build, mas deixamos explícito no console.
  // O envCheck.ts já deve estar acusando se não existir.
  // eslint-disable-next-line no-console
  console.warn("[WAGMI] WalletConnect Project ID ausente no .env");
}

export const wagmiConfig = getDefaultConfig({
  appName: "Muraro NFT Pay with ERC20",
  projectId: projectId || "00000000000000000000000000000000",
  chains: [hardhat],

  // CRÍTICO: apontar o publicClient do wagmi para o Hardhat local
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },

  ssr: false,
});
