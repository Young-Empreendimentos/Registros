import type { Metadata } from 'next';
import './globals.css';
import { YoungLoader } from '@/components/young-loader';

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
      </body>
    </html>
  );
}
