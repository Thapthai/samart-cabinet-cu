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

const BE_OFFSET = 543;

function ymdToDmy(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** ปี 4 หลักตั้งแต่ 2400 = พ.ศ. · 2 หลักเลือกค่าที่ไม่เป็นอดีต (69 → 2026, 30 → 2030) */
function resolveYearCE(yearRaw: number): number | null {
  if (yearRaw >= 2400) return yearRaw - BE_OFFSET;
  if (yearRaw >= 1000) return yearRaw;
  if (yearRaw >= 100) return null;
  const asBE = 2500 + yearRaw - BE_OFFSET;
  return asBE >= new Date().getFullYear() ? asBE : 2000 + yearRaw;
}

function toYmd(day: number, month: number, yearRaw: number): string | null {
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(yearRaw)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const yearCE = resolveYearCE(yearRaw);
  if (yearCE == null) return null;
  const dt = new Date(yearCE, month - 1, day);
  if (dt.getFullYear() !== yearCE || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return `${String(yearCE).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * แปลงข้อความเป็น YYYY-MM-DD
 * strict = รับเฉพาะรูปแบบที่กรอกปีครบแล้ว ใช้ตอนกำลังพิมพ์เพื่อไม่ให้ค่ากลางทางถูกตีความผิด
 */
function parseExpireInput(raw: string, strict: boolean): string | null {
  const cleaned = raw.trim().replace(/\s/g, '');
  if (!cleaned) return null;

  if (/^\d{8}$/.test(cleaned)) {
    return toYmd(
      Number(cleaned.slice(0, 2)),
      Number(cleaned.slice(2, 4)),
      Number(cleaned.slice(4, 8)),
    );
  }

  if (!strict && /^\d{6}$/.test(cleaned)) {
    return toYmd(
      Number(cleaned.slice(0, 2)),
      Number(cleaned.slice(2, 4)),
      Number(cleaned.slice(4, 6)),
    );
  }

  const yearPattern = strict ? /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/ : /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/;
  const m = yearPattern.exec(cleaned);
  if (!m) return null;
  return toYmd(Number(m[1]), Number(m[2]), Number(m[3]));
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
    const ymd = parseExpireInput(raw, false);
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
        placeholder="วว/ดด/ปปปป หรือ 01092026"
        className={cn('h-8 bg-white pr-8 text-sm', className)}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            onChange('');
            return;
          }
          const ymd = parseExpireInput(next, true);
          if (ymd) onChange(ymd);
        }}
        onBlur={(e) => commitText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitText(e.currentTarget.value);
        }}
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
