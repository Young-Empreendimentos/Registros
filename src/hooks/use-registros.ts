'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Registro, RegistroCompleto } from '@/types';

export function useRegistros() {
  const [registros, setRegistros] = useState<RegistroCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/registros');
      if (!res.ok) {
        throw new Error('Erro ao carregar registros');
      }
      const data = await res.json();
      setRegistros(data.registros || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  }, []);

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
