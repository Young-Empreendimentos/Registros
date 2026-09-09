import type { Metadata } from 'next';
import './globals.css';
import { YoungLoader } from '@/components/young-loader';
import CelebracaoVenda from '@/components/CelebracaoVenda';

// Realtime da celebração de venda (Pingolead) — sempre no young-workspace.
// Chave anon é pública por design; fallback garante funcionar sem env.
const SUPABASE_URL_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://vvtympzatclvjaqucebr.supabase.co';
const SUPABASE_ANON_PUBLICA =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dHltcHphdGNsdmphcXVjZWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTI1NzYsImV4cCI6MjA4NjAyODU3Nn0.C8vWcljx6veAQ0hCi0ms7Ixm6NxhSdWBDeRgUy2Kz50';

export const metadata: Metadata = {
  title: 'Controle de Registros | Young Empreendimentos',
  description: 'Sistema de Controle de Registros - Young Empreendimentos',
  icons: {
    icon: '/logo-young.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <YoungLoader />
        {children}
        <CelebracaoVenda url={SUPABASE_URL_PUBLICA} anonKey={SUPABASE_ANON_PUBLICA} sistema="Registros" somUrl="/sons/venda-celebracao.mp3" />
      </body>
    </html>
  );
}
