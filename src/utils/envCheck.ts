// src/utils/envCheck.ts
// Apenas loga no console para facilitar debug local.

const pid = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? import.meta.env.VITE_WC_PROJECT_ID;

if (pid) {
  console.log("[ENV CHECK] OK: Project ID encontrado:", pid.slice(0, 6) + "..." + pid.slice(-6));
  console.log("[ENV CHECK] Formato hex-like:", /^[0-9a-fA-F]+$/.test(pid) ? "SIM" : "NÃO");
} else {
  console.warn("[ENV CHECK] AVISO: WalletConnect Project ID não encontrado no .env");
}
