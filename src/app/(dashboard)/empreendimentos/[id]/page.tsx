'use client';

import { useParams } from 'next/navigation';
import { useRegistros } from '@/hooks/use-registros';
import { useProfile } from '@/hooks/use-profile';
import { RegistrosTable } from '@/components/data-table/registros-table';
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

export default function EmpreendimentoPage() {
  const params = useParams();
  const empId = params.id as string;
  const { registros, loading, error, updateRegistro } = useRegistros();
  const { profile } = useProfile();
  const [empNome, setEmpNome] = useState<string>('');

  useEffect(() => {
    if (registros.length > 0) {
      const emp = registros.find((r) => r.empreendimento.id === empId);
      if (emp) setEmpNome(emp.empreendimento.nome);
    }
  }, [registros, empId]);

  const handleUpdate = async (registroId: string, updates: Record<string, unknown>) => {
    await updateRegistro(registroId, updates);
  };

  const empRegistros = registros.filter((r) => r.empreendimento.id === empId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Carregando registros...</p>
        </div>
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

  const activeCount = empRegistros.filter(
    (r) => !['Propriedade Young', 'Vendido', 'Concluído'].includes(r.etapa)
  ).length;

  const concluidos = empRegistros.filter((r) => r.etapa === 'Concluído').length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
          <Link href="/registros" className="hover:text-orange-400 transition-colors">
            Registros
          </Link>
          <span>/</span>
          <span className="text-zinc-300">{empNome || 'Empreendimento'}</span>
        </div>
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">{empNome || 'Empreendimento'}</h1>
            <p className="text-zinc-500 text-sm">
              {empRegistros.length} lote(s) total — {activeCount} em andamento — {concluidos} concluído(s)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Lotes', value: empRegistros.length, color: 'text-white' },
          { label: 'Em Andamento', value: activeCount, color: 'text-orange-400' },
          { label: 'Concluídos', value: concluidos, color: 'text-emerald-400' },
          { label: 'Pendências', value: empRegistros.filter((r) => r.etapa === 'Com pendências').length, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <RegistrosTable
        registros={empRegistros}
        userRole={profile?.role || 'leitor'}
        onUpdate={handleUpdate}
        showObservacoes={true}
      />
    </div>
  );
}
