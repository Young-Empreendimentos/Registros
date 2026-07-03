'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import { YoungLoaderMark } from '@/components/young-loader-mark';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        const supabase = getBrowserSupabase();

        // Garante que a sessão foi criada a partir do code na URL (PKCE).
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const code = new URLSearchParams(window.location.search).get('code');
          if (code) {
            try {
              const { data } = await supabase.auth.exchangeCodeForSession(code);
              session = data.session;
            } catch {
              // segue com session possivelmente nula
            }
          }
        }

        if (!session?.access_token) {
          if (ativo) router.replace('/login?erro=google');
          return;
        }

        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: session.access_token }),
        });
        const data = await res.json().catch(() => ({}));

        // Não precisamos manter a sessão do Supabase — a nossa é o cookie JWT.
        await supabase.auth.signOut().catch(() => {});

        if (ativo) {
          router.replace(data?.redirect || '/login?erro=google');
          router.refresh();
        }
      } catch {
        if (ativo) {
          setErro(true);
          router.replace('/login?erro=google');
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [router]);

  return (
    <div className="login-page">
      <div className="flex flex-col items-center gap-4">
        <YoungLoaderMark />
        {!erro && (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Entrando com o Google...
          </p>
        )}
      </div>
    </div>
  );
}
