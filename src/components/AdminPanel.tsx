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
