'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Clock, Check, X } from 'lucide-react';
import type { UserRole } from '@/types';

interface PendingUser {
  id: string;
  nome: string;
  email: string;
  aprovado: boolean;
  auth_provider?: string;
}

/**
 * Banner de solicitações de acesso pendentes, exibido na página principal.
 * Renderiza apenas quando há pendentes; a API /api/usuarios só responde a
 * gestores (403 para os demais → nada é mostrado).
 */
export function PendingApprovalsBanner() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [roles, setRoles] = useState<Record<string, UserRole>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (!res.ok) {
        setPending([]);
        return;
      }
      const data = await res.json();
      const pend = (data.usuarios || []).filter(
        (u: PendingUser) => u.aprovado === false
      );
      setPending(pend);
    } catch {
      setPending([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const aprovar = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, aprovado: true, ativo: true, role: roles[id] || 'leitor' }),
      });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  };

  const recusar = async (id: string) => {
    if (!window.confirm('Recusar e remover esta solicitação de acesso?')) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-amber-600" />
        <h2 className="text-sm font-semibold text-amber-900">
          {pending.length} solicitaç{pending.length > 1 ? 'ões' : 'ão'} de acesso aguardando aprovação
        </h2>
      </div>
      <div className="space-y-2">
        {pending.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-white/70 px-3 py-2"
          >
            <div className="flex-1 min-w-[180px]">
              <p className="text-sm font-medium text-amber-950">{u.nome || 'Sem nome'}</p>
              <p className="text-xs text-amber-700">{u.email}</p>
            </div>
            <Select
              value={roles[u.id] || 'leitor'}
              onValueChange={(v) => setRoles((r) => ({ ...r, [u.id]: v as UserRole }))}
            >
              <SelectTrigger className="w-[130px] h-9 border-amber-300 bg-white text-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leitor">Leitor</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => aprovar(u.id)} disabled={busyId === u.id}>
              <Check className="w-4 h-4" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => recusar(u.id)}
              disabled={busyId === u.id}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Recusar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
