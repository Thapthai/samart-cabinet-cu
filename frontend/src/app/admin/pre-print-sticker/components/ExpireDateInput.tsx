'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type ExpireDateInputProps = {
  id?: string;
  value: string;
  onChange: (ymd: string) => void;
  className?: string;
};

function ymdToDmy(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function dmyToYmd(raw: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(raw.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function ExpireDateInput({ id, value, onChange, className }: ExpireDateInputProps) {
  const [text, setText] = useState(() => ymdToDmy(value));

  useEffect(() => {
    setText(ymdToDmy(value));
  }, [value]);

  const commitText = (raw: string) => {
    if (!raw.trim()) {
      onChange('');
      setText('');
      return;
    }
    const ymd = dmyToYmd(raw);
    if (ymd) {
      onChange(ymd);
      setText(ymdToDmy(ymd));
      return;
    }
    setText(ymdToDmy(value));
  };

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="วว/ดด/ปปปป"
        className={cn('h-8 bg-white pr-8 text-sm', className)}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            onChange('');
            return;
          }
          const ymd = dmyToYmd(next);
          if (ymd) onChange(ymd);
        }}
        onBlur={(e) => commitText(e.target.value)}
      />
      <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
      <input
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-y-0 right-0 w-8 cursor-pointer opacity-0"
      />
    </div>
  );
}

export function ItemLabel({ itemcode, itemname }: { itemcode: string; itemname?: string | null }) {
  return (
    <>
      <p className="font-medium leading-snug text-slate-800">{itemname?.trim() || '—'}</p>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{itemcode}</p>
    </>
  );
}
