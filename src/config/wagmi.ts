import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat } from "wagmi/chains";
import { http } from "wagmi";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;

if (!projectId) {
  throw new Error("Faltou VITE_WALLETCONNECT_PROJECT_ID no arquivo .env");
}

export const wagmiConfig = getDefaultConfig({
  appName: "NFT pago com ERC-20 (Pós)",
  projectId,
  chains: [hardhat],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});
