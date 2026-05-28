import { getEmpColor } from '@/lib/emp-lote-display';

export function EmpLoteCell({
  empreendimentoNome,
  loteNumero,
}: {
  empreendimentoNome: string;
  loteNumero: string;
}) {
  return (
    <div className="flex flex-col">
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border w-fit ${getEmpColor(empreendimentoNome)}`}
      >
        {empreendimentoNome}
      </span>
      <span className="text-gray-900 font-medium text-xs">{loteNumero}</span>
    </div>
  );
}

export function ClienteCell({
  nome,
  email,
  compact,
}: {
  nome?: string | null;
  email?: string | null;
  compact?: boolean;
}) {
  const maxW = compact ? 'max-w-[140px]' : 'max-w-[200px]';
  return (
    <div>
      <p className={`text-gray-800 text-xs truncate ${maxW}`}>{nome || '-'}</p>
      {email ? (
        <p className={`text-gray-400 text-[10px] truncate ${maxW}`}>{email}</p>
      ) : null}
    </div>
  );
}
