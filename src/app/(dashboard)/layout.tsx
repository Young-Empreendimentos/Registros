'use client';

import { Sidebar } from '@/components/sidebar';
import { DashboardTopBar } from '@/components/dashboard-top-bar';
import { ProfileProvider, useProfile } from '@/contexts/profile-context';
import { RegistrosProvider } from '@/contexts/registros-context';
import { ComprovantesProvider } from '@/contexts/comprovantes-context';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';
import { YoungLoaderMark } from '@/components/young-loader-mark';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();
  const { collapsed } = useSidebar();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-body)' }}
      >
        <YoungLoaderMark />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-body)' }}>
      <Sidebar profile={profile} />
      <div
        className={cn(
          'flex flex-col flex-1 min-h-screen transition-[margin] duration-200',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <DashboardTopBar profile={profile} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
      <RegistrosProvider>
        <ComprovantesProvider>
          <SidebarProvider>
            <DashboardShell>{children}</DashboardShell>
          </SidebarProvider>
        </ComprovantesProvider>
      </RegistrosProvider>
    </ProfileProvider>
  );
}
