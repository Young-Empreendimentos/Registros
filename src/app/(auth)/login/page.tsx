'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteBrand } from '@/components/site-brand';
import { YoungLoaderMark } from '@/components/young-loader-mark';
import { LogIn, UserPlus } from 'lucide-react';

const GOOGLE_MESSAGES: Record<string, { text: string; type: 'info' | 'danger' }> = {
  'status:solicitado': {
    text: 'Solicitação enviada! Um gestor precisa aprovar seu acesso. Você será avisado por e-mail.',
    type: 'info',
  },
  'status:pendente': {
    text: 'Seu acesso ainda está aguardando aprovação de um gestor.',
    type: 'info',
  },
  'erro:dominio': {
    text: 'Use um e-mail @youngempreendimentos.com.br para entrar com o Google.',
    type: 'danger',
  },
  'erro:desativado': {
    text: 'Seu acesso está desativado. Fale com um gestor.',
    type: 'danger',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'info' | 'danger' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [setupNome, setSetupNome] = useState('');
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    fetch('/api/auth/setup')
      .then((res) => res.json())
      .then((data) => {
        setIsSetup(data.needsSetup);
        setCheckingSetup(false);
      })
      .catch(() => setCheckingSetup(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const erro = params.get('erro');
    const key = status ? `status:${status}` : erro ? `erro:${erro}` : null;
    if (key) {
      setNotice(
        GOOGLE_MESSAGES[key] ?? {
          text: 'Não foi possível entrar com o Google. Tente novamente.',
          type: 'danger',
        }
      );
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login');
        return;
      }
      router.push('/registros');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: setupNome, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        return;
      }
      router.push('/registros');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="login-page">
        <YoungLoaderMark />
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-page__brand">
        <SiteBrand variant="login" href={undefined} />
      </div>

      <div className="login-card">
        <div className="login-header">
          <h1>Controle de Registros</h1>
          <p>Acesso ao sistema</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {notice && (
          <div className={notice.type === 'danger' ? 'alert alert-danger' : 'alert alert-info'}>
            {notice.text}
          </div>
        )}

        {isSetup ? (
          <form onSubmit={handleSetup} className="space-y-4" data-no-loader>
            <p className="text-center text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Crie a conta de administrador para começar.
            </p>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={setupNome}
                onChange={(e) => setSetupNome(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              <UserPlus className="w-5 h-5" />
              {loading ? 'Criando...' : 'Criar Conta Admin'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4" data-no-loader>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              <LogIn className="w-5 h-5" />
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="login-divider"><span>ou</span></div>

            <a href="/api/auth/google" className="btn-google" data-no-loader>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
              </svg>
              Entrar com Google
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
