'use client';

import { useMemo, useState } from 'react';
import { useRegistros } from '@/hooks/use-registros';
import {
  AlertTriangle,
  FileWarning,
  Receipt,
  Clock,
  Ban,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  ETAPAS_ANALISE,
  EMPREENDIMENTO_EXCLUIDO_EM_ANDAMENTO,
  filtrarRegistrosEmAndamento,
  getEtapaAnalise,
  isExcluidoDoEmAndamento,
} from '@/lib/analise';
import { formatCurrency } from '@/lib/utils';
import type { Etapa, RegistroCompleto } from '@/types';

/** Ordem do funil (todas pertencem a ETAPAS_ANALISE) */
const FUNNEL_ORDER: Etapa[] = [
  'Gatilho atingido',
  'Solicitar ITBI',
  'Aguardando emissão guia ITBI',
  'Pagar ITBI',
  'ITBI pago/coletar assinaturas',
  'Aguardando conclusão de registro',
  'Aguardando conclusão de registro +30 dias',
  'Com pendências',
];

const MESES_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isQuitado(r: RegistroCompleto): boolean {
  const c = r.contrato;
  return !!c && c.valor_total > 0 && c.valor_ja_pago >= c.valor_total;
}

export default function PainelPage() {
  const { registros, loading, error } = useRegistros();
  const [selectedKey, setSelectedKey] = useState<string>('quitado');

  const data = useMemo(() => {
    const emAndamento = filtrarRegistrosEmAndamento(registros);
    const stageOf = (r: RegistroCompleto) => getEtapaAnalise(r);

    // --- Cartões de atenção ---
    const quitadoSemRegistro = registros.filter(
      (r) => isQuitado(r) && r.etapa !== 'Concluído' && !isExcluidoDoEmAndamento(r)
    );
    const faltaSolicitarITBI = emAndamento.filter((r) => stageOf(r) === 'Solicitar ITBI');
    const itbiAPagar = emAndamento.filter((r) => stageOf(r) === 'Pagar ITBI');
    const parados30 = emAndamento.filter((r) => (r.dias ?? 0) > 30);
    // Pendência (impugnado ou etapa manual "Com pendências") importa mesmo com
    // segurar_registro/CAIXA ligado — só exclui Morada da Coxilha (fora do acompanhamento).
    const comPendencias = registros.filter(
      (r) =>
        r.empreendimento.nome !== EMPREENDIMENTO_EXCLUIDO_EM_ANDAMENTO &&
        (r.registro.impugnado || getEtapaAnalise(r) === 'Com pendências')
    );

    // --- Funil por etapa ---
    const funil = FUNNEL_ORDER.map((etapa) => ({
      etapa,
      count: emAndamento.filter((r) => stageOf(r) === etapa).length,
    }));
    const funilMax = Math.max(1, ...funil.map((f) => f.count));

    // --- Por empreendimento ---
    const empMap = new Map<
      number,
      { nome: string; emAndamento: number; concluidos: number }
    >();
    for (const r of registros) {
      const key = r.empreendimento.id;
      if (!empMap.has(key)) {
        empMap.set(key, { nome: r.empreendimento.nome, emAndamento: 0, concluidos: 0 });
      }
      const row = empMap.get(key)!;
      if (r.etapa === 'Concluído') row.concluidos += 1;
    }
    for (const r of emAndamento) {
      const row = empMap.get(r.empreendimento.id);
      if (row) row.emAndamento += 1;
    }
    const porEmp = [...empMap.values()]
      .filter((e) => e.emAndamento > 0 || e.concluidos > 0)
      .sort((a, b) => b.emAndamento - a.emAndamento);

    // --- Produtividade: concluídos por mês (data_recebimento_ri) ---
    const now = new Date();
    const meses: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push({ key: monthKey(d), label: MESES_PT[d.getMonth()], count: 0 });
    }
    const mesIndex = new Map(meses.map((m, i) => [m.key, i]));
    let concluidosTotal = 0;
    for (const r of registros) {
      if (r.etapa !== 'Concluído') continue;
      concluidosTotal += 1;
      const dt = r.registro.data_recebimento_ri;
      if (!dt) continue;
      const k = monthKey(new Date(dt));
      const idx = mesIndex.get(k);
      if (idx != null) meses[idx].count += 1;
    }
    const concluidosMes = meses[meses.length - 1]?.count ?? 0;
    const mesesMax = Math.max(1, ...meses.map((m) => m.count));

    return {
      totalEmAndamento: emAndamento.length,
      concluidosTotal,
      concluidosMes,
      groups: [
        {
          key: 'quitado',
          label: 'Quitados sem registro',
          hint: 'Pago 100%, sem matrícula',
          color: '#DC2626',
          icon: AlertTriangle,
          items: quitadoSemRegistro,
        },
        {
          key: 'solicitar',
          label: 'Falta solicitar ITBI',
          hint: 'Gatilho atingido',
          color: 'var(--primary)',
          icon: FileWarning,
          items: faltaSolicitarITBI,
        },
        {
          key: 'pagar',
          label: 'ITBI a pagar',
          hint: 'Guia emitida',
          color: '#F59E0B',
          icon: Receipt,
          items: itbiAPagar,
        },
        {
          key: 'parados',
          label: '+30 dias em andamento',
          hint: 'Sem concluir há mais de um mês',
          color: '#3B82F6',
          icon: Clock,
          items: parados30,
        },
        {
          key: 'pendencias',
          label: 'Com pendências',
          hint: 'Impugnado ou marcado com pendência',
          color: '#751900',
          icon: Ban,
          items: comPendencias,
        },
      ] as const,
      funil,
      funilMax,
      porEmp,
      meses,
      mesesMax,
    };
  }, [registros]);

  if (loading && registros.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center alert alert-danger">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const selected = data.groups.find((g) => g.key === selectedKey) ?? data.groups[0];

  return (
    <div className="space-y-6">
      {/* Precisa de atenção */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Precisa de atenção
        </h2>
        <div className="quick-cards-grid">
          {data.groups.map((g) => {
            const Icon = g.icon;
            const isActive = g.key === selected.key;
            const count = g.items.length;
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => setSelectedKey(g.key)}
                className="stat-card text-left transition-all"
                style={{
                  borderLeftColor: g.color,
                  cursor: 'pointer',
                  outline: isActive ? `2px solid ${g.color}` : 'none',
                  outlineOffset: '1px',
                  opacity: count === 0 ? 0.6 : 1,
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="stat-label" style={{ margin: 0 }}>{g.label}</p>
                  <Icon className="w-4 h-4" style={{ color: g.color }} />
                </div>
                <p
                  className="stat-value"
                  style={{ color: count > 0 ? g.color : 'var(--text-muted)' }}
                >
                  {count}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{g.hint}</p>
              </button>
            );
          })}
        </div>

        {/* Detalhe do grupo selecionado */}
        <div className="data-table-shell">
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: 'var(--gray-lighter)' }}
          >
            <selected.icon className="w-4 h-4" style={{ color: selected.color }} />
            <span className="text-sm font-semibold">{selected.label}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
            >
              {selected.items.length}
            </span>
          </div>
          {selected.items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhum lote neste grupo. 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs">
                    <th className="px-4 py-2 font-medium">Lote</th>
                    <th className="px-4 py-2 font-medium">Empreendimento</th>
                    <th className="px-4 py-2 font-medium">Cliente</th>
                    <th className="px-4 py-2 font-medium">Etapa</th>
                    <th className="px-4 py-2 font-medium text-right">Dias</th>
                    <th className="px-4 py-2 font-medium text-right">Valor pago</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items
                    .slice()
                    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))
                    .map((r) => (
                      <tr
                        key={r.registro.id}
                        className="border-t"
                        style={{ borderColor: 'var(--gray-lighter)' }}
                      >
                        <td className="px-4 py-2 font-medium">{r.lote.numero}</td>
                        <td className="px-4 py-2" style={{ color: 'var(--text-muted)' }}>
                          {r.empreendimento.nome}
                        </td>
                        <td className="px-4 py-2" style={{ color: 'var(--text-muted)' }}>
                          {r.contrato?.cliente_nome || '—'}
                        </td>
                        <td className="px-4 py-2" style={{ color: 'var(--text-muted)' }}>
                          {getEtapaAnalise(r)}
                        </td>
                        <td
                          className="px-4 py-2 text-right"
                          style={{ color: (r.dias ?? 0) > 30 ? '#DC2626' : 'var(--text-muted)' }}
                        >
                          {r.dias ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-right" style={{ color: 'var(--text-muted)' }}>
                          {r.contrato ? formatCurrency(r.contrato.valor_ja_pago) : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Resumo + funil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Andamento por etapa */}
        <div className="details-section">
          <h2 className="text-base font-semibold mb-4">Andamento por etapa</h2>
          <div className="space-y-3">
            {data.funil.map((f) => (
              <div key={f.etapa}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px]" style={{ color: 'var(--text-main)' }}>{f.etapa}</span>
                  <span className="text-[13px] font-semibold">{f.count}</span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--bg-hover)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(f.count / data.funilMax) * 100}%`,
                      background: 'var(--primary)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo numérico */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card" style={{ borderLeftColor: 'var(--primary)' }}>
              <p className="stat-label">Em andamento</p>
              <p className="stat-value">{data.totalEmAndamento}</p>
            </div>
            <div className="stat-card" style={{ borderLeftColor: 'var(--secondary)' }}>
              <p className="stat-label">Concluídos (total)</p>
              <p className="stat-value">{data.concluidosTotal}</p>
            </div>
          </div>

          <div className="details-section">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
              <h2 className="text-base font-semibold">Produtividade</h2>
            </div>
            <div className="flex items-end gap-2 mb-5">
              <CheckCircle2 className="w-5 h-5 mb-1" style={{ color: 'var(--secondary)' }} />
              <span className="text-3xl font-bold">{data.concluidosMes}</span>
              <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>concluídos este mês</span>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses</p>
            <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
              {data.meses.map((m) => (
                <div key={m.key} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-semibold">{m.count}</span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(m.count / data.mesesMax) * 90}px`,
                      minHeight: m.count > 0 ? 4 : 0,
                      background: 'var(--secondary)',
                    }}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Por empreendimento */}
      <div className="details-section">
        <h2 className="text-base font-semibold mb-4">Por empreendimento</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs">
                <th className="py-2 font-medium">Empreendimento</th>
                <th className="py-2 font-medium text-right">Em andamento</th>
                <th className="py-2 font-medium text-right">Concluídos</th>
                <th className="py-2 font-medium text-right">% concluído</th>
              </tr>
            </thead>
            <tbody>
              {data.porEmp.map((e) => {
                const total = e.emAndamento + e.concluidos;
                const pct = total > 0 ? Math.round((e.concluidos / total) * 100) : 0;
                return (
                  <tr
                    key={e.nome}
                    className="border-t"
                    style={{ borderColor: 'var(--gray-lighter)' }}
                  >
                    <td className="py-2 font-medium">{e.nome}</td>
                    <td className="py-2 text-right">{e.emAndamento}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--text-muted)' }}>{e.concluidos}</td>
                    <td className="py-2 text-right font-semibold">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
