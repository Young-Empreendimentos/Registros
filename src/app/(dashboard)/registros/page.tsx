'use client';

import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { useEmailHandlers } from '@/hooks/use-email-handlers';
import { RegistrosGrouped } from '@/components/data-table/registros-grouped';
import { PendingApprovalsBanner } from '@/components/pending-approvals-banner';

export default function RegistrosPage() {
  const { registros, loading, error, updateRegistro } = useRegistros();
  const { profile } = useProfile();
  const { handleSendBoleto, handleSendOP, handleSendMatricula } = useEmailHandlers();

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

  if (loading && registros.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Carregando registros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center alert alert-danger">
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2">Verifique se o banco de dados foi configurado corretamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profile?.role === 'gestor' && <PendingApprovalsBanner />}

      <RegistrosGrouped
        registros={registros}
        userRole={profile?.role || 'leitor'}
        onUpdate={handleUpdate}
        onSendBoleto={handleSendBoleto}
        onSendOP={handleSendOP}
        onSendMatricula={handleSendMatricula}
      />
    </div>
  );
}
