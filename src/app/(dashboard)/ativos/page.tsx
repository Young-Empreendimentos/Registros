'use client';

import { useMemo } from 'react';
import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { RegistrosTable } from '@/components/data-table/registros-table';
import { Activity } from 'lucide-react';
import {
  contarRegistrosEmAndamento,
  filtrarRegistrosEmAndamento,
} from '@/lib/analise';

export default function AtivosPage() {
  const { registros, loading, error, updateRegistro } = useRegistros();
  const { profile } = useProfile();

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

  if (loading && registros.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
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

  const emAndamento = useMemo(
    () => filtrarRegistrosEmAndamento(registros),
    [registros]
  );
  const activeCount = contarRegistrosEmAndamento(registros);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-orange-950">Em Andamento</h1>
          <p className="text-orange-700 text-sm">
            {activeCount} registro(s) em processo de conclusão
          </p>
        </div>
      </div>

      <RegistrosTable
        registros={emAndamento}
        userRole={profile?.role || 'leitor'}
        onUpdate={handleUpdate}
        showObservacoes={true}
        disablePagination
      />
    </div>
  );
}
