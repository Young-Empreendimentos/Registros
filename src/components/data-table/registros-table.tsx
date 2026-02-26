'use client';

import { useState, useMemo } from 'react';
import type { RegistroCompleto, Etapa, UserRole } from '@/types';
import { EtapaBadge } from './etapa-badge';
import { InlineTextEdit, InlineCheckbox, UrlField } from './inline-edit';
import { DocumentPreview } from '@/components/document-preview';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
}

type SortField = 'lote' | 'empreendimento' | 'etapa' | 'dias' | 'valor_total' | 'valor_ja_pago' | 'data_contrato';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

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

const EMP_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  'bg-orange-500/15 text-orange-300 border-orange-500/30',
  'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'bg-pink-500/15 text-pink-300 border-pink-500/30',
  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'bg-lime-500/15 text-lime-300 border-lime-500/30',
  'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  'bg-teal-500/15 text-teal-300 border-teal-500/30',
  'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
];

const LEFT_BORDER_PALETTE = [
  'border-l-orange-500',
  'border-l-sky-500',
  'border-l-emerald-500',
  'border-l-violet-500',
  'border-l-pink-500',
  'border-l-amber-500',
  'border-l-cyan-500',
  'border-l-rose-500',
  'border-l-lime-500',
  'border-l-indigo-500',
  'border-l-teal-500',
  'border-l-fuchsia-500',
];

function getEmpColor(name: string): string {
  if (!EMP_COLORS[name]) {
    const idx = Object.keys(EMP_COLORS).length % COLOR_PALETTE.length;
    EMP_COLORS[name] = COLOR_PALETTE[idx];
  }
  return EMP_COLORS[name];
}

function getEmpBorder(name: string): string {
  getEmpColor(name);
  const idx = Object.keys(EMP_COLORS).indexOf(name) % LEFT_BORDER_PALETTE.length;
  return LEFT_BORDER_PALETTE[idx];
}

export function RegistrosTable({
  registros,
  userRole,
  onUpdate,
  onSendBoleto,
  onSendOP,
  onSendMatricula,
  showObservacoes = false,
  filterActiveOnly = false,
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
      data = data.filter(
        (r) =>
          r.etapa !== 'Propriedade Young' &&
          r.etapa !== 'Vendido' &&
          r.etapa !== 'Concluído'
      );
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

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
      className="flex items-center gap-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-white transition-colors"
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar lote, cliente, empreendimento..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); setPage(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
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

        <span className="text-xs text-zinc-500">
          {filtered.length} registro(s)
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[2400px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="sticky left-0 z-10 bg-zinc-900 px-3 py-3 text-left min-w-[200px]">
                    <SortHeader field="empreendimento">Empreend. / Lote</SortHeader>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cliente</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortHeader field="etapa">Etapa</SortHeader>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor A.V</span>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <SortHeader field="valor_total">Total</SortHeader>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <SortHeader field="valor_ja_pago">Já pago</SortHeader>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gatilho</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortHeader field="data_contrato">Dt. Contrato</SortHeader>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Solic. ITBI</span>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Esper. ITBI</span>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor ITBI</span>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Diverg.</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Boleto ITBI</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Comprov. ITBI</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">OP Registro</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">NF Registro</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Matrícula</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dt. Recol. ITBI</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Entrega R.I</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Receb. R.I</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Flags</span>
                  </th>
                  <th className="px-3 py-3 text-left">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dt. Gatilho</span>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <SortHeader field="dias">Dias</SortHeader>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Ações</span>
                  </th>
                  {showObservacoes && (
                    <th className="px-3 py-3 text-left">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Observações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paged.map((item) => {
                  const isConcluido = item.etapa === 'Concluído';
                  const rowBg = isConcluido ? 'bg-emerald-950/40' : '';
                  const cellBg = isConcluido ? 'bg-emerald-950/40' : 'bg-zinc-900';
                  
                  return (
                  <tr
                    key={item.registro.id}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors border-l-3 ${getEmpBorder(item.empreendimento.nome)} ${rowBg}`}
                  >
                    {/* Empreendimento + Lote (merged) */}
                    <td className={`sticky left-0 z-10 px-3 py-2.5 border-l-3 ${getEmpBorder(item.empreendimento.nome)} ${cellBg}`}>
                      <div className="flex flex-col gap-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border w-fit ${getEmpColor(item.empreendimento.nome)}`}>
                          {item.empreendimento.nome}
                        </span>
                        <span className="text-white font-medium text-sm">{item.lote.numero}</span>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="px-3 py-2.5">
                      <div>
                        <p className="text-zinc-200 text-sm truncate max-w-[150px]">
                          {item.contrato?.cliente_nome || '-'}
                        </p>
                        <p className="text-zinc-500 text-xs truncate max-w-[150px]">
                          {item.contrato?.cliente_email || ''}
                        </p>
                      </div>
                    </td>

                    {/* Etapa */}
                    <td className="px-3 py-2.5">
                      <EtapaBadge etapa={item.etapa} />
                    </td>

                    {/* Valor A.V */}
                    <td className="px-3 py-2.5 text-right text-zinc-400 text-xs">
                      {item.lote.valor_avista ? formatCurrency(item.lote.valor_avista) : '-'}
                    </td>

                    {/* Total */}
                    <td className="px-3 py-2.5 text-right text-zinc-300 text-xs">
                      {item.contrato ? formatCurrency(item.contrato.valor_total) : '-'}
                    </td>

                    {/* Já pago */}
                    <td className="px-3 py-2.5 text-right text-zinc-300 text-xs">
                      {item.contrato ? formatCurrency(item.contrato.valor_ja_pago) : '-'}
                    </td>

                    {/* Gatilho */}
                    <td className="px-3 py-2.5 text-right text-xs">
                      <span className={item.gatilho_atingido ? 'text-emerald-400' : 'text-zinc-500'}>
                        {item.gatilho > 0 ? formatCurrency(item.gatilho) : '-'}
                      </span>
                    </td>

                    {/* Data contrato */}
                    <td className="px-3 py-2.5 text-zinc-400 text-xs">
                      {formatDate(item.contrato?.data_contrato || null)}
                    </td>

                    {/* Solic. ITBI */}
                    <td className="px-3 py-2.5">
                      <InlineTextEdit
                        value={item.registro.data_solicitacao_itbi}
                        onSave={async (v) => onUpdate(item.registro.id, { data_solicitacao_itbi: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Valor esperado ITBI */}
                    <td className="px-3 py-2.5 text-right text-zinc-400 text-xs">
                      {item.valor_esperado_itbi > 0 ? formatCurrency(item.valor_esperado_itbi) : '-'}
                    </td>

                    {/* Valor ITBI */}
                    <td className="px-3 py-2.5 text-right">
                      <InlineTextEdit
                        value={item.registro.valor_itbi?.toString() || null}
                        onSave={async (v) => onUpdate(item.registro.id, { valor_itbi: v ? parseFloat(v) : null })}
                        disabled={!canEdit}
                        type="number"
                        placeholder="R$ 0,00"
                      />
                    </td>

                    {/* Divergências */}
                    <td className="px-3 py-2.5 text-right text-xs">
                      {item.divergencias !== null ? (
                        <span className={item.divergencias > 0 ? 'text-red-400' : item.divergencias < 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          {formatCurrency(item.divergencias)}
                        </span>
                      ) : '-'}
                    </td>

                    {/* Boleto ITBI */}
                    <td className="px-3 py-2.5">
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
                    <td className="px-3 py-2.5">
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
                    <td className="px-3 py-2.5">
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
                    <td className="px-3 py-2.5">
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
                    <td className="px-3 py-2.5">
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
                    <td className="px-3 py-2.5">
                      <InlineTextEdit
                        value={item.registro.data_recolhimento_itbi}
                        onSave={async (v) => onUpdate(item.registro.id, { data_recolhimento_itbi: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Entrega R.I */}
                    <td className="px-3 py-2.5">
                      <InlineTextEdit
                        value={item.registro.data_entrega_ri}
                        onSave={async (v) => onUpdate(item.registro.id, { data_entrega_ri: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Recebimento R.I */}
                    <td className="px-3 py-2.5">
                      <InlineTextEdit
                        value={item.registro.data_recebimento_ri}
                        onSave={async (v) => onUpdate(item.registro.id, { data_recebimento_ri: v || null })}
                        disabled={!canEdit}
                        type="date"
                      />
                    </td>

                    {/* Flags */}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
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
                    <td className="px-3 py-2.5 text-zinc-400 text-xs">
                      {formatDate(item.registro.data_gatilho)}
                    </td>

                    {/* Dias */}
                    <td className="px-3 py-2.5 text-right">
                      {item.dias !== null ? (
                        <span className={item.dias > 60 ? 'text-red-400 font-semibold' : item.dias > 30 ? 'text-amber-400' : 'text-zinc-400'}>
                          {item.dias}d
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {item.registro.matricula_url && item.contrato?.cliente_email && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSendMatricula?.(item)}
                            title="Enviar matrícula ao cliente"
                            className="h-7 w-7"
                          >
                            <Mail className="w-3.5 h-3.5 text-orange-500" />
                          </Button>
                        )}
                      </div>
                    </td>

                    {/* Observações */}
                    {showObservacoes && (
                      <td className="px-3 py-2.5 min-w-[200px]">
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
                    <td colSpan={showObservacoes ? 25 : 24} className="px-3 py-12 text-center text-zinc-600">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/80">
            <span className="text-xs text-zinc-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => safeSetPage(0)} disabled={page === 0}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => safeSetPage(page - 1)} disabled={page === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-zinc-400 px-3">
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
