'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SiteBrand } from '@/components/site-brand';
import { YoungLoaderMark } from '@/components/young-loader-mark';
import { LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
          </form>
        )}
      </div>
    </div>
  );
}
