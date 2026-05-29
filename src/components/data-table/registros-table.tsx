'use client';

import { useState, useMemo } from 'react';
import type { RegistroCompleto, Etapa, UserRole } from '@/types';
import { EtapaBadge } from './etapa-badge';
import { InlineTextEdit, InlineCheckbox, UrlField } from './inline-edit';
import { DocumentPreview } from '@/components/document-preview';
import { formatCurrency, formatDate } from '@/lib/utils';
import { isRegistroEmAndamento } from '@/lib/analise';
import { getEmpBorder } from '@/lib/emp-lote-display';
import { STICKY_REGISTROS, STICKY_SHADOW } from '@/lib/sticky-table-columns';
import { ClienteCell, EmpLoteCell } from './registro-identity-cells';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Mail,
  Search,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface RegistrosTableProps {
  registros: RegistroCompleto[];
  userRole: UserRole;
  onUpdate: (registroId: string, updates: Record<string, unknown>) => Promise<void>;
  onSendBoleto?: (registro: RegistroCompleto) => void;
  onSendOP?: (registro: RegistroCompleto) => void;
  onSendMatricula?: (registro: RegistroCompleto) => void;
  showObservacoes?: boolean;
  filterActiveOnly?: boolean;
  disablePagination?: boolean;
}

type SortField = 'lote' | 'empreendimento' | 'etapa' | 'dias' | 'valor_total' | 'valor_ja_pago' | 'data_contrato';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

const { col1Width: STICKY_COL1_WIDTH, col2Width: STICKY_COL2_WIDTH, col2Left: STICKY_COL2_LEFT } =
  STICKY_REGISTROS;
const headerBg = 'var(--primary-light)';

const ALL_ETAPAS: Etapa[] = [
  'Com pendências',
  'Concluído',
  'Aguardando conclusão de registro +30 dias',
  'Aguardando conclusão de registro',
  'Solicitar ITBI',
  'Aguardando emissão guia ITBI',
  'Pagar ITBI',
  'ITBI pago/coletar assinaturas',
  'Gatilho atingido',
  'Vendido',
  'Propriedade Young',
];

export function RegistrosTable({
  registros,
  userRole,
  onUpdate,
  onSendBoleto,
  onSendOP,
  onSendMatricula,
  showObservacoes = false,
  filterActiveOnly = false,
  disablePagination = false,
}: RegistrosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaFilters, setEtapaFilters] = useState<string[]>([]);
  const [empFilters, setEmpFilters] = useState<string[]>([]);
  const [boolFilters, setBoolFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('lote');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const canEdit = userRole !== 'leitor';
  const canEditEtapa = userRole === 'gestor';

  const empreendimentos = useMemo(() => {
    const set = new Set(registros.map((r) => r.empreendimento.nome));
    return Array.from(set).sort();
  }, [registros]);

  const etapaOptions = useMemo(() => ALL_ETAPAS.map((e) => ({ value: e, label: e })), []);
  const empOptions = useMemo(() => empreendimentos.map((e) => ({ value: e, label: e })), [empreendimentos]);
  const boolOptions = [
    { value: 'impugnado', label: 'Impugnados' },
    { value: 'segurar', label: 'Segurar registro' },
    { value: 'resp_cliente', label: 'Resp. cliente' },
    { value: 'caixa', label: 'Financ. CAIXA' },
  ];

  const filtered = useMemo(() => {
    let data = [...registros];

    if (filterActiveOnly) {
      data = data.filter(isRegistroEmAndamento);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.lote.numero.toLowerCase().includes(term) ||
          r.contrato?.cliente_nome.toLowerCase().includes(term) ||
          r.contrato?.cliente_email?.toLowerCase().includes(term) ||
          r.empreendimento.nome.toLowerCase().includes(term)
      );
    }

    if (etapaFilters.length > 0) {
      data = data.filter((r) => etapaFilters.includes(r.etapa));
    }

    if (empFilters.length > 0) {
      data = data.filter((r) => empFilters.includes(r.empreendimento.nome));
    }

    if (boolFilters.length > 0) {
      data = data.filter((r) => {
        return boolFilters.some((f) => {
          switch (f) {
            case 'impugnado': return r.registro.impugnado;
            case 'segurar': return r.registro.segurar_registro;
            case 'resp_cliente': return r.registro.responsabilidade_cliente;
            case 'caixa': return r.registro.financiamento_caixa;
            default: return false;
          }
        });
      });
    }

    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'lote':
          cmp = a.lote.numero.localeCompare(b.lote.numero, 'pt-BR', { numeric: true });
          if (cmp === 0) cmp = a.empreendimento.nome.localeCompare(b.empreendimento.nome);
          break;
        case 'empreendimento':
          cmp = a.empreendimento.nome.localeCompare(b.empreendimento.nome);
          if (cmp === 0) cmp = a.lote.numero.localeCompare(b.lote.numero, 'pt-BR', { numeric: true });
          break;
        case 'etapa':
          cmp = ALL_ETAPAS.indexOf(a.etapa) - ALL_ETAPAS.indexOf(b.etapa);
          break;
        case 'dias':
          cmp = (a.dias || 0) - (b.dias || 0);
          break;
        case 'valor_total':
          cmp = (a.contrato?.valor_total || 0) - (b.contrato?.valor_total || 0);
          break;
        case 'valor_ja_pago':
          cmp = (a.contrato?.valor_ja_pago || 0) - (b.contrato?.valor_ja_pago || 0);
          break;
        case 'data_contrato':
          cmp = (a.contrato?.data_contrato || '').localeCompare(b.contrato?.data_contrato || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [registros, searchTerm, etapaFilters, empFilters, boolFilters, sortField, sortDir, filterActiveOnly]);

  const totalPages = disablePagination ? 1 : Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => {
    if (disablePagination) return filtered;
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page, disablePagination]);

  const safeSetPage = (p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1)));

  useMemo(() => {
    if (page >= totalPages && totalPages > 0) setPage(totalPages - 1);
    if (page > 0 && filtered.length === 0) setPage(0);
  }, [filtered.length, totalPages, page]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(0);
  };

  const handleMultiFilterChange = (setter: (v: string[]) => void) => (v: string[]) => {
    setter(v);
    setPage(0);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:text-[var(--primary)]"
      style={{ color: 'var(--primary-dark)' }}
    >
      {children}
      <ArrowUpDown className="w-2.5 h-2.5" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="p-4 border-b border-[var(--gray-lighter)]" style={{ background: 'var(--bg-card)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
            <Input
              placeholder="Buscar lote, cliente, empreendimento..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              className="pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setPage(0); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 hover:text-orange-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <MultiSelect
            options={etapaOptions}
            selected={etapaFilters}
            onChange={handleMultiFilterChange(setEtapaFilters)}
            placeholder="Etapas"
            className="w-[200px]"
          />

          <MultiSelect
            options={empOptions}
            selected={empFilters}
            onChange={handleMultiFilterChange(setEmpFilters)}
            placeholder="Empreendimentos"
            className="w-[200px]"
          />

          <MultiSelect
            options={boolOptions}
            selected={boolFilters}
            onChange={handleMultiFilterChange(setBoolFilters)}
            placeholder="Flags"
            className="w-[180px]"
          />

          <span className="text-xs text-orange-800 font-medium">
            {filtered.length} registro(s)
          </span>
        </div>
      </div>

      {/* Table — scroll nativo para sticky nas colunas Emp/Lote e Cliente */}
      <div className="overflow-hidden">
        <div className="w-full overflow-auto max-h-[calc(100vh-14rem)]">
          <div className="min-w-[2000px]">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-[var(--gray-lighter)]" style={{ background: headerBg }}>
                  <th
                    className={`sticky left-0 top-0 z-30 px-2 py-2 text-left min-w-[140px] max-w-[140px] ${STICKY_SHADOW}`}
                    style={{ background: headerBg, width: STICKY_COL1_WIDTH }}
                  >
                    <SortHeader field="empreendimento">Emp. / Lote</SortHeader>
                  </th>
                  <th
                    className={`sticky top-0 z-30 px-2 py-2 text-left min-w-[150px] max-w-[150px] ${STICKY_SHADOW}`}
                    style={{
                      background: headerBg,
                      left: STICKY_COL2_LEFT,
                      width: STICKY_COL2_WIDTH,
                    }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Cliente</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <SortHeader field="etapa">Etapa</SortHeader>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>A.V</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <SortHeader field="valor_total">Total</SortHeader>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <SortHeader field="valor_ja_pago">Pago</SortHeader>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Gatilho</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <SortHeader field="data_contrato">Contrato</SortHeader>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Sol. ITBI</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Esp. ITBI</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Vl. ITBI</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Div.</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Boleto</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Comprov.</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>OP Reg.</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>NF Reg.</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Matríc.</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Recol.</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Entr. RI</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Receb. RI</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-center" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Flags</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Gatilho</span>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-right" style={{ background: headerBg }}>
                    <SortHeader field="dias">Dias</SortHeader>
                  </th>
                  <th className="sticky top-0 z-20 px-2 py-2 text-center" style={{ background: headerBg }}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Ações</span>
                  </th>
                  {showObservacoes && (
                    <th className="sticky top-0 z-20 px-2 py-2 text-left" style={{ background: headerBg }}>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Obs.</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paged.map((item) => {
                  const isConcluido = item.etapa === 'Concluído';
                  const cellBg = isConcluido ? 'bg-emerald-50' : 'bg-[var(--bg-card)]';
                  const hoverCell = isConcluido ? 'group-hover:bg-emerald-100/80' : 'group-hover:bg-gray-50';

                  return (
                  <tr
                    key={item.registro.id}
                    className={`group border-b border-gray-100 transition-colors border-l-4 ${getEmpBorder(item.empreendimento.nome)} ${isConcluido ? 'bg-emerald-50' : ''}`}
                  >
                    {/* Empreendimento + Lote (fixo à esquerda) */}
                    <td
                      className={`sticky left-0 z-20 px-2 py-1.5 border-l-4 min-w-[140px] max-w-[140px] ${STICKY_SHADOW} ${getEmpBorder(item.empreendimento.nome)} ${cellBg} ${hoverCell}`}
                      style={{ width: STICKY_COL1_WIDTH }}
                    >
                      <EmpLoteCell
                        empreendimentoNome={item.empreendimento.nome}
                        loteNumero={item.lote.numero}
                      />
                    </td>

                    {/* Cliente (fixo à esquerda) */}
                    <td
                      className={`sticky z-20 px-2 py-1.5 min-w-[150px] max-w-[150px] ${STICKY_SHADOW} ${cellBg} ${hoverCell}`}
                      style={{ left: STICKY_COL2_LEFT, width: STICKY_COL2_WIDTH }}
                    >
                      <ClienteCell
                        nome={item.contrato?.cliente_nome}
                        email={item.contrato?.cliente_email}
                        compact
                      />
                    </td>

                    {/* Etapa */}
                    <td className="px-2 py-1.5">
                      <EtapaBadge etapa={item.etapa} />
                    </td>

                    {/* Valor A.V */}
                    <td className="px-2 py-1.5 text-right text-gray-500 text-[11px]">
                      {item.lote.valor_avista ? formatCurrency(item.lote.valor_avista) : '-'}
                    </td>

                    {/* Total */}
                    <td className="px-2 py-1.5 text-right text-gray-700 text-[11px]">
                      {item.contrato ? formatCurrency(item.contrato.valor_total) : '-'}
                    </td>

                    {/* Já pago */}
                    <td className="px-2 py-1.5 text-right text-gray-700 text-[11px]">
                      {item.contrato ? formatCurrency(item.contrato.valor_ja_pago) : '-'}
                    </td>

                    {/* Gatilho */}
                    <td className="px-2 py-1.5 text-right text-[11px]">
                      <span className={item.gatilho_atingido ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                        {item.gatilho > 0 ? formatCurrency(item.gatilho) : '-'}
                      </span>
                    </td>

                    {/* Data contrato */}
                    <td className="px-2 py-1.5 text-gray-500 text-[11px]">
                      {formatDate(item.contrato?.data_contrato || null)}
                    </td>

                    {/* Solic. ITBI */}
                    <td className="px-2 py-1.5">
                      <InlineTextEdit
                        value={item.registro.data_solicitacao_itbi}
                        onSave={async (v) => onUpdate(item.registro.id, { data_solicitacao_itbi: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Valor esperado ITBI */}
                    <td className="px-2 py-1.5 text-right text-gray-400 text-[11px]">
                      {item.valor_esperado_itbi > 0 ? formatCurrency(item.valor_esperado_itbi) : '-'}
                    </td>

                    {/* Valor ITBI */}
                    <td className="px-2 py-1.5 text-right">
                      <InlineTextEdit
                        value={item.registro.valor_itbi?.toString() || null}
                        onSave={async (v) => onUpdate(item.registro.id, { valor_itbi: v ? parseFloat(v) : null })}
                        disabled={!canEdit}
                        type="number"
                        placeholder="R$ 0,00"
                      />
                    </td>

                    {/* Divergências */}
                    <td className="px-2 py-1.5 text-right text-[11px]">
                      {item.divergencias !== null ? (
                        <span className={item.divergencias > 0 ? 'text-red-600 font-medium' : item.divergencias < 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          {formatCurrency(item.divergencias)}
                        </span>
                      ) : '-'}
                    </td>

                    {/* Boleto ITBI */}
                    <td className="px-2 py-1.5">
                      <UrlField
                        value={item.registro.boleto_itbi_url}
                        onSave={async (v) => {
                          await onUpdate(item.registro.id, { boleto_itbi_url: v || null });
                          if (v && onSendBoleto) onSendBoleto(item);
                        }}
                        onPreview={() =>
                          item.registro.boleto_itbi_url &&
                          setPreviewDoc({ url: item.registro.boleto_itbi_url, title: `Boleto ITBI - Lote ${item.lote.numero}` })
                        }
                        disabled={!canEdit}
                      />
                    </td>

                    {/* Comprovante ITBI */}
                    <td className="px-2 py-1.5">
                      <UrlField
                        value={item.registro.comprovante_itbi_url}
                        onSave={async (v) => onUpdate(item.registro.id, { comprovante_itbi_url: v || null })}
                        onPreview={() =>
                          item.registro.comprovante_itbi_url &&
                          setPreviewDoc({ url: item.registro.comprovante_itbi_url, title: `Comprovante ITBI - Lote ${item.lote.numero}` })
                        }
                        disabled={!canEdit}
                      />
                    </td>

                    {/* OP Registro */}
                    <td className="px-2 py-1.5">
                      <UrlField
                        value={item.registro.op_registro_url}
                        onSave={async (v) => {
                          await onUpdate(item.registro.id, { op_registro_url: v || null });
                          if (v && onSendOP) onSendOP(item);
                        }}
                        onPreview={() =>
                          item.registro.op_registro_url &&
                          setPreviewDoc({ url: item.registro.op_registro_url, title: `OP Registro - Lote ${item.lote.numero}` })
                        }
                        disabled={!canEdit}
                      />
                    </td>

                    {/* NF Registro */}
                    <td className="px-2 py-1.5">
                      <UrlField
                        value={item.registro.nf_registro_url}
                        onSave={async (v) => onUpdate(item.registro.id, { nf_registro_url: v || null })}
                        onPreview={() =>
                          item.registro.nf_registro_url &&
                          setPreviewDoc({ url: item.registro.nf_registro_url, title: `NF Registro - Lote ${item.lote.numero}` })
                        }
                        disabled={!canEdit}
                      />
                    </td>

                    {/* Matrícula */}
                    <td className="px-2 py-1.5">
                      <UrlField
                        value={item.registro.matricula_url}
                        onSave={async (v) => onUpdate(item.registro.id, { matricula_url: v || null })}
                        onPreview={() =>
                          item.registro.matricula_url &&
                          setPreviewDoc({ url: item.registro.matricula_url, title: `Matrícula - Lote ${item.lote.numero}` })
                        }
                        disabled={!canEdit}
                      />
                    </td>

                    {/* Dt. Recolhimento ITBI */}
                    <td className="px-2 py-1.5">
                      <InlineTextEdit
                        value={item.registro.data_recolhimento_itbi}
                        onSave={async (v) => onUpdate(item.registro.id, { data_recolhimento_itbi: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Entrega R.I */}
                    <td className="px-2 py-1.5">
                      <InlineTextEdit
                        value={item.registro.data_entrega_ri}
                        onSave={async (v) => onUpdate(item.registro.id, { data_entrega_ri: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Recebimento R.I */}
                    <td className="px-2 py-1.5">
                      <InlineTextEdit
                        value={item.registro.data_recebimento_ri}
                        onSave={async (v) => onUpdate(item.registro.id, { data_recebimento_ri: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Flags */}
                    <td className="px-2 py-1.5">
                      <div className="flex flex-col gap-0.5">
                        <InlineCheckbox
                          checked={item.registro.impugnado}
                          onToggle={async (v) => onUpdate(item.registro.id, { impugnado: v })}
                          disabled={!canEditEtapa}
                          label="Impugn."
                        />
                        <InlineCheckbox
                          checked={item.registro.segurar_registro}
                          onToggle={async (v) => onUpdate(item.registro.id, { segurar_registro: v })}
                          disabled={!canEdit}
                          label="Segurar"
                        />
                        <InlineCheckbox
                          checked={item.registro.responsabilidade_cliente}
                          onToggle={async (v) => onUpdate(item.registro.id, { responsabilidade_cliente: v })}
                          disabled={!canEdit}
                          label="Resp. Cli."
                        />
                        <InlineCheckbox
                          checked={item.registro.financiamento_caixa}
                          onToggle={async (v) => onUpdate(item.registro.id, { financiamento_caixa: v })}
                          disabled={!canEdit}
                          label="CAIXA"
                        />
                      </div>
                    </td>

                    {/* Data Gatilho */}
                    <td className="px-2 py-1.5 text-gray-500 text-[11px]">
                      {formatDate(item.registro.data_gatilho)}
                    </td>

                    {/* Dias */}
                    <td className="px-2 py-1.5 text-right text-[11px]">
                      {item.dias !== null ? (
                        <span className={item.dias > 60 ? 'text-red-600 font-semibold' : item.dias > 30 ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                          {item.dias}d
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        {item.registro.matricula_url && item.contrato?.cliente_email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSendMatricula?.(item)}
                            title="Enviar matrícula ao cliente"
                            className="h-6 w-6"
                          >
                            <Mail className="w-3 h-3 text-orange-500" />
                          </Button>
                        )}
                      </div>
                    </td>

                    {/* Observações */}
                    {showObservacoes && (
                      <td className="px-2 py-1.5 min-w-[180px]">
                        <InlineTextEdit
                          value={item.registro.observacoes}
                          onSave={async (v) => onUpdate(item.registro.id, { observacoes: v || null })}
                          disabled={!canEdit}
                          placeholder="Adicionar observação..."
                        />
                      </td>
                    )}
                  </tr>
                  );
                })}

                {paged.length === 0 && (
                  <tr>
                    <td colSpan={showObservacoes ? 25 : 24} className="px-3 py-12 text-center text-gray-400">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!disablePagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => safeSetPage(0)} disabled={page === 0}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => safeSetPage(page - 1)} disabled={page === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-600 px-3">
                Página {page + 1} de {totalPages}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => safeSetPage(page + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => safeSetPage(totalPages - 1)} disabled={page >= totalPages - 1}>
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Dialog */}
      {previewDoc && (
        <DocumentPreview
          url={previewDoc.url}
          title={previewDoc.title}
          open={true}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
