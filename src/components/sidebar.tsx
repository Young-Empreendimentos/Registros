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
import { useSidebar } from '@/contexts/sidebar-context';

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

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 shadow-sm',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo Header - Estilo escuro como no exemplo */}
        <div className="bg-gradient-to-r from-[#0D0D0D] to-[#323232] px-4 py-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" className="shrink-0" />
            {!collapsed && (
              <div className="overflow-hidden">
                <h2 className="text-base font-bold text-white truncate">
                  Young<span className="text-[#FE5009]">.</span>
                </h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider truncate">Controle de Registros</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#FE5009] text-white shadow-md shadow-orange-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
            <div className="pt-3 mt-3 border-t border-gray-200">
              <button
                onClick={() => setEmpExpanded(!empExpanded)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
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
                          'flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg text-[13px] transition-all duration-200',
                          isEmpActive
                            ? 'bg-[#FFF0EB] text-[#FE5009] font-medium'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        )}
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
                  className="flex items-center justify-center px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200"
                >
                  <Building2 className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Empreendimentos</TooltipContent>
            </Tooltip>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          {!collapsed && profile && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.nome || profile.email}</p>
              <p className="text-[11px] text-gray-500">{roleLabel[profile.role] || profile.role}</p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
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
          onClick={toggle}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-[#FE5009] hover:border-[#FE5009] shadow-sm transition-all duration-200"
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
