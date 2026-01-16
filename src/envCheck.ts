// src/envCheck.ts
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

function mask(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-6)}`;
}

if (!projectId) {
  console.error(
    "[ENV CHECK] ERRO: VITE_WALLETCONNECT_PROJECT_ID não foi carregado. " +
      "Verifique se o arquivo .env está na raiz do projeto (mesmo nível do package.json) " +
      "e reinicie o servidor (npm run dev)."
  );
} else {
  const isHexLike = /^[a-fA-F0-9]+$/.test(projectId);
  console.log("[ENV CHECK] OK: Project ID encontrado:", mask(projectId));
  console.log("[ENV CHECK] Formato hex-like:", isHexLike ? "SIM" : "NÃO (pode ser ok, depende do ID)");
}
