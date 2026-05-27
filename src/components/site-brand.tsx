import Link from 'next/link';
import { cn } from '@/lib/utils';
import { YoungYIcon } from '@/components/young-y-icon';

interface SiteBrandProps {
  variant?: 'header' | 'sidebar' | 'loader' | 'login';
  href?: string;
  className?: string;
  showText?: boolean;
}

export function SiteBrand({
  variant = 'sidebar',
  href = '/registros',
  className,
  showText = true,
}: SiteBrandProps) {
  const onDark = variant === 'sidebar' || variant === 'header' || variant === 'login';
  const tone = onDark ? 'light' : 'primary';

  const content = (
    <>
      <YoungYIcon
        className="site-brand__y-mark"
        tone={tone}
      />
      {showText && (
        <div className="site-brand__text">
          <span className="site-brand__name">Young</span>
          <span className="site-brand__suffix">
            {variant === 'sidebar' || variant === 'header' ? 'Registros' : 'Controle de Registros'}
          </span>
        </div>
      )}
    </>
  );

  const classes = cn(`site-brand site-brand--${variant}`, className);

  if (variant === 'loader' || variant === 'login' || !href) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
