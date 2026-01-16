// Componente React que renderiza o painel administrativo em layout de grid,
// exibindo os cards de ações de admin: cunhar/transferir tokens e definir preço.
import { MintAndTransferCard } from "./MintAndTransferCard";
import { SetPriceCard } from "./SetPriceCard";

export function AdminPanel() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <MintAndTransferCard />
      <SetPriceCard />
    </div>
  );
}
