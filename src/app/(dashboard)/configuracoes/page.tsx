'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings, Users, UserPlus, Shield, RefreshCw } from 'lucide-react';
import type { Profile, UserRole } from '@/types';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  direcao: 'Direção',
  operador: 'Operador',
  leitura: 'Leitura',
};

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'warning' | 'outline'> = {
  admin: 'default',
  direcao: 'warning',
  operador: 'secondary',
  leitura: 'outline',
};

export default function ConfiguracoesPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('leitura');

  const supabase = createClient();
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateRole = async () => {
    if (!editUser) return;
    await supabase
      .from('profiles')
      .update({ role: editRole })
      .eq('id', editUser.id);
    setEditUser(null);
    fetchUsers();
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'young-sync-secret-2026' }),
      });
      const data = await res.json();
      setSyncResult(data.message || 'Sincronização concluída');
    } catch {
      setSyncResult('Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <p className="text-zinc-500 text-sm">Gerenciamento do sistema</p>
        </div>
      </div>

      {/* Sync Section */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-orange-500" />
          Sincronização SIENGE
        </h2>
        <p className="text-zinc-400 text-sm mb-4">
          A sincronização automática roda diariamente às 02h da manhã. Use o botão abaixo para sincronizar manualmente.
        </p>
        <div className="flex items-center gap-4">
          <Button onClick={handleManualSync} disabled={syncing}>
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sincronizar Agora
              </>
            )}
          </Button>
          {syncResult && (
            <span className="text-sm text-zinc-400">{syncResult}</span>
          )}
        </div>
      </div>

      {/* Users Section */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Usuários ({users.length})
          </h2>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-4 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Ações</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-4 gap-4 px-4 py-3 rounded-lg hover:bg-zinc-800/50 items-center transition-colors"
              >
                <span className="text-white text-sm">{user.nome || 'Sem nome'}</span>
                <span className="text-zinc-400 text-sm truncate">{user.email}</span>
                <span>
                  <Badge variant={roleBadgeVariant[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                </span>
                <span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditUser(user);
                          setEditRole(user.role);
                        }}
                      >
                        Editar
                      </Button>
                    </DialogTrigger>
                    {editUser?.id === user.id && (
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Perfil de Usuário</DialogTitle>
                          <DialogDescription>
                            {editUser.nome || editUser.email}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Perfil de Acesso</Label>
                            <Select
                              value={editRole}
                              onValueChange={(v) => setEditRole(v as UserRole)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrador</SelectItem>
                                <SelectItem value="direcao">Direção</SelectItem>
                                <SelectItem value="operador">Operador</SelectItem>
                                <SelectItem value="leitura">Leitura</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="bg-zinc-800/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 mb-2">Permissões:</p>
                            <ul className="text-xs text-zinc-400 space-y-1">
                              {editRole === 'admin' && <li>- Acesso total ao sistema</li>}
                              {editRole === 'direcao' && (
                                <>
                                  <li>- Visualizar e filtrar dados</li>
                                  <li>- Preencher campos manuais</li>
                                  <li>- Editar/forçar etapas</li>
                                </>
                              )}
                              {editRole === 'operador' && (
                                <>
                                  <li>- Visualizar e filtrar dados</li>
                                  <li>- Preencher campos manuais</li>
                                </>
                              )}
                              {editRole === 'leitura' && (
                                <li>- Apenas visualizar e filtrar dados</li>
                              )}
                            </ul>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditUser(null)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleUpdateRole}>Salvar</Button>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
