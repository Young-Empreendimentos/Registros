import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
};

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span
      className={cn(
        'font-bold text-white select-none tracking-tight leading-none',
        sizes[size],
        className
      )}
    >
      Y
    </span>
  );
}
