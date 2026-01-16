// Configuração do wagmi/RainbowKit para o DApp: lê o WalletConnect Project ID do .env (com fallback),
// cria o `wagmiConfig` via `getDefaultConfig`, habilita a chain Hardhat e define o transporte HTTP
// apontando para o nó local (127.0.0.1:8545), além de emitir aviso no console se o Project ID faltar.
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { hardhat } from "wagmi/chains";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? import.meta.env.VITE_WC_PROJECT_ID;

if (!projectId) {
  console.warn("[WAGMI] WalletConnect Project ID ausente no .env");
}

export const wagmiConfig = getDefaultConfig({
  appName: "Muraro NFT Pay with ERC20",
  projectId: projectId || "00000000000000000000000000000000",
  chains: [hardhat],

  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },

  ssr: false,
});
