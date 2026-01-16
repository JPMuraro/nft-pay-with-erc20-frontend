/**
 * Card de usuário que executa o fluxo completo de compra: lê preço do NFT, saldo e allowance do ERC-20,
 * permite aprovar exatamente o valor do preço e depois mintar o NFT pagando com o ERC-20, exibindo
 * status de transações e estados de carregamento/erro sem usar valores “falsos” de fallback na UI.
 */
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Address } from "viem";
import {
  useAccount,
  useBlockNumber,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { HARDHAT_CHAIN_ID, getContracts } from "../contracts";
import { ERC20_ABI, ERC721_ABI } from "../contracts/abis";
import { shortAddress } from "../utils/evm";
import { TxStatus } from "./TxStatus";

export function ApproveMintCard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = chainId !== HARDHAT_CHAIN_ID;

  const contracts = useMemo(() => getContracts(chainId), [chainId]);
  const tokenAddress = contracts?.tokenAddress;
  const nftAddress = contracts?.nftAddress;

  const enabledToken = Boolean(tokenAddress);
  const enabledNft = Boolean(nftAddress);
  const enabledWallet = Boolean(address && isConnected);
  const enabledReads = enabledToken && enabledNft && enabledWallet && !wrongNetwork;

  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [uiError, setUiError] = useState<string | null>(null);

  const {
    data: decimalsData,
    isLoading: isDecimalsLoading,
    isError: isDecimalsError,
  } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: enabledToken && !wrongNetwork },
  });
  const tokenDecimals = Number(decimalsData ?? 18);

  const {
    data: symbolData,
    isLoading: isSymbolLoading,
    isError: isSymbolError,
  } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: enabledToken && !wrongNetwork },
  });
  const tokenSymbol = (symbolData ?? "TOKEN") as string;

  const {
    data: priceData,
    refetch: refetchPrice,
    isLoading: isPriceLoading,
    isError: isPriceError,
  } = useReadContract({
    address: nftAddress as Address,
    abi: ERC721_ABI,
    functionName: "price",
    query: { enabled: enabledNft && !wrongNetwork },
  });
  const price = priceData as bigint | undefined;
  const hasPrice = price != null;

  const {
    data: balanceData,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [(address ?? "0x0000000000000000000000000000000000000000") as Address],
    query: { enabled: enabledReads },
  });
  const balance = balanceData as bigint | undefined;
  const hasBalance = balance != null;

  const {
    data: allowanceData,
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading,
    isError: isAllowanceError,
  } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [
      (address ?? "0x0000000000000000000000000000000000000000") as Address,
      (nftAddress ?? "0x0000000000000000000000000000000000000000") as Address,
    ],
    query: { enabled: enabledReads },
  });
  const allowance = allowanceData as bigint | undefined;
  const hasAllowance = allowance != null;

  const priceText = useMemo(() => {
    if (!hasPrice) return null;
    return formatUnits(price as bigint, tokenDecimals);
  }, [hasPrice, price, tokenDecimals]);

  const balanceText = useMemo(() => {
    if (!hasBalance) return null;
    return formatUnits(balance as bigint, tokenDecimals);
  }, [hasBalance, balance, tokenDecimals]);

  const allowanceText = useMemo(() => {
    if (!hasAllowance) return null;
    return formatUnits(allowance as bigint, tokenDecimals);
  }, [hasAllowance, allowance, tokenDecimals]);

  const hasValidPrice = hasPrice && (price as bigint) > 0n;

  const hasEnoughBalance =
    hasValidPrice && hasBalance && (balance as bigint) >= (price as bigint);

  const hasEnoughAllowance =
    hasValidPrice && hasAllowance && (allowance as bigint) >= (price as bigint);

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApproveSigning,
    error: approveWriteError,
  } = useWriteContract();

  const {
    isLoading: isApproveMining,
    isSuccess: isApproveSuccess,
    isError: isApproveReceiptError,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
    query: { enabled: Boolean(approveHash) },
  });

  const {
    writeContract: writeMint,
    data: mintHash,
    isPending: isMintSigning,
    error: mintWriteError,
  } = useWriteContract();

  const {
    isLoading: isMintMining,
    isSuccess: isMintSuccess,
    isError: isMintReceiptError,
    error: mintReceiptError,
  } = useWaitForTransactionReceipt({
    hash: mintHash,
    query: { enabled: Boolean(mintHash) },
  });

  const approveBusy = isApproveSigning || isApproveMining;
  const mintBusy = isMintSigning || isMintMining;

  function refetchAll() {
    if (wrongNetwork) return;
    refetchPrice();
    refetchBalance();
    refetchAllowance();
  }

  useEffect(() => {
    if (!blockNumber) return;
    if (wrongNetwork) return;
    if (enabledNft) refetchPrice();
    if (enabledReads) {
      refetchBalance();
      refetchAllowance();
    }
  }, [
    blockNumber,
    wrongNetwork,
    enabledNft,
    enabledReads,
    refetchPrice,
    refetchBalance,
    refetchAllowance,
  ]);

  useEffect(() => {
    if (!isApproveSuccess) return;
    refetchAllowance();
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (!isMintSuccess) return;
    refetchBalance();
    refetchAllowance();
  }, [isMintSuccess, refetchBalance, refetchAllowance]);

  function onApprove() {
    setUiError(null);

    if (!isConnected || !address) return setUiError("Conecte a carteira.");
    if (wrongNetwork) return setUiError("Troque para a rede Hardhat (chainId 31337).");
    if (!tokenAddress || !nftAddress) return setUiError("Endereços dos contratos não encontrados.");
    if (!hasPrice) return setUiError("Carregando preço do NFT… aguarde.");
    if ((price as bigint) <= 0n) return setUiError("Preço inválido (0). Ajuste no Admin (setPrice).");

    writeApprove({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [nftAddress, price as bigint] as const,
    });
  }

  function onMint() {
    setUiError(null);

    if (!isConnected || !address) return setUiError("Conecte a carteira.");
    if (wrongNetwork) return setUiError("Troque para a rede Hardhat (chainId 31337).");
    if (!nftAddress) return setUiError("Endereço do NFT não encontrado.");
    if (!hasPrice) return setUiError("Carregando preço do NFT… aguarde.");
    if ((price as bigint) <= 0n) return setUiError("Preço inválido (0). Ajuste no Admin (setPrice).");
    if (!hasEnoughBalance) return setUiError("Saldo insuficiente de ERC-20 para pagar o NFT.");
    if (!hasEnoughAllowance) return setUiError("Faça o approve antes de mintar.");

    writeMint({
      address: nftAddress,
      abi: ERC721_ABI,
      functionName: "mint",
      args: [] as const,
    });
  }

  const approveErrText =
    (approveWriteError?.message ?? approveReceiptError?.message ?? "").split("\n")[0] || undefined;

  const mintErrText =
    (mintWriteError?.message ?? mintReceiptError?.message ?? "").split("\n")[0] || undefined;

  const tokenMetaLoading = isDecimalsLoading || isSymbolLoading;
  const tokenMetaError = isDecimalsError || isSymbolError;

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">Mint do NFT pagando com ERC-20</div>
        <div className="cardSub">
          Rede: {chainId} {wrongNetwork ? "(rede incorreta)" : "(Hardhat OK)"}
        </div>
      </div>

      <div className="kvRow">
        <div className="k">Wallet</div>
        <div className="v">{address ? shortAddress(address) : "-"}</div>
      </div>

      <div className="kvRow">
        <div className="k">Token (ERC-20)</div>
        <div className="v">{tokenAddress ? shortAddress(tokenAddress) : "-"}</div>
      </div>

      <div className="kvRow">
        <div className="k">NFT (ERC-721)</div>
        <div className="v">{nftAddress ? shortAddress(nftAddress) : "-"}</div>
      </div>

      <div className="kvRow">
        <div className="k">Preço</div>
        <div className="v">
          {wrongNetwork ? (
            "-"
          ) : isPriceLoading && !hasPrice ? (
            "Carregando…"
          ) : isPriceError ? (
            "Erro ao ler preço"
          ) : hasPrice ? (
            `${priceText} ${tokenSymbol}${isPriceLoading ? " (atualizando…)" : ""}`
          ) : (
            "-"
          )}
        </div>
      </div>

      <div className="kvRow">
        <div className="k">Saldo MuraroToken</div>
        <div className="v">
          {wrongNetwork ? (
            "-"
          ) : !enabledWallet ? (
            "-"
          ) : isBalanceLoading && !hasBalance ? (
            "Carregando…"
          ) : isBalanceError ? (
            "Erro ao ler saldo"
          ) : hasBalance ? (
            `${balanceText} ${tokenSymbol}${isBalanceLoading ? " (atualizando…)" : ""}`
          ) : (
            "-"
          )}
        </div>
      </div>

      <div className="kvRow">
        <div className="k">Allowance</div>
        <div className="v">
          {wrongNetwork ? (
            "-"
          ) : !enabledWallet ? (
            "-"
          ) : isAllowanceLoading && !hasAllowance ? (
            "Carregando…"
          ) : isAllowanceError ? (
            "Erro ao ler allowance"
          ) : hasAllowance ? (
            `${allowanceText} ${tokenSymbol}${isAllowanceLoading ? " (atualizando…)" : ""}`
          ) : (
            "-"
          )}
        </div>
      </div>

      {!wrongNetwork && hasValidPrice && enabledWallet && hasBalance && !hasEnoughBalance ? (
        <div className="warn" style={{ marginTop: 10 }}>
          Saldo insuficiente de MuraroToken (ERC-20) para mintar (precisa do preço).
        </div>
      ) : null}

      {tokenMetaError ? (
        <div className="warn" style={{ marginTop: 10 }}>
          Não foi possível ler metadados do token (symbol/decimals). A UI pode exibir valores genéricos.
        </div>
      ) : null}

      {uiError ? (
        <div className="errorBox" style={{ marginTop: 10 }}>
          {uiError}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: "wrap" }}>
        <button className="btn" onClick={refetchAll} disabled={wrongNetwork} title="Atualiza price/balance/allowance">
          Recarregar
        </button>

        <button
          className="btn primary"
          onClick={onApprove}
          disabled={
            wrongNetwork ||
            !enabledWallet ||
            approveBusy ||
            !hasPrice ||
            !hasValidPrice ||
            tokenAddress == null ||
            nftAddress == null ||
            tokenMetaLoading
          }
        >
          {approveBusy ? "Aprovando…" : hasEnoughAllowance ? "Approve OK" : "Aprovar ERC-20"}
        </button>

        <button
          className="btn primary"
          onClick={onMint}
          disabled={
            wrongNetwork ||
            !enabledWallet ||
            mintBusy ||
            !hasPrice ||
            !hasValidPrice ||
            !hasEnoughBalance ||
            !hasEnoughAllowance ||
            nftAddress == null ||
            tokenMetaLoading
          }
        >
          {mintBusy ? "Mintando…" : "Mintar NFT"}
        </button>
      </div>

      <TxStatus
        title="Transação: Approve"
        hash={approveHash}
        isPending={isApproveMining}
        isSuccess={isApproveSuccess}
        isError={Boolean(approveWriteError || isApproveReceiptError)}
        errorText={approveErrText}
      />

      <TxStatus
        title="Transação: Mint"
        hash={mintHash}
        isPending={isMintMining}
        isSuccess={isMintSuccess}
        isError={Boolean(mintWriteError || isMintReceiptError)}
        errorText={mintErrText}
      />

      <div className="muted" style={{ marginTop: 10 }}>
        Observação: “Saldo” aqui é do MuraroToken (ERC-20), não do ETH da rede local.
      </div>
    </div>
  );
}
