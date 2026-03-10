'use client';

import { Sidebar } from '@/components/sidebar';
import { useProfile } from '@/hooks/use-profile';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile();
  const { collapsed } = useSidebar();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Sidebar profile={profile} />
      <main className={cn(
        'transition-all duration-300',
        collapsed ? 'pl-16' : 'pl-60'
      )}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
