'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
} from '@/components/ui/dialog';
import {
  Settings,
  Users,
  UserPlus,
  Shield,
  RefreshCw,
  Pencil,
  Trash2,
  KeyRound,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { UserRole } from '@/types';

interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
}

interface SyncLog {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  registros_atualizados: number;
  detalhes: {
    enterprises_count?: number;
    units_count?: number;
    contracts_count?: number;
    active_contracts?: number;
    income_count?: number;
    valores_atualizados?: number;
    new_registros?: number;
    error?: string;
    contracts_error?: string;
    income_error?: string;
  } | null;
}

const roleLabels: Record<UserRole, string> = {
  gestor: 'Gestor',
  operador: 'Operador',
  leitor: 'Leitor',
};

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  gestor: 'default',
  operador: 'secondary',
  leitor: 'outline',
};

const rolePermissions: Record<UserRole, string[]> = {
  gestor: [
    'Acesso total ao sistema',
    'Gerenciar usuários',
    'Editar todos os campos',
    'Forçar/alterar etapas',
    'Sincronizar com SIENGE',
  ],
  operador: [
    'Visualizar e filtrar dados',
    'Preencher campos manuais',
    'Adicionar comprovantes',
  ],
  leitor: [
    'Apenas visualizar e filtrar dados',
  ],
};

export default function ConfiguracoesPage() {
  const [users, setUsers] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPercent, setSyncPercent] = useState(0);
  const [syncStep, setSyncStep] = useState('');
  const [syncDetail, setSyncDetail] = useState('');
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addNome, setAddNome] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('leitor');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [editUser, setEditUser] = useState<UsuarioRow | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('leitor');
  const [editAtivo, setEditAtivo] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [deleteUser, setDeleteUser] = useState<UsuarioRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { profile } = useProfile();
  const isGestor = profile?.role === 'gestor';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.usuarios || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/sync-logs');
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isGestor) {
      fetchUsers();
      fetchSyncLogs();
    }
  }, [fetchUsers, fetchSyncLogs, isGestor]);

  const handleAdd = async () => {
    setAddError('');
    setAddLoading(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: addNome,
          email: addEmail,
          password: addPassword,
          role: addRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Erro ao criar usuário');
        return;
      }
      setAddOpen(false);
      resetAddForm();
      fetchUsers();
    } catch {
      setAddError('Erro de conexão');
    } finally {
      setAddLoading(false);
    }
  };

  const resetAddForm = () => {
    setAddNome('');
    setAddEmail('');
    setAddPassword('');
    setAddRole('leitor');
    setAddError('');
  };

  const openEdit = (user: UsuarioRow) => {
    setEditUser(user);
    setEditNome(user.nome);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditAtivo(user.ativo);
    setEditPassword('');
    setEditError('');
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditError('');
    setEditLoading(true);
    try {
      const body: Record<string, unknown> = {
        id: editUser.id,
        nome: editNome,
        email: editEmail,
        role: editRole,
        ativo: editAtivo,
      };
      if (editPassword) body.password = editPassword;

      const res = await fetch('/api/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Erro ao atualizar');
        return;
      }
      setEditUser(null);
      fetchUsers();
    } catch {
      setEditError('Erro de conexão');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await fetch('/api/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteUser.id }),
      });
      setDeleteUser(null);
      fetchUsers();
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncPercent(0);
    setSyncStep('');
    setSyncDetail('Iniciando...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'young-sync-secret-2026' }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setSyncResult('Erro ao iniciar sincronização');
        setSyncing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/m);
          if (!match) continue;
          try {
            const event = JSON.parse(match[1]);
            if (event.percent >= 0) setSyncPercent(event.percent);
            if (event.step) setSyncStep(event.step);
            if (event.detail) setSyncDetail(event.detail);
            if (event.step === 'done') {
              setSyncResult(event.detail);
            }
            if (event.step === 'erro') {
              setSyncResult(event.detail);
            }
          } catch {
            // parse error
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setSyncResult('Erro de conexão durante sincronização');
      }
    } finally {
      setSyncing(false);
      abortRef.current = null;
      fetchSyncLogs();
    }
  };

  if (!isGestor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400">Acesso restrito a gestores</p>
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
          A sincronização automática roda diariamente às 02h. Use o botão abaixo para sincronizar manualmente.
        </p>

        {syncing && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{syncDetail}</span>
              <span className="text-orange-400 font-mono text-xs">{syncPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(syncPercent, 1)}%` }}
              />
            </div>
            <p className="text-zinc-600 text-xs capitalize">{syncStep}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button onClick={() => { handleManualSync(); }} disabled={syncing}>
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
          {!syncing && syncResult && (
            <span className={`text-sm ${syncResult.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
              {syncResult}
            </span>
          )}
        </div>
      </div>

      {/* Sync History Section */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-500" />
          Histórico de Sincronizações
        </h2>

        {logsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : syncLogs.length === 0 ? (
          <p className="text-zinc-500 text-sm">Nenhuma sincronização registrada.</p>
        ) : (
          <div className="space-y-2">
            {syncLogs.map((log) => {
              const isExpanded = expandedLog === log.id;
              const startDate = new Date(log.started_at);
              const endDate = log.finished_at ? new Date(log.finished_at) : null;
              const duration = endDate 
                ? Math.round((endDate.getTime() - startDate.getTime()) / 1000)
                : null;

              return (
                <div
                  key={log.id}
                  className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                      {log.status === 'error' && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      {log.status === 'running' && (
                        <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
                      )}
                      <div className="text-left">
                        <p className="text-sm text-white">
                          {startDate.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {log.status === 'success' && `${log.registros_atualizados} registros • ${duration}s`}
                          {log.status === 'error' && 'Falhou'}
                          {log.status === 'running' && 'Em andamento...'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.status === 'success' && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          Sucesso
                        </Badge>
                      )}
                      {log.status === 'error' && (
                        <Badge variant="secondary" className="bg-red-500/10 text-red-400 border-red-500/20">
                          Erro
                        </Badge>
                      )}
                      {log.status === 'running' && (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                          Executando
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                  </button>

                  {isExpanded && log.detalhes && (
                    <div className="px-4 pb-4 border-t border-zinc-700/50">
                      <div className="pt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {log.detalhes.enterprises_count !== undefined && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500">Empreendimentos</p>
                            <p className="text-lg font-semibold text-white">{log.detalhes.enterprises_count}</p>
                          </div>
                        )}
                        {log.detalhes.units_count !== undefined && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500">Unidades</p>
                            <p className="text-lg font-semibold text-white">{log.detalhes.units_count}</p>
                          </div>
                        )}
                        {log.detalhes.contracts_count !== undefined && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500">Contratos SIENGE</p>
                            <p className="text-lg font-semibold text-white">{log.detalhes.contracts_count}</p>
                          </div>
                        )}
                        {log.detalhes.active_contracts !== undefined && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500">Contratos Ativos</p>
                            <p className="text-lg font-semibold text-white">{log.detalhes.active_contracts}</p>
                          </div>
                        )}
                        {log.detalhes.income_count !== undefined && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500">Recebimentos</p>
                            <p className="text-lg font-semibold text-white">{log.detalhes.income_count}</p>
                          </div>
                        )}
                        {log.detalhes.valores_atualizados !== undefined && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500">Valores Atualizados</p>
                            <p className="text-lg font-semibold text-emerald-400">{log.detalhes.valores_atualizados}</p>
                          </div>
                        )}
                        {log.detalhes.new_registros !== undefined && log.detalhes.new_registros > 0 && (
                          <div className="bg-zinc-900/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500">Novos Registros</p>
                            <p className="text-lg font-semibold text-white">{log.detalhes.new_registros}</p>
                          </div>
                        )}
                      </div>

                      {(log.detalhes.error || log.detalhes.contracts_error || log.detalhes.income_error) && (
                        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-red-400">
                              {log.detalhes.error && <p>{log.detalhes.error}</p>}
                              {log.detalhes.contracts_error && <p>Contratos: {log.detalhes.contracts_error}</p>}
                              {log.detalhes.income_error && <p>Recebimentos: {log.detalhes.income_error}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Users Section */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Usuários ({users.length})
          </h2>
          <Button onClick={() => { resetAddForm(); setAddOpen(true); }}>
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Status</span>
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
                className="grid grid-cols-5 gap-4 px-4 py-3 rounded-lg hover:bg-zinc-800/50 items-center transition-colors"
              >
                <span className="text-white text-sm truncate">{user.nome || 'Sem nome'}</span>
                <span className="text-zinc-400 text-sm truncate">{user.email}</span>
                <span>
                  <Badge variant={roleBadgeVariant[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                </span>
                <span>
                  {user.ativo ? (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-zinc-500">
                      Inativo
                    </Badge>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(user)}
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {user.id !== profile?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-red-400"
                      onClick={() => setDeleteUser(user)}
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </span>
              </div>
            ))
          )}

          {!loading && users.length === 0 && (
            <div className="text-center py-8 text-zinc-600">
              Nenhum usuário cadastrado
            </div>
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie uma conta para um novo membro da equipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {addError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="text-red-400 text-sm">{addError}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={addNome}
                onChange={(e) => setAddNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="leitor">Leitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-2">Permissões:</p>
              <ul className="text-xs text-zinc-400 space-y-1">
                {rolePermissions[addRole].map((perm) => (
                  <li key={perm}>- {perm}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addNome || !addEmail || !addPassword || addLoading}
            >
              {addLoading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="text-red-400 text-sm">{editError}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="leitor">Leitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={editAtivo} onCheckedChange={setEditAtivo} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5" />
                Nova Senha (opcional)
              </Label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Deixe vazio para manter a senha atual"
              />
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-2">Permissões:</p>
              <ul className="text-xs text-zinc-400 space-y-1">
                {rolePermissions[editRole].map((perm) => (
                  <li key={perm}>- {perm}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={editLoading}>
              {editLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.nome}</strong> ({deleteUser?.email})?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
