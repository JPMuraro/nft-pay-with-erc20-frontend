/**
 * Card de transferência de ERC-721 que valida tokenId e endereço do destinatário, lê ownerOf para UX
 * e executa transferFrom, exibindo estados de carregamento/erro sem renderizar owner “0x000…”.
 */
import { useEffect, useMemo, useState } from "react";
import { isAddress, type Address } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

import { HARDHAT_CHAIN_ID, getContracts } from "../contracts";
import { ERC721_ABI } from "../contracts/abis";
import { shortAddress } from "../utils/evm";
import { TxStatus } from "./TxStatus";

type Props = {
  tokenIdValue: string;
  onTokenIdChange: (v: string) => void;
};

export function TransferNftCard({ tokenIdValue, onTokenIdChange }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = chainId !== HARDHAT_CHAIN_ID;

  const contracts = useMemo(() => getContracts(chainId), [chainId]);
  const nftAddress = contracts?.nftAddress as Address | undefined;

  const [to, setTo] = useState<string>("");
  const [uiError, setUiError] = useState<string | null>(null);

  const tokenIdParsed = useMemo(() => {
    const v = tokenIdValue.trim();
    if (!v) return null;
    if (!/^\d+$/.test(v)) return null;
    try {
      return BigInt(v);
    } catch {
      return null;
    }
  }, [tokenIdValue]);

  const enabledOwnerRead =
    Boolean(nftAddress && tokenIdParsed != null && address && isConnected && !wrongNetwork);

  const {
    data: ownerOfData,
    refetch: refetchOwnerOf,
    isLoading: isOwnerOfLoading,
    isError: isOwnerOfError,
  } = useReadContract({
    address: nftAddress as Address,
    abi: ERC721_ABI,
    functionName: "ownerOf",
    args: [tokenIdParsed ?? 0n] as const,
    query: { enabled: enabledOwnerRead },
  });

  const currentOwner = ownerOfData as Address | undefined;

  const isOwner = useMemo(() => {
    if (!address || !currentOwner) return false;
    return currentOwner.toLowerCase() === address.toLowerCase();
  }, [currentOwner, address]);

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

  function onTransfer() {
    setUiError(null);

    if (!isConnected || !address) return setUiError("Conecte a carteira.");
    if (wrongNetwork) return setUiError("Troque para a rede Hardhat (chainId 31337).");
    if (!nftAddress) return setUiError("Endereço do NFT não encontrado.");
    if (tokenIdParsed == null) return setUiError("Informe um tokenId válido (número inteiro).");

    const toTrim = to.trim();
    if (!isAddress(toTrim)) return setUiError("Endereço do destinatário inválido.");

    if (enabledOwnerRead) {
      if (isOwnerOfLoading) return setUiError("Carregando ownerOf… aguarde.");
      if (isOwnerOfError) return setUiError("Falha ao consultar ownerOf.");
      if (!currentOwner) return setUiError("Owner atual indisponível. Recarregue.");
      if (!isOwner) return setUiError("Você não é o owner desse tokenId (conecte a carteira correta).");
    }

    writeContract({
      address: nftAddress,
      abi: ERC721_ABI,
      functionName: "transferFrom",
      args: [address as Address, toTrim as Address, tokenIdParsed] as const,
    });
  }

  useEffect(() => {
    if (!isSuccess) return;
    refetchOwnerOf();
  }, [isSuccess, refetchOwnerOf]);

  const errText = (writeError?.message ?? receiptError?.message ?? "").split("\n")[0] || undefined;

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">Transferir NFT</div>
        <div className="cardSub">
          NFT: <b>{nftAddress ? shortAddress(nftAddress) : "-"}</b>
        </div>
      </div>

      <label className="label">tokenId</label>
      <input
        className="input"
        placeholder="ex.: 1"
        value={tokenIdValue}
        onChange={(e) => onTokenIdChange(e.target.value)}
        spellCheck={false}
      />

      <label className="label">Para (address)</label>
      <input
        className="input"
        placeholder="0x..."
        value={to}
        onChange={(e) => setTo(e.target.value)}
        spellCheck={false}
      />

      {enabledOwnerRead ? (
        <div className="kvRow" style={{ marginTop: 10 }}>
          <div className="k">Owner atual</div>
          <div className="v">
            {isOwnerOfLoading ? "Carregando…" : isOwnerOfError ? "Erro" : currentOwner ? shortAddress(currentOwner) : "-"}
          </div>
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 10 }}>
          Informe um tokenId para consultar o owner.
        </div>
      )}

      {uiError ? (
        <div className="errorBox" style={{ marginTop: 10 }}>
          {uiError}
        </div>
      ) : null}

      <button
        className="btn primary"
        style={{ marginTop: 12 }}
        onClick={onTransfer}
        disabled={busy || !isConnected || wrongNetwork}
      >
        {busy ? "Transferindo…" : "Transferir"}
      </button>

      <TxStatus
        title="Transação: transferFrom"
        hash={txHash}
        isPending={isMining}
        isSuccess={isSuccess}
        isError={Boolean(writeError || isReceiptError)}
        errorText={errText}
      />
    </div>
  );
}
