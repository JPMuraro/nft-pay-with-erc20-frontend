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

  // bloco atual (watch) para refetch automático
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [uiError, setUiError] = useState<string | null>(null);

  // --- Leitura: decimals + symbol do token
  const { data: decimalsData } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: enabledToken && !wrongNetwork },
  });
  const tokenDecimals = Number(decimalsData ?? 18);

  const { data: symbolData } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: enabledToken && !wrongNetwork },
  });
  const tokenSymbol = (symbolData ?? "TOKEN") as string;

  // --- Leitura: price do NFT
  const {
    data: priceData,
    refetch: refetchPrice,
    isLoading: isPriceLoading,
  } = useReadContract({
    address: nftAddress as Address,
    abi: ERC721_ABI,
    functionName: "price",
    query: { enabled: enabledNft && !wrongNetwork },
  });
  const price = (priceData ?? 0n) as bigint;

  // --- Leitura: balanceOf do token para a wallet conectada
  const {
    data: balanceData,
    refetch: refetchBalance,
    isLoading: isBalanceLoading,
  } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [(address ?? "0x0000000000000000000000000000000000000000") as Address],
    query: { enabled: enabledReads },
  });
  const balance = (balanceData ?? 0n) as bigint;

  // --- Leitura: allowance (wallet -> NFT)
  const {
    data: allowanceData,
    refetch: refetchAllowance,
    isLoading: isAllowanceLoading,
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
  const allowance = (allowanceData ?? 0n) as bigint;

  // --- Formatação
  const priceText = useMemo(() => formatUnits(price, tokenDecimals), [price, tokenDecimals]);
  const balanceText = useMemo(() => formatUnits(balance, tokenDecimals), [balance, tokenDecimals]);
  const allowanceText = useMemo(
    () => formatUnits(allowance, tokenDecimals),
    [allowance, tokenDecimals]
  );

  // --- Regras de habilitação
  const hasEnoughBalance = balance >= price && price > 0n;
  const hasEnoughAllowance = allowance >= price && price > 0n;

  // --- Approve tx
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

  // --- Mint tx
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

  // Refetch em todo novo bloco (mantém tela atualizada após admin tx)
  useEffect(() => {
    if (!blockNumber) return;
    if (!enabledToken && !enabledNft) return;
    // refetch básico (mesmo sem wallet conectada, refetchPrice funciona)
    if (!wrongNetwork) {
      refetchPrice();
      if (enabledReads) {
        refetchBalance();
        refetchAllowance();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  // Refetch após confirmar approve
  useEffect(() => {
    if (!isApproveSuccess) return;
    refetchAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveSuccess]);

  // Refetch após confirmar mint
  useEffect(() => {
    if (!isMintSuccess) return;
    refetchBalance();
    refetchAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMintSuccess]);

  function onApprove() {
    setUiError(null);

    if (!isConnected || !address) return setUiError("Conecte a carteira.");
    if (wrongNetwork) return setUiError("Troque para a rede Hardhat (chainId 31337).");
    if (!tokenAddress || !nftAddress) return setUiError("Endereços dos contratos não encontrados.");
    if (price <= 0n) return setUiError("Preço inválido (0). Ajuste no Admin (setPrice).");

    // Approve exatamente o preço atual
    writeApprove({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [nftAddress, price] as const,
    });
  }

  function onMint() {
    setUiError(null);

    if (!isConnected || !address) return setUiError("Conecte a carteira.");
    if (wrongNetwork) return setUiError("Troque para a rede Hardhat (chainId 31337).");
    if (!nftAddress) return setUiError("Endereço do NFT não encontrado.");
    if (price <= 0n) return setUiError("Preço inválido (0). Ajuste no Admin (setPrice).");
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

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">Mint do NFT pagando com ERC-20</div>
        <div className="cardSub">Rede: {chainId} {wrongNetwork ? "(rede incorreta)" : "(Hardhat OK)"}</div>
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
        <div className="v">{isPriceLoading ? "Carregando…" : `${priceText} ${tokenSymbol}`}</div>
      </div>

      <div className="kvRow">
        <div className="k">Saldo MuraroToken</div>
        <div className="v">{isBalanceLoading ? "Carregando…" : `${balanceText} ${tokenSymbol}`}</div>
      </div>

      <div className="kvRow">
        <div className="k">Allowance</div>
        <div className="v">{isAllowanceLoading ? "Carregando…" : `${allowanceText} ${tokenSymbol}`}</div>
      </div>

      {!wrongNetwork && price > 0n && enabledWallet && !hasEnoughBalance ? (
        <div className="warn" style={{ marginTop: 10 }}>
          Saldo insuficiente de MuraroToken (ERC-20) para mintar (precisa do preço).
        </div>
      ) : null}

      {uiError ? <div className="errorBox" style={{ marginTop: 10 }}>{uiError}</div> : null}

      <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: "wrap" }}>
        <button
          className="btn"
          onClick={refetchAll}
          disabled={wrongNetwork}
          title="Atualiza price/balance/allowance"
        >
          Recarregar
        </button>

        <button
          className="btn primary"
          onClick={onApprove}
          disabled={
            wrongNetwork ||
            !enabledWallet ||
            approveBusy ||
            price <= 0n ||
            tokenAddress == null ||
            nftAddress == null
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
            price <= 0n ||
            !hasEnoughBalance ||
            !hasEnoughAllowance ||
            nftAddress == null
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
