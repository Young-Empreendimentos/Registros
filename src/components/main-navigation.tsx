'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile, Empreendimento } from '@/types';

const NAV_ITEMS = [
  { href: '/registros', label: 'Registros' },
  { href: '/analise', label: 'Análise' },
  { href: '/ativos', label: 'Em Andamento' },
  { href: '/comprovantes', label: 'Comprovantes' },
  { href: '/configuracoes', label: 'Configurações', gestorOnly: true },
];

interface MainNavigationProps {
  profile: Profile | null;
}

export function MainNavigation({ profile }: MainNavigationProps) {
  const pathname = usePathname();
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    fetch('/api/empreendimentos')
      .then((res) => res.json())
      .then((data) => setEmpreendimentos(data.empreendimentos || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (item.gestorOnly && profile?.role !== 'gestor') return false;
    return true;
  });

  return (
    <nav className="main-navigation" aria-label="Menu principal">
      <div className="container">
        <ul className="main-nav-list">
          {filteredNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={pathname === item.href ? 'active' : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}

          {empreendimentos.length > 0 && (
            <li
              ref={dropdownRef}
              className={cn('nav-dropdown', dropdownOpen && 'open')}
            >
              <button
                type="button"
                className="nav-dropdown-btn"
                onClick={() => setDropdownOpen((o) => !o)}
                aria-expanded={dropdownOpen}
              >
                Empreendimentos
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', dropdownOpen && 'rotate-180')} />
              </button>
              <div className="nav-dropdown-content">
                {empreendimentos.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/empreendimentos/${emp.id}`}
                    className={pathname === `/empreendimentos/${emp.id}` ? 'active' : undefined}
                    onClick={() => setDropdownOpen(false)}
                  >
                    {emp.nome}
                  </Link>
                ))}
              </div>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
