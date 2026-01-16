/**
 * Card que lista os NFTs da carteira reconstruindo a posse via eventos Transfer do ERC-721,
 * atualizando automaticamente com watch de bloco e permitindo selecionar tokenId para transferência.
 */
import { useCallback, useMemo, useState, useEffect } from "react";
import { parseAbiItem, type Address } from "viem";
import { useAccount, useBlockNumber, useChainId, usePublicClient } from "wagmi";

import { HARDHAT_CHAIN_ID, getContracts } from "../contracts";
import { shortAddress } from "../utils/evm";

type Props = {
  onSelectTokenId?: (tokenId: bigint) => void;
};

type UiState = {
  loading: boolean;
  error: string | null;
  tokenIds: bigint[];
  lastUpdatedBlock: bigint | null;
};

export function MyNftsCard({ onSelectTokenId }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = chainId !== HARDHAT_CHAIN_ID;

  const contracts = useMemo(() => getContracts(chainId), [chainId]);
  const nftAddress = contracts?.nftAddress as Address | undefined;

  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const [state, setState] = useState<UiState>({
    loading: false,
    error: null,
    tokenIds: [],
    lastUpdatedBlock: null,
  });

  const enabled = Boolean(publicClient && nftAddress && address && isConnected && !wrongNetwork);

  const transferEvent = useMemo(
    () =>
      parseAbiItem(
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
      ),
    []
  );

  const load = useCallback(async () => {
    if (!enabled || !publicClient || !nftAddress || !address) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const logs = await publicClient.getLogs({
        address: nftAddress,
        event: transferEvent,
        fromBlock: 0n,
        toBlock: "latest",
      });

      const sorted = [...logs].sort((a, b) => {
        const ab = a.blockNumber ?? 0n;
        const bb = b.blockNumber ?? 0n;
        if (ab < bb) return -1;
        if (ab > bb) return 1;
        const al = a.logIndex ?? 0;
        const bl = b.logIndex ?? 0;
        return al - bl;
      });

      const ownerByTokenId = new Map<string, Address>();

      for (const l of sorted) {
        const tid = l.args?.tokenId;
        const to = l.args?.to as Address | undefined;
        if (typeof tid === "undefined") continue;
        if (!to) continue;
        ownerByTokenId.set(tid.toString(), to);
      }

      const me = address.toLowerCase();
      const mine: bigint[] = [];

      for (const [tid, owner] of ownerByTokenId.entries()) {
        if (owner.toLowerCase() === me) mine.push(BigInt(tid));
      }

      mine.sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));

      setState({
        loading: false,
        error: null,
        tokenIds: mine,
        lastUpdatedBlock: blockNumber ?? null,
      });
    } catch (e: any) {
      const msg = (e?.shortMessage || e?.message || "Falha ao buscar logs.").toString();
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [enabled, publicClient, nftAddress, address, transferEvent, blockNumber]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">Lista de NFTs da sua carteira</div>
        <div className="cardSub">
          NFT: <b>{nftAddress ? shortAddress(nftAddress) : "-"}</b>
        </div>
      </div>

      <div className="kvRow">
        <div className="k">Wallet</div>
        <div className="v">{address ? shortAddress(address) : "-"}</div>
      </div>

      {wrongNetwork ? (
        <div className="warn" style={{ marginTop: 10 }}>
          Troque para a rede Hardhat (chainId 31337).
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: "wrap" }}>
        <button className="btn" onClick={load} disabled={!enabled || state.loading}>
          {state.loading ? "Carregando…" : "Recarregar"}
        </button>

        {state.lastUpdatedBlock != null ? (
          <div className="muted" style={{ alignSelf: "center" }}>
            Último bloco: {state.lastUpdatedBlock.toString()}
          </div>
        ) : null}
      </div>

      {state.error ? (
        <div className="errorBox" style={{ marginTop: 10 }}>
          {state.error}
        </div>
      ) : null}

      <div style={{ marginTop: 12 }}>
        {state.loading ? (
          <div className="muted">Buscando NFTs via eventos Transfer…</div>
        ) : state.tokenIds.length === 0 ? (
          <div className="muted">Nenhum NFT encontrado nesta carteira.</div>
        ) : (
          <div className="list">
            {state.tokenIds.map((tid) => (
              <div key={tid.toString()} className="kvRow" style={{ alignItems: "center", gap: 10 }}>
                <div className="k">tokenId</div>
                <div className="v" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <b>{tid.toString()}</b>
                  {onSelectTokenId ? (
                    <button className="btn" onClick={() => onSelectTokenId(tid)}>
                      Usar para transferir
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        Observação: esta lista é reconstruída pelos eventos <b>Transfer</b> do contrato (funciona sem
        ERC721Enumerable).
      </div>
    </div>
  );
}
