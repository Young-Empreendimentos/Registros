import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#0f0f0f] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
