import { cn } from '@/lib/utils';

interface YoungYIconProps {
  className?: string;
  /** Animação de traço (loader Pós-Venda) */
  animated?: boolean;
  /** Laranja (padrão) ou branco (header escuro) */
  tone?: 'primary' | 'light';
}

/**
 * Y minimalista Young — identidade Pós-Venda (traço, sem PNG).
 */
export function YoungYIcon({
  className,
  animated = false,
  tone = 'primary',
}: YoungYIconProps) {
  const strokeClass = animated
    ? 'young-loader__y'
    : tone === 'light'
      ? 'young-y-icon__stroke--light'
      : 'young-y-icon__stroke';

  return (
    <svg
      viewBox="0 0 48 56"
      className={cn('young-y-icon', className)}
      aria-hidden
      fill="none"
    >
      <path className={strokeClass} d="M24 6 L11 28" />
      <path className={strokeClass} d="M24 6 L37 28" />
      <path className={strokeClass} d="M24 24 L24 50" />
    </svg>
  );
}
