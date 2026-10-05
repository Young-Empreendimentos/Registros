'use client';

import { Fragment, useMemo, useState } from 'react';
import type { Empreendimento, Registro, RegistroCompleto, Etapa, UserRole } from '@/types';
import { EtapaBadge } from './etapa-badge';
import { DocumentPreview } from '@/components/document-preview';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getEmpBorder } from '@/lib/emp-lote-display';
import { isRegistroEmAndamento } from '@/lib/analise';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { DetalheLote, type PreviewDoc } from './registros-expandable';
import { Search, X, ArrowUpDown, ChevronRight, ChevronDown } from 'lucide-react';

interface RegistrosGroupedProps {
  registros: RegistroCompleto[];
  userRole: UserRole;
  onUpdate: (registroId: string, updates: Record<string, unknown>) => Promise<void>;
  onSendBoleto?: (registro: RegistroCompleto, url: string) => void;
  onSendOP?: (registro: RegistroCompleto, url: string) => void;
  onSendMatricula?: (registro: RegistroCompleto) => void;
}

type SortField = 'lote' | 'cliente' | 'etapa' | 'contrato' | 'pago';
type SortDir = 'asc' | 'desc';

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

const headerBg = 'var(--primary-light)';

function pctPago(r: RegistroCompleto): number | null {
  const c = r.contrato;
  if (!c || c.valor_total <= 0) return null;
  return Math.round((c.valor_ja_pago / c.valor_total) * 100);
}

/** Indicadores de documentos: acesos quando o documento já existe */
function DocIndicators({ r }: { r: Registro }) {
  const docs: Array<[string, boolean]> = [
    ['B', !!r.boleto_itbi_url],
    ['C', !!r.comprovante_itbi_url],
    ['OP', !!r.op_registro_url],
    ['NF', !!r.nf_registro_url],
    ['M', !!r.matricula_url],
  ];
  return (
    <span className="inline-flex gap-1.5 text-[10px] font-semibold tracking-wide">
      {docs.map(([label, on]) => (
        <span
          key={label}
          title={`${label}: ${on ? 'anexado' : 'falta'}`}
          style={{ color: on ? 'var(--secondary)' : 'var(--gray-light)' }}
        >
          {label}
        </span>
      ))}
    </span>
  );
}

export function RegistrosGrouped({
  registros,
  userRole,
  onUpdate,
  onSendBoleto,
  onSendOP,
  onSendMatricula,
}: RegistrosGroupedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaFilters, setEtapaFilters] = useState<string[]>([]);
  const [empFilters, setEmpFilters] = useState<string[]>([]);
  const [flagFilters, setFlagFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('lote');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set());
  const [openLotes, setOpenLotes] = useState<Set<string>>(new Set());
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

  const canEdit = userRole !== 'leitor';
  const canEditEtapa = userRole === 'gestor';

  const empreendimentos = useMemo(
    () => Array.from(new Set(registros.map((r) => r.empreendimento.nome))).sort(),
    [registros]
  );
  const etapaOptions = useMemo(() => ALL_ETAPAS.map((e) => ({ value: e, label: e })), []);
  const empOptions = useMemo(
    () => empreendimentos.map((e) => ({ value: e, label: e })),
    [empreendimentos]
  );
  const flagOptions = [
    { value: 'impugnado', label: 'Impugnados' },
    { value: 'segurar', label: 'Segurar registro' },
    { value: 'resp_cliente', label: 'Resp. cliente' },
    { value: 'caixa', label: 'Financ. CAIXA' },
  ];

  const groups = useMemo(() => {
    let data = registros;

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      // Termo só com dígitos = busca por NÚMERO DE LOTE exato: "1" acha o lote 1 em
      // todos os empreendimentos (não o 10/11/21). Senão, busca por texto.
      const numericTerm = /^\d+$/.test(term) ? parseInt(term, 10) : null;
      if (numericTerm !== null) {
        data = data.filter((r) => {
          const m = r.lote.numero.match(/\d+/);
          return m ? parseInt(m[0], 10) === numericTerm : false;
        });
      } else {
        data = data.filter(
          (r) =>
            r.lote.numero.toLowerCase().includes(term) ||
            r.contrato?.cliente_nome.toLowerCase().includes(term) ||
            r.contrato?.cliente_email?.toLowerCase().includes(term) ||
            r.empreendimento.nome.toLowerCase().includes(term) ||
            (r.registro.andamento || '').toLowerCase().includes(term) ||
            (r.registro.observacoes || '').toLowerCase().includes(term)
        );
      }
    }
    if (etapaFilters.length > 0) {
      data = data.filter((r) => etapaFilters.includes(r.etapa));
    }
    if (empFilters.length > 0) {
      data = data.filter((r) => empFilters.includes(r.empreendimento.nome));
    }
    if (flagFilters.length > 0) {
      data = data.filter((r) =>
        flagFilters.some((f) => {
          switch (f) {
            case 'impugnado':
              return r.registro.impugnado;
            case 'segurar':
              return r.registro.segurar_registro;
            case 'resp_cliente':
              return r.registro.responsabilidade_cliente;
            case 'caixa':
              return r.registro.financiamento_caixa;
            default:
              return false;
          }
        })
      );
    }

    const map = new Map<number, { emp: Empreendimento; lotes: RegistroCompleto[] }>();
    for (const r of data) {
      const k = r.empreendimento.id;
      if (!map.has(k)) map.set(k, { emp: r.empreendimento, lotes: [] });
      map.get(k)!.lotes.push(r);
    }

    const arr = [...map.values()];
    for (const g of arr) {
      g.lotes.sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'lote':
            cmp = a.lote.numero.localeCompare(b.lote.numero, 'pt-BR', { numeric: true });
            break;
          case 'cliente':
            cmp = (a.contrato?.cliente_nome || '').localeCompare(b.contrato?.cliente_nome || '');
            break;
          case 'contrato':
            cmp = (a.contrato?.data_contrato || '').localeCompare(b.contrato?.data_contrato || '');
            break;
          case 'etapa':
            cmp = ALL_ETAPAS.indexOf(a.etapa) - ALL_ETAPAS.indexOf(b.etapa);
            break;
          case 'pago':
            cmp = (pctPago(a) ?? -1) - (pctPago(b) ?? -1);
            break;
        }
        if (cmp === 0) {
          cmp = a.lote.numero.localeCompare(b.lote.numero, 'pt-BR', { numeric: true });
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    arr.sort((a, b) => a.emp.nome.localeCompare(b.emp.nome));
    return arr;
  }, [registros, searchTerm, etapaFilters, empFilters, flagFilters, sortField, sortDir]);

  const totalLotes = useMemo(() => groups.reduce((s, g) => s + g.lotes.length, 0), [groups]);

  const forceOpen = searchTerm.trim().length > 0;
  const isGroupOpen = (id: number) => forceOpen || openGroups.has(id);

  const toggleGroup = (id: number) =>
    setOpenGroups((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleLote = (id: string) =>
    setOpenLotes((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allGroupsOpen = groups.length > 0 && groups.every((g) => openGroups.has(g.emp.id));
  const toggleAllGroups = () => {
    if (allGroupsOpen) setOpenGroups(new Set());
    else setOpenGroups(new Set(groups.map((g) => g.emp.id)));
  };

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(f);
      setSortDir('asc');
    }
  };

  const SortHeader = ({
    field,
    children,
    align = 'left',
  }: {
    field: SortField;
    children: React.ReactNode;
    align?: 'left' | 'right';
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors hover:text-[var(--primary)] ${
        align === 'right' ? 'justify-end w-full' : ''
      } ${sortField === field ? 'text-[var(--primary)]' : ''}`}
      style={sortField === field ? undefined : { color: 'var(--primary-dark)' }}
    >
      {children}
      <ArrowUpDown className="w-2.5 h-2.5" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--gray-lighter)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
            <Input
              placeholder="Nº do lote (ex.: 1) ou cliente — em todos os empreendimentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-400 hover:text-orange-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <MultiSelect
            options={etapaOptions}
            selected={etapaFilters}
            onChange={setEtapaFilters}
            placeholder="Etapas"
            className="w-[190px]"
          />
          <MultiSelect
            options={empOptions}
            selected={empFilters}
            onChange={setEmpFilters}
            placeholder="Empreendimentos"
            className="w-[200px]"
          />
          <MultiSelect
            options={flagOptions}
            selected={flagFilters}
            onChange={setFlagFilters}
            placeholder="Flags"
            className="w-[160px]"
          />

          <span className="text-xs font-medium" style={{ color: 'var(--primary-dark)' }}>
            {totalLotes} lote(s) · {groups.length} empreend.
          </span>

          <button
            onClick={toggleAllGroups}
            className="ml-auto text-xs font-medium hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            {allGroupsOpen ? 'Recolher todos' : 'Expandir todos'}
          </button>
        </div>
      </div>

      {/* Empreendimentos */}
      <div className="space-y-3">
        {groups.map((g) => {
          const open = isGroupOpen(g.emp.id);
          const total = g.lotes.length;
          const registrados = g.lotes.filter((l) => l.etapa === 'Concluído').length;
          const pct = total > 0 ? Math.round((registrados / total) * 100) : 0;
          const andamento = g.lotes.filter(isRegistroEmAndamento).length;
          const pendencias = g.lotes.filter((l) => l.registro.impugnado).length;
          const empBorder = getEmpBorder(g.emp.nome);

          return (
            <div
              key={g.emp.id}
              className="rounded-xl border border-[var(--gray-lighter)] bg-[var(--bg-card)] overflow-hidden shadow-sm"
            >
              <button
                onClick={() => toggleGroup(g.emp.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 transition-colors hover:bg-[var(--bg-hover)] ${empBorder}`}
              >
                {open ? (
                  <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-gray-400" />
                )}
                <span className="font-bold text-sm">{g.emp.nome}</span>

                <span className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] justify-end" style={{ color: 'var(--text-muted)' }}>
                  <span><strong style={{ color: 'var(--text-main)' }}>{total}</strong> lotes</span>
                  <span className="flex items-center gap-1.5">
                    <strong style={{ color: 'var(--secondary)' }}>{pct}%</strong> registrados
                    <span className="inline-block w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                      <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--secondary)' }} />
                    </span>
                  </span>
                  {andamento > 0 && (
                    <span><strong style={{ color: '#D97706' }}>{andamento}</strong> em andamento</span>
                  )}
                  {pendencias > 0 && (
                    <span><strong style={{ color: '#DC2626' }}>{pendencias}</strong> pendência(s)</span>
                  )}
                </span>
              </button>

              {open && (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr style={{ background: headerBg }}>
                      <th className="px-2 py-2 w-8" style={{ background: headerBg }} />
                      <th className="px-3 py-2 text-left" style={{ background: headerBg }}>
                        <SortHeader field="lote">Lote</SortHeader>
                      </th>
                      <th className="px-3 py-2 text-left" style={{ background: headerBg }}>
                        <SortHeader field="cliente">Cliente</SortHeader>
                      </th>
                      <th className="px-3 py-2 text-left" style={{ background: headerBg }}>
                        <SortHeader field="etapa">Etapa</SortHeader>
                      </th>
                      <th className="px-3 py-2 text-left" style={{ background: headerBg }}>
                        <SortHeader field="contrato">Contrato</SortHeader>
                      </th>
                      <th className="px-3 py-2 text-right" style={{ background: headerBg }}>
                        <SortHeader field="pago" align="right">Pago / Total</SortHeader>
                      </th>
                      <th className="px-3 py-2 text-center" style={{ background: headerBg }}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--primary-dark)' }}>
                          Documentos
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.lotes.map((item) => {
                      const loteOpen = openLotes.has(item.registro.id);
                      const pagoPct = pctPago(item);
                      return (
                        <Fragment key={item.registro.id}>
                          <tr
                            onClick={() => toggleLote(item.registro.id)}
                            className={`group cursor-pointer border-t border-gray-100 transition-colors ${
                              loteOpen ? '' : 'hover:bg-[var(--bg-hover)]'
                            }`}
                            style={loteOpen ? { background: headerBg } : undefined}
                          >
                            <td className="px-2 py-2 text-center align-middle">
                              {loteOpen ? (
                                <ChevronDown className="w-4 h-4 inline" style={{ color: 'var(--primary)' }} />
                              ) : (
                                <ChevronRight className="w-4 h-4 inline text-gray-400 group-hover:text-[var(--primary)]" />
                              )}
                            </td>
                            <td className="px-3 py-2 font-semibold">{item.lote.numero}</td>
                            <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                              {item.contrato?.cliente_nome || '—'}
                            </td>
                            <td className="px-3 py-2">
                              <EtapaBadge etapa={item.etapa} />
                            </td>
                            <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              {formatDate(item.contrato?.data_contrato || null) || '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              {pagoPct !== null ? (
                                <span
                                  className="inline-flex items-center gap-1.5 justify-end"
                                  title={
                                    item.contrato
                                      ? `${formatCurrency(item.contrato.valor_ja_pago)} de ${formatCurrency(item.contrato.valor_total)}`
                                      : undefined
                                  }
                                >
                                  {pagoPct}%
                                  <span className="inline-block w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                                    <span className="block h-full rounded-full" style={{ width: `${Math.min(pagoPct, 100)}%`, background: 'var(--secondary)' }} />
                                  </span>
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <DocIndicators r={item.registro} />
                            </td>
                          </tr>

                          {loteOpen && (
                            <tr style={{ background: 'var(--bg-input)' }}>
                              <td colSpan={7} className="px-4 pb-5 pt-2">
                                <DetalheLote
                                  item={item}
                                  canEdit={canEdit}
                                  canEditEtapa={canEditEtapa}
                                  onUpdate={onUpdate}
                                  onSendBoleto={onSendBoleto}
                                  onSendOP={onSendOP}
                                  onSendMatricula={onSendMatricula}
                                  onPreview={setPreviewDoc}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}

        {groups.length === 0 && (
          <div
            className="rounded-xl border border-[var(--gray-lighter)] bg-[var(--bg-card)] px-4 py-12 text-center shadow-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Nenhum lote encontrado
          </div>
        )}
      </div>

      {previewDoc && (
        <DocumentPreview
          url={previewDoc.url}
          title={previewDoc.title}
          open
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
