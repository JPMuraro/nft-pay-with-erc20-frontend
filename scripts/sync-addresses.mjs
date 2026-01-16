// Script Node.js que lê o arquivo de deploy
// `deployments/localhost.json` do repositório de contratos
// (assumido como vizinho do frontend), extrai os endereços do 
// ERC-20 e ERC-721 (aceitando múltiplos formatos de chave), 
// e gera/atualiza `src/contracts/addresses.ts` no frontend 
// com `CHAIN_ID`, endereços tipados e versões encurtadas 
// para uso na aplicação.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function fail(msg) {
  console.error(`[sync:addresses] ERRO: ${msg}`);
  process.exit(1);
}

function short(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const frontendRoot = process.cwd();
const contractsDeployPath = path.resolve(
  frontendRoot,
  "..",
  "nft-pay-with-erc20-contracts",
  "deployments",
  "localhost.json"
);

if (!fs.existsSync(contractsDeployPath)) {
  fail(
    `Não encontrei o arquivo de deploy em:\n  ${contractsDeployPath}\n\n` +
      `Solução:\n` +
      `1) Garanta que o repo de contratos está ao lado do frontend (../nft-pay-with-erc20-contracts)\n` +
      `2) Rode no backend: npx hardhat run scripts/deploy.ts --network localhost\n`
  );
}

const raw = fs.readFileSync(contractsDeployPath, "utf-8");
let json;
try {
  json = JSON.parse(raw);
} catch (e) {
  fail(`Falha ao parsear JSON do deploy: ${String(e)}`);
}

const token =
  json.MuraroToken ??
  json.muraroToken ??
  json.token ??
  json.erc20 ??
  json.tokenAddress ??
  json.token_address ??
  json.paymentToken ??
  json.paymentTokenAddress;

const nft =
  json.MuraroNFT ??
  json.muraroNFT ??
  json.nft ??
  json.erc721 ??
  json.nftAddress ??
  json.nft_address;

const chainId = json.chainId ?? 31337;

if (!token || !nft) {
  fail(
    `Não encontrei endereços no deployments/localhost.json.\n` +
      `Campos encontrados: ${Object.keys(json).join(", ")}\n\n` +
      `Esperado um dos formatos:\n` +
      `- MuraroToken / MuraroNFT\n` +
      `- tokenAddress / nftAddress\n`
  );
}

const outDir = path.resolve(frontendRoot, "src", "contracts");
const outFile = path.resolve(outDir, "addresses.ts");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const content = `// AUTO-GERADO por scripts/sync-addresses.mjs
// Fonte: ${path.relative(frontendRoot, contractsDeployPath)}
// Para atualizar: npm run sync:addresses

import type { Address } from "viem";

export const CHAIN_ID = ${Number(chainId)} as const;

export const MURARO_TOKEN_ADDRESS = "${token}" as Address;
export const MURARO_NFT_ADDRESS = "${nft}" as Address;

export const SHORT = {
  token: "${short(token)}",
  nft: "${short(nft)}",
} as const;
`;

fs.writeFileSync(outFile, content, "utf-8");

console.log("[sync:addresses] OK");
console.log("  chainId:", chainId);
console.log("  token:", token);
console.log("  nft:  ", nft);
console.log("  wrote:", outFile);
