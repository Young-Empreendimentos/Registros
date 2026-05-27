'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

function shouldShowLoader(pathname: string): boolean {
  if (pathname.startsWith('/login')) return false;
  if (pathname.startsWith('/api')) return false;
  return true;
}

/**
 * Loader leve: só em envios de formulário (não bloqueia troca de abas).
 * Navegação entre rotas usa cache do layout — sem overlay em cada clique.
 */
export function YoungLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    document.body.classList.remove('is-page-loading');
  }, []);

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(true);
      document.body.classList.add('is-page-loading');
    }, 400);
  }, []);

  useEffect(() => {
    hide();
  }, [pathname, hide]);

  useEffect(() => {
    if (!shouldShowLoader(pathname)) return;

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form?.tagName === 'FORM' && !form.hasAttribute('data-no-loader')) {
        show();
      }
    };

    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('submit', onSubmit, true);
      hide();
    };
  }, [pathname, show, hide]);

  if (!shouldShowLoader(pathname) || !visible) return null;

  return (
    <div
      id="young-page-loader"
      className="young-loader young-loader--overlay"
      aria-live="polite"
    >
      <div className="young-loader__spinner" />
    </div>
  );
}
