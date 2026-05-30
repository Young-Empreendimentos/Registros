'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { EtapaBadge } from './etapa-badge';
import type { Etapa } from '@/types';

interface InlineEtapaSelectProps {
  value: Etapa;
  manual: Etapa | null;
  options: Etapa[];
  onSave: (etapaAnalise: Etapa | null) => Promise<void>;
  disabled?: boolean;
  fullLabel?: boolean;
}

export function InlineEtapaSelect({
  value,
  manual,
  options,
  onSave,
  disabled,
  fullLabel,
}: InlineEtapaSelectProps) {
  const [saving, setSaving] = useState(false);

  if (disabled) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <EtapaBadge etapa={value} fullLabel={fullLabel} />
        {manual && (
          <span className="text-[10px] text-orange-600 font-medium">manual</span>
        )}
      </span>
    );
  }

  const handleChange = async (next: string) => {
    const etapaAnalise = next === '__auto__' ? null : (next as Etapa);
    if (etapaAnalise === manual) return;

    setSaving(true);
    try {
      await onSave(etapaAnalise);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      value={manual ?? '__auto__'}
      onValueChange={handleChange}
      disabled={saving}
    >
      <SelectTrigger className="h-auto min-h-8 min-w-[200px] border-orange-200 bg-white py-1 text-xs shadow-none">
        <span className="flex items-center gap-1.5">
          <EtapaBadge etapa={value} fullLabel={fullLabel} />
          {manual && (
            <span className="text-[10px] text-orange-600 font-medium">manual</span>
          )}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__auto__" className="text-xs text-orange-700">
          Automática (sistema): {manual ? '…' : value}
        </SelectItem>
        {options.map((e) => (
          <SelectItem key={e} value={e} className="text-xs">
            {e}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
