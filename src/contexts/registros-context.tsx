'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { computarRegistroCompleto } from '@/lib/calculations';
import type { Registro, RegistroCompleto } from '@/types';

interface RegistrosContextValue {
  registros: RegistroCompleto[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateRegistro: (registroId: string, updates: Partial<Registro>) => Promise<void>;
}

const RegistrosContext = createContext<RegistrosContextValue | null>(null);

/** Evita refetch imediato sobrescrever edição recém-salva */
const REFETCH_COOLDOWN_MS = 5000;

export function RegistrosProvider({ children }: { children: ReactNode }) {
  const [registros, setRegistros] = useState<RegistroCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastMutationAt = useRef(0);

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

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastMutationAt.current < REFETCH_COOLDOWN_MS) return;
      fetchRegistros(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchRegistros]);

  const updateRegistro = async (registroId: string, updates: Partial<Registro>) => {
    lastMutationAt.current = Date.now();

    setRegistros((prev) =>
      prev.map((r) => {
        if (r.registro.id !== registroId) return r;
        const registro = { ...r.registro, ...updates };
        return computarRegistroCompleto(
          registro,
          r.lote,
          r.empreendimento,
          r.contrato
        );
      })
    );

    const res = await fetch(`/api/registros/${registroId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      await fetchRegistros(true);
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao salvar registro');
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
