'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Pencil, ExternalLink } from 'lucide-react';
// Check e X ainda são usados no UrlField
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
    if (saving) return;
    if (editValue === (value || '')) {
      setEditing(false);
      return;
    }
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

  if (disabled) {
    return (
      <span className={cn('text-[11px]', value ? 'text-gray-700' : 'text-gray-400')}>
        {value || '-'}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setEditValue(value || '');
          setEditing(true);
        }}
        className="group flex items-center gap-0.5 text-[11px] text-gray-700 hover:text-gray-900 transition-colors w-full text-left min-h-[22px]"
      >
        <span className={cn('truncate', !value && 'text-gray-400')}>
          {value || placeholder || '-'}
        </span>
        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 shrink-0 text-gray-400" />
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={type}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setEditValue(value || '');
          setEditing(false);
        }
      }}
      className="h-6 text-[11px]"
      disabled={saving}
      placeholder={placeholder}
    />
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
    <div className="flex items-center gap-1">
      <Checkbox
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={disabled || saving}
        className="h-3.5 w-3.5"
      />
      {label && <span className="text-[10px] text-gray-500">{label}</span>}
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
    return <span className="text-gray-400 text-[11px]">-</span>;
  }

  if (value && !editing) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={onPreview}
          className="text-blue-600 hover:text-blue-700 text-[10px] underline underline-offset-2 truncate max-w-[80px]"
        >
          Ver doc
        </button>
        <a href={value} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-2.5 h-2.5 text-gray-400 hover:text-gray-600" />
        </a>
        {!disabled && (
          <button onClick={() => { setEditValue(value); setEditing(true); }}>
            <Pencil className="w-2.5 h-2.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
    );
  }

  if (!editing && !disabled) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[10px] text-gray-400 hover:text-gray-600"
      >
        {placeholder || '+ URL'}
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-0.5 min-w-[220px]">
        <Input
          ref={inputRef}
          type="url"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setEditValue(value || ''); setEditing(false); }
          }}
          className="h-6 text-[11px] flex-1"
          placeholder="Cole a URL..."
          disabled={saving}
        />
        <button onClick={handleSave} disabled={saving} className="text-green-600 hover:text-green-700 p-0.5">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={() => { setEditValue(value || ''); setEditing(false); }} className="text-gray-400 hover:text-gray-600 p-0.5">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return null;
}
