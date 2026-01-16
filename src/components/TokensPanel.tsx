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
