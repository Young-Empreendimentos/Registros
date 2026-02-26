'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Pencil, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineTextEditProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  disabled?: boolean;
  type?: 'text' | 'date' | 'number' | 'url';
  placeholder?: string;
}

export function InlineTextEdit({ value, onSave, disabled, type = 'text', placeholder }: InlineTextEditProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editValue);
      setEditing(false);
    } catch {
      // keep editing
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setEditing(false);
  };

  if (disabled) {
    return <span className="text-zinc-400 text-sm">{value || '-'}</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setEditValue(value || '');
          setEditing(true);
        }}
        className="group flex items-center gap-1 text-sm text-zinc-300 hover:text-white transition-colors w-full text-left min-h-[28px]"
      >
        <span className={cn('truncate', !value && 'text-zinc-600')}>
          {value || placeholder || '-'}
        </span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 text-zinc-500" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        className="h-7 text-xs"
        disabled={saving}
      />
      <button onClick={handleSave} disabled={saving} className="text-emerald-500 hover:text-emerald-400">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button onClick={handleCancel} className="text-zinc-500 hover:text-zinc-300">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface InlineCheckboxProps {
  checked: boolean;
  onToggle: (value: boolean) => Promise<void>;
  disabled?: boolean;
  label?: string;
}

export function InlineCheckbox({ checked, onToggle, disabled, label }: InlineCheckboxProps) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    setSaving(true);
    try {
      await onToggle(!checked);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={disabled || saving}
      />
      {label && <span className="text-xs text-zinc-400">{label}</span>}
    </div>
  );
}

interface UrlFieldProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  onPreview?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UrlField({ value, onSave, onPreview, disabled, placeholder }: UrlFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editValue);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (disabled && !value) {
    return <span className="text-zinc-600 text-sm">-</span>;
  }

  if (value && !editing) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={onPreview}
          className="text-orange-500 hover:text-orange-400 text-xs underline underline-offset-2 truncate max-w-[120px]"
        >
          Ver documento
        </button>
        <a href={value} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
        </a>
        {!disabled && (
          <button onClick={() => { setEditValue(value); setEditing(true); }}>
            <Pencil className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
          </button>
        )}
      </div>
    );
  }

  if (!editing && !disabled) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-zinc-600 hover:text-zinc-400"
      >
        {placeholder || '+ Adicionar URL'}
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[280px]">
        <Input
          ref={inputRef}
          type="url"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setEditValue(value || ''); setEditing(false); }
          }}
          className="h-8 text-sm flex-1"
          placeholder="Cole a URL do documento aqui..."
          disabled={saving}
        />
        <button onClick={handleSave} disabled={saving} className="text-emerald-500 hover:text-emerald-400 p-1">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => { setEditValue(value || ''); setEditing(false); }} className="text-zinc-500 hover:text-zinc-300 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
