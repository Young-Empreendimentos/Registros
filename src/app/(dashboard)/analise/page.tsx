'use client';

import { useState, useMemo } from 'react';
import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { InlineTextEdit } from '@/components/data-table/inline-edit';
import { InlineEtapaSelect } from '@/components/data-table/inline-etapa-select';
import { EmpLoteCell, ClienteCell } from '@/components/data-table/registro-identity-cells';
import { getEmpBorder } from '@/lib/emp-lote-display';
import { STICKY_REGISTROS, STICKY_SHADOW } from '@/lib/sticky-table-columns';
import {
  Search,
  X,
  ArrowUpDown,
  BarChart3,
} from 'lucide-react';
import type { Etapa } from '@/types';
import {
  ETAPAS_ANALISE,
  getEtapaAnalise,
  getAndamento,
  buildAndamentoUpdate,
  isRegistroEmAndamento,
  contarRegistrosEmAndamento,
} from '@/lib/analise';

type SortField = 'lote' | 'empreendimento' | 'cliente' | 'dias' | 'etapa';
type SortDir = 'asc' | 'desc';

export default function AnalisePage() {
  const { registros, loading, error, updateRegistro } = useRegistros();
  const { profile } = useProfile();

  const [searchTerm, setSearchTerm] = useState('');
  const [etapaFilters, setEtapaFilters] = useState<string[]>([]);
  const [empFilters, setEmpFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('dias');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const canEdit = profile?.role !== 'leitor';

  const emAndamento = useMemo(() => {
    return registros.filter(isRegistroEmAndamento);
  }, [registros]);

  const empreendimentos = useMemo(() => {
    const set = new Set(emAndamento.map((r) => r.empreendimento.nome));
    return Array.from(set).sort();
  }, [emAndamento]);

  const etapaOptions = useMemo(
    () => ETAPAS_ANALISE.map((e) => ({ value: e, label: e })),
    []
  );
  const empOptions = useMemo(
    () => empreendimentos.map((e) => ({ value: e, label: e })),
    [empreendimentos]
  );

  const filtered = useMemo(() => {
    let data = [...emAndamento];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.lote.numero.toLowerCase().includes(term) ||
          r.contrato?.cliente_nome.toLowerCase().includes(term) ||
          r.empreendimento.nome.toLowerCase().includes(term) ||
          (getAndamento(r.registro) || '').toLowerCase().includes(term)
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
  }, [emAndamento, searchTerm, etapaFilters, empFilters, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleMultiFilterChange = (setter: (v: string[]) => void) => (v: string[]) => {
    setter(v);
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-orange-800 uppercase tracking-wider hover:text-orange-600 transition-colors"
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

  if (loading && registros.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-orange-800 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-orange-950">Análise</h1>
          <p className="text-orange-700 text-sm">
            {contarRegistrosEmAndamento(registros)} registro(s) em andamento
          </p>
          <p className="text-orange-600/80 text-xs mt-0.5">
            Etapa e andamento aqui são independentes da etapa automática nas outras abas. Registros concluídos saem desta lista automaticamente.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
            <Input
              placeholder="Buscar lote, cliente, empreendimento..."
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
            onChange={handleMultiFilterChange(setEtapaFilters)}
            placeholder="Etapas"
            className="w-[220px]"
          />

          <MultiSelect
            options={empOptions}
            selected={empFilters}
            onChange={handleMultiFilterChange(setEmpFilters)}
            placeholder="Empreendimentos"
            className="w-[200px]"
          />

          <span className="text-xs text-orange-800 font-medium">
            {filtered.length} registro(s)
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-orange-200 bg-white overflow-hidden shadow-sm">
        <div className="w-full overflow-auto max-h-[calc(100vh-14rem)]">
          <div className="min-w-[900px]">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="border-b border-orange-200 bg-orange-50">
                  <th
                    className={`sticky left-0 top-0 z-30 px-4 py-3 text-left ${STICKY_SHADOW}`}
                    style={{
                      background: '#fff7ed',
                      width: STICKY_REGISTROS.col1Width,
                      minWidth: STICKY_REGISTROS.col1Width,
                    }}
                  >
                    <SortHeader field="empreendimento">Emp. / Lote</SortHeader>
                  </th>
                  <th
                    className={`sticky top-0 z-30 px-4 py-3 text-left ${STICKY_SHADOW}`}
                    style={{
                      background: '#fff7ed',
                      left: STICKY_REGISTROS.col2Left,
                      width: STICKY_REGISTROS.col2Width,
                      minWidth: STICKY_REGISTROS.col2Width,
                    }}
                  >
                    <SortHeader field="cliente">Cliente</SortHeader>
                  </th>
                  <th
                    className="sticky top-0 z-20 px-4 py-3 text-center w-[120px]"
                    style={{ background: '#fff7ed' }}
                  >
                    <SortHeader field="dias">Dias em Atraso</SortHeader>
                  </th>
                  <th
                    className="sticky top-0 z-20 px-4 py-3 text-left w-[280px]"
                    style={{ background: '#fff7ed' }}
                  >
                    <SortHeader field="etapa">Etapa (análise)</SortHeader>
                  </th>
                  <th
                    className="sticky top-0 z-20 px-4 py-3 text-left min-w-[300px]"
                    style={{ background: '#fff7ed' }}
                  >
                    <span className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
                      Andamento
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const etapaExibida = getEtapaAnalise(item);
                  const andamento = getAndamento(item.registro);
                  const hoverCell = 'group-hover:bg-gray-50';

                  return (
                    <tr
                      key={item.registro.id}
                      className={`group border-b border-gray-100 transition-colors border-l-4 ${getEmpBorder(item.empreendimento.nome)}`}
                    >
                      <td
                        className={`sticky left-0 z-20 px-4 py-3 bg-white border-l-4 ${getEmpBorder(item.empreendimento.nome)} ${STICKY_SHADOW} ${hoverCell}`}
                        style={{ width: STICKY_REGISTROS.col1Width, minWidth: STICKY_REGISTROS.col1Width }}
                      >
                        <EmpLoteCell
                          empreendimentoNome={item.empreendimento.nome}
                          loteNumero={item.lote.numero}
                        />
                      </td>
                      <td
                        className={`sticky z-20 px-4 py-3 bg-white ${STICKY_SHADOW} ${hoverCell}`}
                        style={{
                          left: STICKY_REGISTROS.col2Left,
                          width: STICKY_REGISTROS.col2Width,
                          minWidth: STICKY_REGISTROS.col2Width,
                        }}
                      >
                        <ClienteCell
                          nome={item.contrato?.cliente_nome}
                          email={item.contrato?.cliente_email}
                          compact
                        />
                      </td>
                      <td className="px-4 py-3 text-center group-hover:bg-gray-50">
                        {item.dias !== null ? (
                          <span
                            className={
                              item.dias > 180
                                ? 'text-red-600 font-bold'
                                : item.dias > 60
                                  ? 'text-amber-600 font-semibold'
                                  : 'text-gray-600'
                            }
                          >
                            {item.dias}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 group-hover:bg-gray-50">
                        <InlineEtapaSelect
                          value={etapaExibida}
                          manual={item.registro.etapa_analise ?? null}
                          options={ETAPAS_ANALISE}
                          fullLabel
                          disabled={!canEdit}
                          onSave={async (etapaAnalise) =>
                            handleUpdate(item.registro.id, { etapa_analise: etapaAnalise })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 group-hover:bg-gray-50">
                        <InlineTextEdit
                          value={andamento}
                          onSave={async (v) =>
                            handleUpdate(item.registro.id, buildAndamentoUpdate(v))
                          }
                          disabled={!canEdit}
                          placeholder="Descrever andamento..."
                        />
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-orange-700">
                      Nenhum registro em andamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
