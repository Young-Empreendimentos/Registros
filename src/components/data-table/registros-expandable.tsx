'use client';

import { Fragment, useMemo, useState } from 'react';
import type { RegistroCompleto, UserRole } from '@/types';
import { EtapaBadge } from './etapa-badge';
import { InlineTextEdit, InlineCheckbox, UrlField } from './inline-edit';
import { InlineEtapaSelect } from './inline-etapa-select';
import { DocumentPreview } from '@/components/document-preview';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  getAndamento,
  buildAndamentoUpdate,
  getEtapaAnalise,
  ETAPAS_ANALISE,
} from '@/lib/analise';
import { getEmpBorder } from '@/lib/emp-lote-display';
import { EmpLoteCell, ClienteCell } from './registro-identity-cells';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Mail,
  Search,
  X,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

type PreviewDoc = { url: string; title: string };

interface RegistrosExpandableProps {
  registros: RegistroCompleto[];
  userRole: UserRole;
  onUpdate: (registroId: string, updates: Record<string, unknown>) => Promise<void>;
  onSendBoleto?: (registro: RegistroCompleto, url: string) => void;
  onSendOP?: (registro: RegistroCompleto, url: string) => void;
  onSendMatricula?: (registro: RegistroCompleto) => void;
}

type SortField = 'lote' | 'empreendimento' | 'cliente' | 'dias' | 'etapa';
type SortDir = 'asc' | 'desc';

const headerBg = 'var(--primary-light)';

export function RegistrosExpandable({
  registros,
  userRole,
  onUpdate,
  onSendBoleto,
  onSendOP,
  onSendMatricula,
}: RegistrosExpandableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [etapaFilters, setEtapaFilters] = useState<string[]>([]);
  const [empFilters, setEmpFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('dias');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

  const canEdit = userRole !== 'leitor';
  const canEditEtapa = userRole === 'gestor';

  const empreendimentos = useMemo(() => {
    const set = new Set(registros.map((r) => r.empreendimento.nome));
    return Array.from(set).sort();
  }, [registros]);

  const etapaOptions = useMemo(() => ETAPAS_ANALISE.map((e) => ({ value: e, label: e })), []);
  const empOptions = useMemo(
    () => empreendimentos.map((e) => ({ value: e, label: e })),
    [empreendimentos]
  );

  const filtered = useMemo(() => {
    let data = [...registros];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.lote.numero.toLowerCase().includes(term) ||
          r.contrato?.cliente_nome.toLowerCase().includes(term) ||
          r.contrato?.cliente_email?.toLowerCase().includes(term) ||
          r.empreendimento.nome.toLowerCase().includes(term) ||
          (getAndamento(r.registro) || '').toLowerCase().includes(term) ||
          (r.registro.observacoes || '').toLowerCase().includes(term)
      );
    }

    if (etapaFilters.length > 0) {
      data = data.filter((r) => etapaFilters.includes(getEtapaAnalise(r)));
    }

    if (empFilters.length > 0) {
      data = data.filter((r) => empFilters.includes(r.empreendimento.nome));
    }

    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'lote':
          cmp = a.lote.numero.localeCompare(b.lote.numero, 'pt-BR', { numeric: true });
          break;
        case 'empreendimento':
          cmp = a.empreendimento.nome.localeCompare(b.empreendimento.nome);
          if (cmp === 0)
            cmp = a.lote.numero.localeCompare(b.lote.numero, 'pt-BR', { numeric: true });
          break;
        case 'cliente':
          cmp = (a.contrato?.cliente_nome || '').localeCompare(b.contrato?.cliente_nome || '');
          break;
        case 'dias':
          cmp = (a.dias || 0) - (b.dias || 0);
          break;
        case 'etapa':
          cmp =
            ETAPAS_ANALISE.indexOf(getEtapaAnalise(a)) -
            ETAPAS_ANALISE.indexOf(getEtapaAnalise(b));
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [registros, searchTerm, etapaFilters, empFilters, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allExpanded = filtered.length > 0 && filtered.every((r) => expanded.has(r.registro.id));
  const toggleAll = () => {
    if (allExpanded) setExpanded(new Set());
    else setExpanded(new Set(filtered.map((r) => r.registro.id)));
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
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-[var(--primary)] ${
        align === 'right' ? 'justify-end w-full' : ''
      }`}
      style={{ color: 'var(--primary-dark)' }}
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--gray-lighter)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
            <Input
              placeholder="Buscar lote, cliente, comentário..."
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
            className="w-[220px]"
          />

          <MultiSelect
            options={empOptions}
            selected={empFilters}
            onChange={setEmpFilters}
            placeholder="Empreendimentos"
            className="w-[200px]"
          />

          <span className="text-xs font-medium" style={{ color: 'var(--primary-dark)' }}>
            {filtered.length} registro(s)
          </span>

          <button
            onClick={toggleAll}
            className="ml-auto text-xs font-medium hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            {allExpanded ? 'Recolher todos' : 'Expandir todos'}
          </button>
        </div>
      </div>

      {/* Tabela enxuta (sem scroll lateral) */}
      <div className="rounded-xl border border-[var(--gray-lighter)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr style={{ background: headerBg }}>
              <th className="sticky top-0 z-10 px-2 py-3 w-9" style={{ background: headerBg }} />
              <th className="sticky top-0 z-10 px-3 py-3 text-left" style={{ background: headerBg }}>
                <SortHeader field="empreendimento">Emp. / Lote</SortHeader>
              </th>
              <th className="sticky top-0 z-10 px-3 py-3 text-left" style={{ background: headerBg }}>
                <SortHeader field="cliente">Cliente</SortHeader>
              </th>
              <th className="sticky top-0 z-10 px-3 py-3 text-left" style={{ background: headerBg }}>
                <SortHeader field="etapa">Etapa</SortHeader>
              </th>
              <th
                className="sticky top-0 z-10 px-3 py-3 text-right w-[80px]"
                style={{ background: headerBg }}
              >
                <SortHeader field="dias" align="right">Dias</SortHeader>
              </th>
              <th className="sticky top-0 z-10 px-3 py-3 text-left" style={{ background: headerBg }}>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--primary-dark)' }}
                >
                  Andamento
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const isOpen = expanded.has(item.registro.id);
              const etapa = getEtapaAnalise(item);
              const andamento = getAndamento(item.registro);
              const empBorder = getEmpBorder(item.empreendimento.nome);

              return (
                <Fragment key={item.registro.id}>
                  <tr
                    onClick={() => toggleExpand(item.registro.id)}
                    className={`group cursor-pointer border-t border-gray-100 border-l-4 transition-colors ${empBorder} ${
                      isOpen ? '' : 'hover:bg-[var(--bg-hover)]'
                    }`}
                    style={isOpen ? { background: headerBg } : undefined}
                  >
                    <td className="px-2 py-2.5 text-center align-middle">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 inline" style={{ color: 'var(--primary)' }} />
                      ) : (
                        <ChevronRight className="w-4 h-4 inline text-gray-400 group-hover:text-[var(--primary)]" />
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <EmpLoteCell
                        empreendimentoNome={item.empreendimento.nome}
                        loteNumero={item.lote.numero}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <ClienteCell
                        nome={item.contrato?.cliente_nome}
                        email={item.contrato?.cliente_email}
                        compact
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <EtapaBadge etapa={etapa} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px]">
                      {item.dias !== null ? (
                        <span
                          className={
                            item.dias > 60
                              ? 'text-red-600 font-semibold'
                              : item.dias > 30
                                ? 'text-amber-600 font-medium'
                                : 'text-gray-500'
                          }
                        >
                          {item.dias}d
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div
                        className="truncate text-[12px]"
                        style={{ maxWidth: 360, color: andamento ? 'var(--text-main)' : 'var(--text-muted)' }}
                        title={andamento || ''}
                      >
                        {andamento || '—'}
                      </div>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr
                      className={`border-l-4 ${empBorder}`}
                      style={{ background: 'var(--bg-input)' }}
                    >
                      <td colSpan={6} className="px-4 pb-5 pt-2">
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

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Nenhum registro em andamento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

/* ---------- Painel de detalhe (desdobrável) ---------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[10px] font-bold uppercase tracking-wider pb-1 mb-2 border-b-2"
      style={{ color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
    >
      {children}
    </h3>
  );
}

function Field({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[12px]">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function EditRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[12px] min-h-[26px]">
      <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="text-right">{children}</div>
    </div>
  );
}

interface DetalheLoteProps {
  item: RegistroCompleto;
  canEdit: boolean;
  canEditEtapa: boolean;
  onUpdate: (registroId: string, updates: Record<string, unknown>) => Promise<void>;
  onSendBoleto?: (registro: RegistroCompleto, url: string) => void;
  onSendOP?: (registro: RegistroCompleto, url: string) => void;
  onSendMatricula?: (registro: RegistroCompleto) => void;
  onPreview: (doc: PreviewDoc) => void;
}

function DetalheLote({
  item,
  canEdit,
  canEditEtapa,
  onUpdate,
  onSendBoleto,
  onSendOP,
  onSendMatricula,
  onPreview,
}: DetalheLoteProps) {
  const r = item.registro;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-5">
      {/* Valores & gatilho */}
      <section>
        <SectionTitle>Valores &amp; gatilho</SectionTitle>
        <Field label="À vista" value={item.lote.valor_avista ? formatCurrency(item.lote.valor_avista) : '-'} />
        <Field label="Total" value={item.contrato ? formatCurrency(item.contrato.valor_total) : '-'} />
        <Field
          label="Pago"
          value={item.contrato ? formatCurrency(item.contrato.valor_ja_pago) : '-'}
          valueClass="text-emerald-600 font-medium"
        />
        <Field
          label="Gatilho"
          value={
            item.gatilho > 0
              ? `${formatCurrency(item.gatilho)}${item.gatilho_atingido ? ' ✓' : ''}`
              : '-'
          }
        />
        <Field label="Contrato" value={formatDate(item.contrato?.data_contrato || null) || '-'} />
        <Field label="Data gatilho" value={formatDate(r.data_gatilho) || '-'} />
      </section>

      {/* ITBI */}
      <section>
        <SectionTitle>ITBI</SectionTitle>
        <EditRow label="Solicitação">
          <InlineTextEdit
            value={r.data_solicitacao_itbi}
            onSave={async (v) => onUpdate(r.id, { data_solicitacao_itbi: v || null })}
            disabled={!canEdit}
            type="date"
          />
        </EditRow>
        <Field
          label="Esperado"
          value={item.valor_esperado_itbi > 0 ? formatCurrency(item.valor_esperado_itbi) : '-'}
        />
        <EditRow label="Valor ITBI">
          <InlineTextEdit
            value={r.valor_itbi?.toString() || null}
            onSave={async (v) => onUpdate(r.id, { valor_itbi: v ? parseFloat(v) : null })}
            disabled={!canEdit}
            type="number"
            placeholder="R$ 0,00"
          />
        </EditRow>
        <Field
          label="Divergência"
          value={item.divergencias !== null ? formatCurrency(item.divergencias) : '-'}
        />
        <EditRow label="Boleto">
          <UrlField
            value={r.boleto_itbi_url}
            onSave={async (v) => {
              await onUpdate(r.id, { boleto_itbi_url: v || null });
              if (v && onSendBoleto) onSendBoleto(item, v);
            }}
            onPreview={() =>
              r.boleto_itbi_url &&
              onPreview({ url: r.boleto_itbi_url, title: `Boleto ITBI - Lote ${item.lote.numero}` })
            }
            disabled={!canEdit}
          />
        </EditRow>
        <EditRow label="Comprovante">
          <UrlField
            value={r.comprovante_itbi_url}
            onSave={async (v) => onUpdate(r.id, { comprovante_itbi_url: v || null })}
            onPreview={() =>
              r.comprovante_itbi_url &&
              onPreview({
                url: r.comprovante_itbi_url,
                title: `Comprovante ITBI - Lote ${item.lote.numero}`,
              })
            }
            disabled={!canEdit}
          />
        </EditRow>
        <EditRow label="Recolhimento">
          <InlineTextEdit
            value={r.data_recolhimento_itbi}
            onSave={async (v) => onUpdate(r.id, { data_recolhimento_itbi: v || null })}
            disabled={!canEdit}
            type="date"
          />
        </EditRow>
      </section>

      {/* Cartório / registro */}
      <section>
        <SectionTitle>Cartório / registro</SectionTitle>
        <EditRow label="OP registro">
          <UrlField
            value={r.op_registro_url}
            onSave={async (v) => {
              await onUpdate(r.id, { op_registro_url: v || null });
              if (v && onSendOP) onSendOP(item, v);
            }}
            onPreview={() =>
              r.op_registro_url &&
              onPreview({ url: r.op_registro_url, title: `OP Registro - Lote ${item.lote.numero}` })
            }
            disabled={!canEdit}
          />
        </EditRow>
        <EditRow label="NF registro">
          <UrlField
            value={r.nf_registro_url}
            onSave={async (v) => onUpdate(r.id, { nf_registro_url: v || null })}
            onPreview={() =>
              r.nf_registro_url &&
              onPreview({ url: r.nf_registro_url, title: `NF Registro - Lote ${item.lote.numero}` })
            }
            disabled={!canEdit}
          />
        </EditRow>
        <EditRow label="Entrega RI">
          <InlineTextEdit
            value={r.data_entrega_ri}
            onSave={async (v) => onUpdate(r.id, { data_entrega_ri: v || null })}
            disabled={!canEdit}
            type="date"
          />
        </EditRow>
        <EditRow label="Recebimento RI">
          <InlineTextEdit
            value={r.data_recebimento_ri}
            onSave={async (v) => onUpdate(r.id, { data_recebimento_ri: v || null })}
            disabled={!canEdit}
            type="date"
          />
        </EditRow>
        <EditRow label="Matrícula">
          <UrlField
            value={r.matricula_url}
            onSave={async (v) => onUpdate(r.id, { matricula_url: v || null })}
            onPreview={() =>
              r.matricula_url &&
              onPreview({ url: r.matricula_url, title: `Matrícula - Lote ${item.lote.numero}` })
            }
            disabled={!canEdit}
          />
        </EditRow>
        {r.matricula_url && item.contrato?.cliente_email && (
          <button
            onClick={() => onSendMatricula?.(item)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-700"
          >
            <Mail className="w-3 h-3" /> Enviar matrícula ao cliente
          </button>
        )}
      </section>

      {/* Situação & andamento */}
      <section>
        <SectionTitle>Situação &amp; andamento</SectionTitle>
        <div className="flex flex-col gap-1.5 mb-3">
          <InlineCheckbox
            checked={r.impugnado}
            onToggle={async (v) => onUpdate(r.id, { impugnado: v })}
            disabled={!canEditEtapa}
            label="Impugnado"
          />
          <InlineCheckbox
            checked={r.responsabilidade_cliente}
            onToggle={async (v) => onUpdate(r.id, { responsabilidade_cliente: v })}
            disabled={!canEdit}
            label="Resp. cliente"
          />
          <InlineCheckbox
            checked={r.segurar_registro}
            onToggle={async (v) => onUpdate(r.id, { segurar_registro: v })}
            disabled={!canEdit}
            label="Segurar registro"
          />
          <InlineCheckbox
            checked={r.financiamento_caixa}
            onToggle={async (v) => onUpdate(r.id, { financiamento_caixa: v })}
            disabled={!canEdit}
            label="Financ. CAIXA"
          />
        </div>

        <div className="mb-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Etapa (análise)
          </p>
          <InlineEtapaSelect
            value={getEtapaAnalise(item)}
            manual={r.etapa_analise ?? null}
            options={ETAPAS_ANALISE}
            fullLabel
            disabled={!canEdit}
            onSave={async (etapaAnalise) => onUpdate(r.id, { etapa_analise: etapaAnalise })}
          />
        </div>

        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Andamento
          </p>
          <InlineTextEdit
            value={getAndamento(r)}
            onSave={async (v) => onUpdate(r.id, buildAndamentoUpdate(v))}
            disabled={!canEdit}
            placeholder="Descrever andamento..."
          />
        </div>
      </section>
    </div>
  );
}
