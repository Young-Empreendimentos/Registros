'use client';

import { useMemo } from 'react';
import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { RegistrosExpandable } from '@/components/data-table/registros-expandable';
import { filtrarRegistrosEmAndamento } from '@/lib/analise';

export default function AtivosPage() {
  const { registros, loading, error, updateRegistro } = useRegistros();
  const { profile } = useProfile();

  const emAndamento = useMemo(
    () => filtrarRegistrosEmAndamento(registros),
    [registros]
  );

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

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
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {emAndamento.length} registro(s) em andamento · clique numa linha para ver e editar os detalhes
      </p>

      <RegistrosExpandable
        registros={emAndamento}
        userRole={profile?.role || 'leitor'}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
