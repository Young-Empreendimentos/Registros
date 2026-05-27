'use client';

import { usePathname } from 'next/navigation';
import { SiteBrand } from '@/components/site-brand';
import type { Profile } from '@/types';

const PAGE_TITLES: Record<string, string> = {
  '/registros': 'Registros',
  '/analise': 'Análise',
  '/ativos': 'Em Andamento',
  '/comprovantes': 'Comprovantes',
  '/configuracoes': 'Configurações',
};

const ROLE_LABELS: Record<string, string> = {
  gestor: 'Gestor',
  operador: 'Operador',
  leitor: 'Leitor',
};

interface SiteHeaderProps {
  profile: Profile | null;
  onLogout: () => void;
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/empreendimentos/')) return 'Empreendimento';
  return 'Controle de Registros';
}

export function SiteHeader({ profile, onLogout }: SiteHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="site-main-header">
      <div className="container header-top-content">
        <SiteBrand variant="header" />
        <div className="page-context-title">
          <h1>{title}</h1>
        </div>
        <div className="header-right">
          {profile && (
            <div className="user-info">
              <div className="text-right hidden sm:block">
                <p className="user-name">{profile.nome || profile.email}</p>
                <p className="user-role">{ROLE_LABELS[profile.role] || profile.role}</p>
              </div>
            </div>
          )}
          <button type="button" className="btn-logout" onClick={onLogout}>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
