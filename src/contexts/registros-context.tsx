'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { T } from '@/lib/supabase/tables';
import type { Registro, RegistroCompleto } from '@/types';

interface RegistrosContextValue {
  registros: RegistroCompleto[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateRegistro: (registroId: string, updates: Partial<Registro>) => Promise<void>;
}

const RegistrosContext = createContext<RegistrosContextValue | null>(null);

export function RegistrosProvider({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<RegistroCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRegistros = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch('/api/registros');
      if (!res.ok) throw new Error('Erro ao carregar registros');
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
    setRegistros((prev) =>
      prev.map((r) =>
        r.registro.id === registroId
          ? { ...r, registro: { ...r.registro, ...updates } }
          : r
      )
    );

    const { error: updateError } = await supabase
      .from(T.registros)
      .update(updates)
      .eq('id', registroId);

    if (updateError) {
      await fetchRegistros(true);
      throw updateError;
    }
  };

  return (
    <RegistrosContext.Provider
      value={{
        registros,
        loading,
        error,
        refetch: () => fetchRegistros(true),
        updateRegistro,
      }}
    >
      {children}
    </RegistrosContext.Provider>
  );
}

export function useRegistros() {
  const ctx = useContext(RegistrosContext);
  if (!ctx) {
    throw new Error('useRegistros deve ser usado dentro de RegistrosProvider');
  }
  return ctx;
}
