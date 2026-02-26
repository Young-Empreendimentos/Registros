'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { Logo } from '@/components/logo';

const navItems = [
  { href: '/registros', icon: FileText, label: 'Registros' },
  { href: '/analise', icon: BarChart3, label: 'Análise' },
  { href: '/ativos', icon: Activity, label: 'Em Andamento' },
  { href: '/comprovantes', icon: FileCheck, label: 'Comprovantes' },
  { href: '/configuracoes', icon: Settings, label: 'Configurações', gestorOnly: true },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800 flex flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <Logo size="sm" className="shrink-0" />
          {!collapsed && (
            <div className="overflow-hidden">
              <h2 className="text-sm font-semibold text-white truncate">Young</h2>
              <p className="text-[10px] text-zinc-500 truncate">Controle de Registros</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-orange-600/15 text-orange-400 border border-orange-600/20'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                )}
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

          {/* Empreendimentos section */}
          {!collapsed && empreendimentos.length > 0 && (
            <div className="pt-2 mt-2 border-t border-zinc-800/50">
              <button
                onClick={() => setEmpExpanded(!empExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empreendimentos
                </span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', empExpanded && 'rotate-180')} />
              </button>
              {empExpanded && (
                <div className="space-y-0.5 mt-1">
                  {empreendimentos.map((emp) => {
                    const isEmpActive = pathname === `/empreendimentos/${emp.id}`;
                    return (
                      <Link
                        key={emp.id}
                        href={`/empreendimentos/${emp.id}`}
                        className={cn(
                          'flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-md text-[13px] transition-all duration-200',
                          isEmpActive
                            ? 'bg-orange-600/10 text-orange-400'
                            : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-50" />
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
                  className="flex items-center justify-center px-3 py-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all duration-200"
                >
                  <Building2 className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Empreendimentos</TooltipContent>
            </Tooltip>
          )}
        </nav>

        {/* User section */}
        <div className="p-2 border-t border-zinc-800">
          {!collapsed && profile && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm text-white truncate">{profile.nome || profile.email}</p>
              <p className="text-[10px] text-zinc-500">{roleLabel[profile.role] || profile.role}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sair</TooltipContent>}
          </Tooltip>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all duration-200"
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
