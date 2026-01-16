import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { HARDHAT_CHAIN_ID, getContracts } from "../contracts";
import { ERC20_ABI, ERC721_ABI } from "../contracts/abis";
import { shortAddress } from "../utils/evm";
import { TxStatus } from "./TxStatus";

export function SetPriceCard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = chainId !== HARDHAT_CHAIN_ID;

  const contracts = useMemo(() => getContracts(chainId), [chainId]);
  const tokenAddress = contracts?.tokenAddress;
  const nftAddress = contracts?.nftAddress;

  const [newPrice, setNewPrice] = useState<string>("10");
  const [uiError, setUiError] = useState<string | null>(null);

  const { data: nftOwnerData, refetch: refetchNftOwner } = useReadContract({
    address: nftAddress as Address,
    abi: ERC721_ABI,
    functionName: "owner",
    query: { enabled: Boolean(nftAddress) },
  });

  const nftOwner = (nftOwnerData ??
    "0x0000000000000000000000000000000000000000") as Address;

  const { data: decimalsData } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: Boolean(tokenAddress) },
  });

  const tokenDecimals = Number(decimalsData ?? 18);

  const { data: symbolData } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: Boolean(tokenAddress) },
  });

  const tokenSymbol = (symbolData ?? "TOKEN") as string;

  const { data: priceData, refetch: refetchPrice } = useReadContract({
    address: nftAddress as Address,
    abi: ERC721_ABI,
    functionName: "price",
    query: { enabled: Boolean(nftAddress) },
  });

  const currentPrice = (priceData ?? 0n) as bigint;

  const currentPriceText = useMemo(() => {
    return `${formatUnits(currentPrice, tokenDecimals)} ${tokenSymbol}`;
  }, [currentPrice, tokenDecimals, tokenSymbol]);

  const isOwner = useMemo(() => {
    if (!address) return false;
    return address.toLowerCase() === nftOwner.toLowerCase();
  }, [address, nftOwner]);

  const {
    writeContract,
    data: txHash,
    isPending: isSigning,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isMining,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const busy = isSigning || isMining;

  const preview = useMemo(() => {
    const v = (newPrice || "").trim();
    if (!v) return null;
    try {
      const units = parseUnits(v, tokenDecimals);
      return `${formatUnits(units, tokenDecimals)} ${tokenSymbol} (units: ${units.toString()})`;
    } catch {
      return null;
    }
  }, [newPrice, tokenDecimals, tokenSymbol]);

  function onSubmit() {
    setUiError(null);

    if (!isConnected || !address) return setUiError("Conecte a carteira.");
    if (wrongNetwork) return setUiError("Troque para a rede Hardhat (chainId 31337).");
    if (!nftAddress) return setUiError("Endereço do NFT não encontrado para esta rede.");
    if (!isOwner) return setUiError("Sua carteira não é o owner do ERC-721 (ação bloqueada pelo contrato).");

    const v = newPrice.trim();
    if (!v) return setUiError("Informe o novo preço.");

    let units: bigint;
    try {
      units = parseUnits(v, tokenDecimals);
    } catch {
      return setUiError("Preço inválido. Use formato numérico, ex: 10 ou 10.5");
    }
    if (units <= 0n) return setUiError("Preço deve ser maior que zero.");

    writeContract({
      address: nftAddress,
      abi: ERC721_ABI,
      functionName: "setPrice",
      args: [units] as const,
    });
  }

  useEffect(() => {
    if (!isSuccess) return;
    refetchPrice();
    refetchNftOwner();
  }, [isSuccess, refetchPrice, refetchNftOwner]);

  const errText = (writeError?.message ?? receiptError?.message ?? "").split("\n")[0] || undefined;

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">Atualizar preço do NFT (ERC-721)</div>
        <div className="cardSub">
          NFT: <b>{nftAddress ? shortAddress(nftAddress) : "-"}</b>
        </div>
      </div>

      <div className="kvRow">
        <div className="k">Owner do ERC-721</div>
        <div className="v">{nftOwner ? shortAddress(nftOwner) : "-"}</div>
      </div>

      <div className="kvRow">
        <div className="k">Preço atual</div>
        <div className="v">{currentPriceText}</div>
      </div>

      <div className="form">
        <label className="label">Novo preço ({tokenSymbol})</label>
        <input
          className="input"
          placeholder="10"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          spellCheck={false}
        />

        {preview ? <div className="muted">Prévia: {preview}</div> : null}
        {uiError ? <div className="errorBox">{uiError}</div> : null}

        <button className="btn primary" onClick={onSubmit} disabled={busy || !isConnected || wrongNetwork}>
          {busy ? "Enviando…" : "Set Price"}
        </button>
      </div>

      <TxStatus
        title="Transação: setPrice"
        hash={txHash}
        isPending={isMining}
        isSuccess={isSuccess}
        isError={Boolean(writeError || isReceiptError)}
        errorText={errText}
      />

      {!isOwner && isConnected ? (
        <div className="warn" style={{ marginTop: 10 }}>
          Observação: apenas o <b>owner</b> do ERC-721 pode alterar o preço.
        </div>
      ) : null}
    </div>
  );
}
