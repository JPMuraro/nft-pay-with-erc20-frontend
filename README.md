# nft-pay-with-erc20-frontend (Vite + React + RainbowKit + wagmi/viem)

Frontend do projeto acadêmico: **DApp para cunhar (mintar) um NFT (ERC-721) pagando com um token fungível (ERC-20)** via fluxo **approve → transferFrom → mint**.

Este repositório contém a aplicação React que:
- conecta wallet via **RainbowKit**
- exibe painel de **Administração** (ações restritas ao owner)
- permite o fluxo do usuário: **Aprovar ERC-20 → Mintar NFT**
- lista NFTs da carteira e permite **transferir NFT** para outra wallet

---

## Sumário
- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura e pastas](#arquitetura-e-pastas)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do WalletConnect Project ID](#configuração-do-walletconnect-project-id)
- [Como rodar do zero (clone limpo)](#como-rodar-do-zero-clone-limpo)
- [Comandos disponíveis](#comandos-disponíveis)
- [Fluxo de demonstração (passo a passo)](#fluxo-de-demonstração-passo-a-passo)
- [Troubleshooting](#troubleshooting)
- [Segurança](#segurança)
- [Licença](#licença)

---

## Visão geral
O app foi construído para funcionar em **rede local Hardhat** (ChainId **31337**) e se integra ao backend do repositório:

- **Smart contracts:** `nft-pay-with-erc20-contracts`

O frontend lê os endereços dos contratos do arquivo:
- `../nft-pay-with-erc20-contracts/deployments/localhost.json`

e gera automaticamente:
- `src/contracts/addresses.ts`

por meio do comando:
- `npm run sync:addresses`

---

## Funcionalidades

### 1) Header
- Conexão da carteira via RainbowKit.
- Exibe a wallet conectada e (normalmente) reforça a rede correta.

### 2) Administração (somente owner)
**Ações restritas ao owner dos contratos:**
- **Cunhar e transferir tokens (ERC-20)**  
  Chama `mintAndTransfer(to, amount)` no MuraroToken.
- **Atualizar preço do NFT (ERC-721)**  
  Chama `setPrice(newPrice)` no MuraroNFT.

> O app consulta `owner()` dos contratos e mostra mensagem quando a wallet conectada não é o owner.  
> Mesmo que você clique, o contrato bloqueia em runtime.

### 3) Usuários (fluxo approve → mint)
- Consulta `price()` do NFT (ERC-721).
- Consulta `balanceOf()` do ERC-20 na carteira conectada.
- Consulta `allowance(owner, spender)` do ERC-20, onde:
  - `owner` = wallet do usuário
  - `spender` = endereço do MuraroNFT
- Botões:
  - **Aprovar ERC-20** (approve para o MuraroNFT)
  - **Mintar NFT** (mint no MuraroNFT, que cobra via transferFrom)

Estados de UI:
- loading, erro, sucesso
- hashes e status confirmados via `useWaitForTransactionReceipt`

### 4) Tokens
- Lista NFTs da carteira conectada por reconstrução de eventos `Transfer`
  - funciona mesmo sem ERC721Enumerable
- Transferência de NFT para outra wallet via `transferFrom(from, to, tokenId)`

---

## Arquitetura e pastas

Estrutura típica:
```text
nft-pay-with-erc20-frontend/
├─ src/
│  ├─ components/
│  │  ├─ AdminPanel.tsx
│  │  ├─ MintAndTransferCard.tsx
│  │  ├─ SetPriceCard.tsx
│  │  ├─ ApproveMintCard.tsx
│  │  ├─ TokensPanel.tsx
│  │  ├─ MyNftsCard.tsx
│  │  └─ TransferNftCard.tsx
│  ├─ contracts/
│  │  ├─ abis.ts
│  │  └─ addresses.ts       (gerado pelo sync:addresses)
│  ├─ utils/
│  │  ├─ envCheck.ts
│  │  ├─ evm.ts
│  │  └─ format.ts
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ App.css
├─ scripts/
│  └─ sync-addresses.mjs
├─ .env.example
├─ .gitignore
├─ package.json
└─ README.md

```
