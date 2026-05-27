'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SiteBrand } from '@/components/site-brand';
import {
  FileText,
  Activity,
  FileCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import type { Profile, Empreendimento } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebar } from '@/contexts/sidebar-context';

const navItems = [
  { href: '/registros', icon: FileText, label: 'Registros' },
  { href: '/analise', icon: BarChart3, label: 'Análise' },
  { href: '/ativos', icon: Activity, label: 'Em Andamento' },
  { href: '/comprovantes', icon: FileCheck, label: 'Comprovantes' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações', gestorOnly: true },
  { href: '/ajuda', icon: HelpCircle, label: 'Ajuda' },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [empExpanded, setEmpExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/empreendimentos')
      .then((res) => res.json())
      .then((data) => setEmpreendimentos(data.empreendimentos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/empreendimentos/')) {
      setEmpExpanded(true);
    }
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.gestorOnly && profile?.role !== 'gestor') return false;
    return true;
  });

  const roleLabel: Record<string, string> = {
    gestor: 'Gestor',
    operador: 'Operador',
    leitor: 'Leitor',
  };

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200',
      active
        ? 'text-white shadow-sm'
        : 'hover:bg-[var(--bg-hover)]'
    );

  const linkStyle = (active: boolean): React.CSSProperties =>
    active
      ? { background: 'var(--primary)' }
      : { color: 'var(--text-muted)' };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 border-r',
          collapsed ? 'w-16' : 'w-64'
        )}
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--gray-lighter)',
        }}
      >
        <div
          className="px-4 py-4 shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--black) 0%, var(--gray-dark) 100%)',
          }}
        >
          <SiteBrand
            variant="sidebar"
            href="/registros"
            showText={!collapsed}
          />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={linkClass(isActive)}
                style={linkStyle(isActive)}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}

          {!collapsed && empreendimentos.length > 0 && (
            <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--gray-lighter)' }}>
              <button
                type="button"
                onClick={() => setEmpExpanded(!empExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empreendimentos
                </span>
                <ChevronDown
                  className={cn('w-3.5 h-3.5 transition-transform', empExpanded && 'rotate-180')}
                />
              </button>
              {empExpanded && (
                <div className="space-y-0.5 mt-1">
                  {empreendimentos.map((emp) => {
                    const isEmpActive = pathname === `/empreendimentos/${emp.id}`;
                    return (
                      <Link
                        key={emp.id}
                        href={`/empreendimentos/${emp.id}`}
                        prefetch
                        className={cn(
                          'flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-[13px] transition-all duration-200',
                          isEmpActive && 'font-medium'
                        )}
                        style={
                          isEmpActive
                            ? { background: 'var(--primary-light)', color: 'var(--primary)' }
                            : { color: 'var(--text-muted)' }
                        }
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
                        <span className="truncate">{emp.nome}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {collapsed && empreendimentos.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/registros"
                  prefetch
                  className="flex items-center justify-center px-3 py-2.5 rounded-[var(--radius-sm)] transition-all"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Building2 className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Empreendimentos</TooltipContent>
            </Tooltip>
          )}
        </nav>

        <div
          className="p-3 border-t shrink-0"
          style={{ borderColor: 'var(--gray-lighter)', background: 'var(--bg-subtle)' }}
        >
          {!collapsed && profile && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>
                {profile.nome || profile.email}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {roleLabel[profile.role] || profile.role}
              </p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-sm)] text-sm transition-all duration-200 hover:bg-red-50 hover:text-red-600"
                style={{ color: 'var(--text-muted)' }}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sair</TooltipContent>}
          </Tooltip>
        </div>

        <button
          type="button"
          onClick={toggle}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 border"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--gray-lighter)',
            color: 'var(--text-muted)',
          }}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
