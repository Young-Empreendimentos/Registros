'use client';

import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { contarRegistrosEmAndamento } from '@/lib/analise';
import { RegistrosTable } from '@/components/data-table/registros-table';
import type { RegistroCompleto } from '@/types';

export default function RegistrosPage() {
  const { registros, loading, error, updateRegistro } = useRegistros();
  const { profile } = useProfile();

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

  const handleSendBoleto = async (item: RegistroCompleto, url: string) => {
    if (!url) return;
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'boleto_itbi',
          loteNumero: item.lote.numero,
          clienteNome: item.contrato?.cliente_nome || '',
          empreendimento: item.empreendimento.nome,
          url,
        }),
      });
      if (!response.ok) throw new Error('Falha ao enviar e-mail');
      alert('E-mail com boleto ITBI enviado para Laís!');
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err);
      alert('Erro ao enviar e-mail do boleto ITBI. Tente novamente.');
    }
  };

  const handleSendOP = async (item: RegistroCompleto, url: string) => {
    if (!url) return;
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'op_registro',
          loteNumero: item.lote.numero,
          clienteNome: item.contrato?.cliente_nome || '',
          empreendimento: item.empreendimento.nome,
          url,
        }),
      });
      if (!response.ok) throw new Error('Falha ao enviar e-mail');
      alert('E-mail com OP de registro enviado para Laís!');
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err);
      alert('Erro ao enviar e-mail da OP de registro. Tente novamente.');
    }
  };

  const handleSendMatricula = async (item: RegistroCompleto) => {
    if (!item.registro.matricula_url || !item.contrato?.cliente_email) return;
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'matricula',
          clienteNome: item.contrato.cliente_nome,
          clienteEmail: item.contrato.cliente_email,
          loteNumero: item.lote.numero,
          empreendimento: item.empreendimento.nome,
          url: item.registro.matricula_url,
        }),
      });
      alert('E-mail com matrícula enviado ao cliente!');
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err);
    }
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
    <div className="space-y-6">
      <div>
        <h1>Registros</h1>
        <p className="page-description">
          Controle completo de todos os lotes e registros
        </p>
      </div>

      <div className="quick-cards-grid">
        {[
          { label: 'Total', value: registros.length },
          { label: 'Prop. Young', value: registros.filter((r) => r.etapa === 'Propriedade Young').length },
          { label: 'Vendido', value: registros.filter((r) => r.etapa === 'Vendido').length },
          { label: 'Em Andamento', value: contarRegistrosEmAndamento(registros) },
          { label: 'Concluído', value: registros.filter((r) => r.etapa === 'Concluído').length },
          { label: 'Pendências', value: registros.filter((r) => r.etapa === 'Com pendências').length },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="data-table-shell">
      <RegistrosTable
        registros={registros}
        userRole={profile?.role || 'leitor'}
        onUpdate={handleUpdate}
        onSendBoleto={handleSendBoleto}
        onSendOP={handleSendOP}
        onSendMatricula={handleSendMatricula}
      />
      </div>
    </div>
  );
}
