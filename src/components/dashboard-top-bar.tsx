'use client';

import { usePathname } from 'next/navigation';
import type { Profile } from '@/types';

const PAGE_TITLES: Record<string, string> = {
  '/registros': 'Registros',
  '/analise': 'Análise',
  '/ativos': 'Em Andamento',
  '/comprovantes': 'Comprovantes',
  '/configuracoes': 'Configurações',
  '/ajuda': 'Ajuda',
};

const ROLE_LABELS: Record<string, string> = {
  gestor: 'Gestor',
  operador: 'Operador',
  leitor: 'Leitor',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/empreendimentos/')) return 'Empreendimento';
  return 'Controle de Registros';
}

interface DashboardTopBarProps {
  profile: Profile | null;
}

export function DashboardTopBar({ profile }: DashboardTopBarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="dashboard-top-bar">
      <h1>{title}</h1>
      {profile && (
        <div className="dashboard-top-bar__user">
          <strong>{profile.nome || profile.email}</strong>
          <span>{ROLE_LABELS[profile.role] || profile.role}</span>
        </div>
      )}
    </header>
  );
}
