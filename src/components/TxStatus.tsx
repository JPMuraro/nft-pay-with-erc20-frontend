// Componente React de UI que apresenta o status de uma transação: título, hash encurtado e
// mensagens condicionais para estados pendente, sucesso ou erro (incluindo texto de erro opcional).
import { shortAddress } from "../utils/evm";

type Props = {
  title: string;
  hash?: `0x${string}`;
  isPending?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  errorText?: string;
};

export function TxStatus(props: Props) {
  const { title, hash, isPending, isSuccess, isError, errorText } = props;

  return (
    <div className="txBox">
      <div className="txTitle">{title}</div>

      {hash && (
        <div className="txHash">
          Hash: <code>{shortAddress(hash, 10, 8)}</code>
        </div>
      )}

      {isPending && <div className="txPending">Status: aguardando confirmação…</div>}
      {isSuccess && <div className="txSuccess">Status: confirmado com sucesso.</div>}
      {isError && (
        <div className="txError">
          Status: erro.
          {errorText ? <div className="txErrorMsg">{errorText}</div> : null}
        </div>
      )}
    </div>
  );
}
