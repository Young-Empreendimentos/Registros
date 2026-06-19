'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface ComprovanteRow {
  id: string;
  url: string;
  descricao: string | null;
  created_at: string;
  lote_id: number;
  registro_id: string;
  uploaded_by: string;
  lote_numero?: string;
  empreendimento_nome?: string;
}

export interface LoteOption {
  id: number;
  numero: string;
  empreendimento: string;
  registro_id: string;
}

interface ComprovantesContextValue {
  comprovantes: ComprovanteRow[];
  lotes: LoteOption[];
  loading: boolean;
  refetch: () => Promise<void>;
}

const ComprovantesContext = createContext<ComprovantesContextValue | null>(null);

export function ComprovantesProvider({ children }: { children: ReactNode }) {
  const [comprovantes, setComprovantes] = useState<ComprovanteRow[]>([]);
  const [lotes, setLotes] = useState<LoteOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await fetch('/api/comprovantes');
      if (!res.ok) throw new Error('Erro ao carregar comprovantes');
      const data = await res.json();
      setComprovantes(data.comprovantes || []);
      setLotes(data.lotes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <ComprovantesContext.Provider
      value={{
        comprovantes,
        lotes,
        loading,
        refetch: () => fetchData(true),
      }}
    >
      {children}
    </ComprovantesContext.Provider>
  );
}

export function useComprovantes() {
  const ctx = useContext(ComprovantesContext);
  if (!ctx) {
    throw new Error('useComprovantes deve ser usado dentro de ComprovantesProvider');
  }
  return ctx;
}
