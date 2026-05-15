'use client';

import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { RegistrosTable } from '@/components/data-table/registros-table';
import type { RegistroCompleto } from '@/types';

export default function RegistrosPage() {
  const { registros, loading, error, updateRegistro } = useRegistros();
  const { profile } = useProfile();

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

  const handleSendBoleto = async (item: RegistroCompleto) => {
    if (!item.registro.boleto_itbi_url) return;
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'boleto_itbi',
          loteNumero: item.lote.numero,
          clienteNome: item.contrato?.cliente_nome || '',
          empreendimento: item.empreendimento.nome,
          url: item.registro.boleto_itbi_url,
        }),
      });
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err);
    }
  };

  const handleSendOP = async (item: RegistroCompleto) => {
    if (!item.registro.op_registro_url) return;
    try {
      await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'op_registro',
          loteNumero: item.lote.numero,
          clienteNome: item.contrato?.cliente_nome || '',
          empreendimento: item.empreendimento.nome,
          url: item.registro.op_registro_url,
        }),
      });
    } catch (err) {
      console.error('Erro ao enviar e-mail:', err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#FE5009] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando registros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-2">Verifique se o banco de dados foi configurado corretamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros</h1>
          <p className="text-gray-500 text-sm">
            Controle completo de todos os lotes e registros
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: registros.length, color: 'text-gray-900', borderColor: 'border-l-[#FE5009]' },
          { label: 'Prop. Young', value: registros.filter((r) => r.etapa === 'Propriedade Young').length, color: 'text-gray-600', borderColor: 'border-l-gray-400' },
          { label: 'Vendido', value: registros.filter((r) => r.etapa === 'Vendido').length, color: 'text-blue-600', borderColor: 'border-l-blue-500' },
          { label: 'Em Andamento', value: registros.filter((r) => !['Propriedade Young', 'Vendido', 'Concluído'].includes(r.etapa)).length, color: 'text-[#FE5009]', borderColor: 'border-l-[#FE5009]' },
          { label: 'Concluído', value: registros.filter((r) => r.etapa === 'Concluído').length, color: 'text-emerald-600', borderColor: 'border-l-emerald-500' },
          { label: 'Pendências', value: registros.filter((r) => r.etapa === 'Com pendências').length, color: 'text-red-600', borderColor: 'border-l-red-500' },
        ].map(({ label, value, color, borderColor }) => (
          <div
            key={label}
            className={`bg-white border border-gray-200 ${borderColor} border-l-4 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow`}
          >
            <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <RegistrosTable
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
