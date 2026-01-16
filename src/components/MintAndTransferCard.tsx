/**
 * Card de administração do ERC-20 que lê owner/symbol/decimals do token e permite ao owner
 * executar mintAndTransfer para um destinatário, exibindo status e erros sem mascarar dados
 * ainda não carregados com valores falsos.
 */
import { useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits, type Address } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { HARDHAT_CHAIN_ID, getContracts } from "../contracts";
import { ERC20_ABI } from "../contracts/abis";
import { shortAddress } from "../utils/evm";
import { TxStatus } from "./TxStatus";

export function MintAndTransferCard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = chainId !== HARDHAT_CHAIN_ID;

  const contracts = useMemo(() => getContracts(chainId), [chainId]);
  const tokenAddress = contracts?.tokenAddress;

  const [to, setTo] = useState<string>("");
  const [amount, setAmount] = useState<string>("100");
  const [uiError, setUiError] = useState<string | null>(null);

  const {
    data: tokenOwnerData,
    isLoading: isTokenOwnerLoading,
    isError: isTokenOwnerError,
  } = useReadContract({
    address: tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "owner",
    query: { enabled: Boolean(tokenAddress) },
  });
  const tokenOwner = tokenOwnerData as Address | undefined;

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

  const isOwner = useMemo(() => {
    if (!address || !tokenOwner) return false;
    return address.toLowerCase() === tokenOwner.toLowerCase();
  }, [address, tokenOwner]);

  const parsedPreview = useMemo(() => {
    const a = (amount || "").trim();
    if (!a) return null;
    try {
      const units = parseUnits(a, tokenDecimals);
      return `${units.toString()} (units) = ${formatUnits(units, tokenDecimals)} ${tokenSymbol}`;
    } catch {
      return null;
    }
  }, [amount, tokenDecimals, tokenSymbol]);

  function onSubmit() {
    setUiError(null);

    if (!isConnected || !address) return setUiError("Conecte a carteira.");
    if (wrongNetwork) return setUiError("Troque para a rede Hardhat (chainId 31337).");
    if (!tokenAddress) return setUiError("Endereço do token não encontrado para esta rede.");
    if (isTokenOwnerLoading) return setUiError("Carregando owner do token… aguarde.");
    if (isTokenOwnerError) return setUiError("Falha ao ler owner do token.");
    if (!tokenOwner) return setUiError("Owner do token indisponível. Recarregue.");
    if (!isOwner) return setUiError("Sua carteira não é o owner do ERC-20 (ação bloqueada pelo contrato).");

    const toTrim = to.trim();
    if (!isAddress(toTrim)) return setUiError("Endereço do destinatário inválido.");

    const amountTrim = amount.trim();
    if (!amountTrim) return setUiError("Informe a quantidade.");

    let units: bigint;
    try {
      units = parseUnits(amountTrim, tokenDecimals);
    } catch {
      return setUiError("Quantidade inválida. Use formato numérico, ex: 10 ou 10.5");
    }
    if (units <= 0n) return setUiError("Quantidade deve ser maior que zero.");

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "mintAndTransfer",
      args: [toTrim as Address, units] as const,
    });
  }

  const errText = (writeError?.message ?? receiptError?.message ?? "").split("\n")[0] || undefined;

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">Cunhar e transferir tokens (ERC-20)</div>
        <div className="cardSub">
          Token: <b>{tokenAddress ? shortAddress(tokenAddress) : "-"}</b>
        </div>
      </div>

      <div className="kvRow">
        <div className="k">Owner do ERC-20</div>
        <div className="v">
          {isTokenOwnerLoading ? "Carregando…" : tokenOwner ? shortAddress(tokenOwner) : isTokenOwnerError ? "Erro" : "-"}
        </div>
      </div>

      <div className="form">
        <label className="label">Destinatário (address)</label>
        <input className="input" placeholder="0x..." value={to} onChange={(e) => setTo(e.target.value)} />

        <label className="label">Quantidade ({tokenSymbol})</label>
        <input className="input" placeholder="100" value={amount} onChange={(e) => setAmount(e.target.value)} />

        {parsedPreview ? <div className="muted">Prévia: {parsedPreview}</div> : null}
        {uiError ? <div className="errorBox">{uiError}</div> : null}

        <button className="btn primary" onClick={onSubmit} disabled={busy || !isConnected || wrongNetwork}>
          {busy ? "Enviando…" : "Mint + Transfer"}
        </button>
      </div>

      <TxStatus
        title="Transação: mintAndTransfer"
        hash={txHash}
        isPending={isMining}
        isSuccess={isSuccess}
        isError={Boolean(writeError || isReceiptError)}
        errorText={errText}
      />

      {!isOwner && isConnected ? (
        <div className="warn" style={{ marginTop: 10 }}>
          Observação: esta ação só funciona com a carteira <b>owner</b> do token.
        </div>
      ) : null}
    </div>
  );
}
