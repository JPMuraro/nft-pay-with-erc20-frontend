// Componente React que exibe a barra superior do app: nome do projeto, chainId e aviso
// de rede incorreta (Hardhat 31337), saldo do token ERC-20 da carteira conectada
// (lendo decimals/symbol/balanceOf via wagmi) e o botão de conexão do RainbowKit.
import { useMemo } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import { ERC20_ABI, getContracts, HARDHAT_CHAIN_ID } from "../contracts";

export function HeaderBar() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongNetwork = chainId !== HARDHAT_CHAIN_ID;

  const contracts = useMemo(() => getContracts(chainId), [chainId]);
  const tokenAddress = contracts?.tokenAddress;

  const { data: decimalsData } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: Boolean(tokenAddress) },
  });

  const tokenDecimals = Number(decimalsData ?? 18);

  const { data: symbolData } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: Boolean(tokenAddress) },
  });

  const tokenSymbol = (symbolData ?? "TOKEN") as string;

  const { data: balanceData } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(tokenAddress && address) },
  });

  const balance = (balanceData ?? 0n) as bigint;

  const balanceText = useMemo(() => {
    if (!isConnected || !address) return "-";
    return `${formatUnits(balance, tokenDecimals)} ${tokenSymbol}`;
  }, [isConnected, address, balance, tokenDecimals, tokenSymbol]);

  return (
    <div className="header">
      <div className="headerLeft">
        <div className="brand">NFT Pay With ERC-20</div>
        <div className="headerMeta">
          Rede: <b>{chainId}</b> {wrongNetwork ? "(troque para 31337)" : "(Hardhat OK)"}
        </div>
      </div>

      <div className="headerRight">
        <div className="balancePill">
          Saldo ERC-20: <b>{balanceText}</b>
        </div>
        <ConnectButton />
      </div>
    </div>
  );
}
