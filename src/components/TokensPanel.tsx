// Componente React que compõe o painel de tokens/NFTs: exibe a lista de NFTs da carteira e,
// ao selecionar um tokenId, preenche o estado local para ser usado no formulário de transferência.
import { useState } from "react";
import { MyNftsCard } from "./MyNftsCard";
import { TransferNftCard } from "./TransferNftCard";

export function TokensPanel() {
  const [tokenId, setTokenId] = useState<string>("");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <MyNftsCard onSelectTokenId={(id) => setTokenId(id.toString())} />
      <TransferNftCard tokenIdValue={tokenId} onTokenIdChange={setTokenId} />
    </div>
  );
}
