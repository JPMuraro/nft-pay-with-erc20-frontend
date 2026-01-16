// Componente raiz do frontend: aplica estilos globais, exibe o header com conexão de carteira
// (RainbowKit) e organiza as seções do DApp (Admin, Usuários e Tokens), compondo os painéis
// que mintam/transferem ERC-20, definem preço do NFT, aprovam ERC-20 e realizam mint/transferência.
import { useEffect } from "react";
import "./App.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { AdminPanel } from "./components/AdminPanel";
import { ApproveMintCard } from "./components/ApproveMintCard";
import { TokensPanel } from "./components/TokensPanel";


export default function App() {
  useEffect(() => {
  }, []);

  return (
    <div className="container">
      <header className="header">
        <div>
          <div className="title">DApp — Mint NFT pagando com ERC-20</div>
          <div className="subtitle">Hardhat Local (31337) • wagmi/viem • RainbowKit</div>
        </div>
        <ConnectButton />
      </header>

      <section className="section">
        <h2>Administração</h2>
        <p className="muted">Ações restritas ao owner dos contratos (ERC-20 e ERC-721).</p>
        <AdminPanel />
      </section>

      <section className="section">
        <h2>Usuários</h2>
        <p className="muted">Fluxo completo: Aprovar ERC-20 → Mintar NFT.</p>
        <ApproveMintCard />
      </section>

      <section className="section">
        <h2>Tokens</h2>
        <p className="muted">Lista de NFTs da carteira e transferência de NFT para outra wallet.</p>
        <TokensPanel />
      </section>
    </div>
  );
}
