'use client';

import { useState, useMemo } from 'react';
import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { EtapaBadge } from '@/components/data-table/etapa-badge';
import { InlineTextEdit } from '@/components/data-table/inline-edit';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Search,
  X,
  ArrowUpDown,
  BarChart3,
} from 'lucide-react';
import type { Etapa } from '@/types';

type SortField = 'lote' | 'empreendimento' | 'cliente' | 'dias' | 'etapa';
type SortDir = 'asc' | 'desc';

const ETAPAS_EM_ANDAMENTO: Etapa[] = [
  'Com pendências',
  'Aguardando conclusão de registro +30 dias',
  'Aguardando conclusão de registro',
  'Solicitar ITBI',
  'Aguardando emissão guia ITBI',
  'Pagar ITBI',
  'ITBI pago/coletar assinaturas',
  'Gatilho atingido',
];

const ALL_ETAPAS: Etapa[] = [
  'Com pendências',
  'Aguardando conclusão de registro +30 dias',
  'Aguardando conclusão de registro',
  'Solicitar ITBI',
  'Aguardando emissão guia ITBI',
  'Pagar ITBI',
  'ITBI pago/coletar assinaturas',
  'Gatilho atingido',
];

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
    return registros.filter((r) => ETAPAS_EM_ANDAMENTO.includes(r.etapa));
  }, [registros]);

  const empreendimentos = useMemo(() => {
    const set = new Set(emAndamento.map((r) => r.empreendimento.nome));
    return Array.from(set).sort();
  }, [emAndamento]);

  const etapaOptions = useMemo(() => ALL_ETAPAS.map((e) => ({ value: e, label: e })), []);
  const empOptions = useMemo(() => empreendimentos.map((e) => ({ value: e, label: e })), [empreendimentos]);

  const filtered = useMemo(() => {
    let data = [...emAndamento];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.lote.numero.toLowerCase().includes(term) ||
          r.contrato?.cliente_nome.toLowerCase().includes(term) ||
          r.empreendimento.nome.toLowerCase().includes(term)
      );
    }

    if (etapaFilters.length > 0) {
      data = data.filter((r) => etapaFilters.includes(r.etapa));
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
          cmp = ALL_ETAPAS.indexOf(a.etapa) - ALL_ETAPAS.indexOf(b.etapa);
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
      className="flex items-center gap-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider hover:text-white transition-colors"
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Carregando...</p>
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Análise</h1>
          <p className="text-zinc-500 text-sm">
            {emAndamento.length} registro(s) em andamento
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar lote, cliente, empreendimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
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
          className="w-[220px]"
        />

        <MultiSelect
          options={empOptions}
          selected={empFilters}
          onChange={handleMultiFilterChange(setEmpFilters)}
          placeholder="Empreendimentos"
          className="w-[200px]"
        />

        <span className="text-xs text-zinc-500">
          {filtered.length} registro(s)
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <ScrollArea className="w-full">
          <div className="min-w-[900px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-4 py-3 text-left w-[100px]">
                    <SortHeader field="lote">Lote</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left w-[180px]">
                    <SortHeader field="empreendimento">Empreendimento</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left w-[250px]">
                    <SortHeader field="cliente">Nome Cliente</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-center w-[120px]">
                    <SortHeader field="dias">Dias em Atraso</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left w-[250px]">
                    <SortHeader field="etapa">Etapa</SortHeader>
                  </th>
                  <th className="px-4 py-3 text-left min-w-[300px]">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Andamento</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.registro.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {item.lote.numero}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {item.empreendimento.nome}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {item.contrato?.cliente_nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.dias !== null ? (
                        <span className={
                          item.dias > 180 
                            ? 'text-red-400 font-bold' 
                            : item.dias > 60 
                              ? 'text-amber-400 font-semibold' 
                              : 'text-zinc-400'
                        }>
                          {item.dias}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EtapaBadge etapa={item.etapa} />
                    </td>
                    <td className="px-4 py-3">
                      <InlineTextEdit
                        value={item.registro.observacoes}
                        onSave={async (v) => handleUpdate(item.registro.id, { observacoes: v || null })}
                        disabled={!canEdit}
                        placeholder="Adicionar observação..."
                      />
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-600">
                      Nenhum registro em andamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
