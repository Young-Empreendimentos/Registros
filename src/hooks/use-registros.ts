'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computarRegistroCompleto } from '@/lib/calculations';
import type { Empreendimento, Lote, Contrato, Registro, RegistroCompleto } from '@/types';

export function useRegistros() {
  const [registros, setRegistros] = useState<RegistroCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: empreendimentos },
        { data: lotes },
        { data: contratos },
        { data: registrosData },
      ] = await Promise.all([
        supabase.from('empreendimentos').select('*'),
        supabase.from('lotes').select('*'),
        supabase.from('contratos').select('*').eq('ativo', true),
        supabase.from('registros').select('*'),
      ]);

      if (!empreendimentos || !lotes || !registrosData) {
        setRegistros([]);
        setLoading(false);
        return;
      }

      const empMap = new Map<string, Empreendimento>();
      (empreendimentos as Empreendimento[]).forEach((e) => empMap.set(e.id, e));

      const contratoByLote = new Map<string, Contrato>();
      (contratos as Contrato[] || []).forEach((c) => {
        if (c.ativo) contratoByLote.set(c.lote_id, c);
      });

      const loteMap = new Map<string, Lote>();
      (lotes as Lote[]).forEach((l) => loteMap.set(l.id, l));

      const computed = (registrosData as Registro[]).map((registro) => {
        const lote = loteMap.get(registro.lote_id);
        if (!lote) return null;
        const emp = empMap.get(lote.empreendimento_id);
        if (!emp) return null;
        const contrato = contratoByLote.get(lote.id) || null;

        return computarRegistroCompleto(registro, lote, emp, contrato);
      }).filter(Boolean) as RegistroCompleto[];

      setRegistros(computed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const updateRegistro = async (registroId: string, updates: Partial<Registro>) => {
    const { error: updateError } = await supabase
      .from('registros')
      .update(updates)
      .eq('id', registroId);

    if (updateError) throw updateError;

    await fetchRegistros();
  };

  return { registros, loading, error, refetch: fetchRegistros, updateRegistro };
}
