'use client';

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Selecionar...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full h-9 px-3 rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
      >
        <span className="truncate">
          {selected.length === 0
            ? placeholder
            : `${selected.length} selecionado(s)`}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selected.length > 0 && (
            <span
              onClick={clearAll}
              className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-500 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors',
                  isSelected ? 'text-orange-400' : 'text-zinc-300'
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-4 h-4 rounded border shrink-0',
                    isSelected
                      ? 'bg-orange-600 border-orange-600'
                      : 'border-zinc-600 bg-zinc-800'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
