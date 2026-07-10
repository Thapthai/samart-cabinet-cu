'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RfidStockLine } from '../items-stock-shared';
import {
  formatExpireRelativeLabel,
  formatYmd,
  itemsStockStatusKeyLabelTh,
  rfidLineBadge,
} from '../items-stock-shared';

export function StockMobileCardList({ children }: { children: ReactNode }) {
  return <div className="space-y-2.5 p-3 md:hidden">{children}</div>;
}

export function StockMobileCard({
  children,
  className,
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: 'expired' | 'soon' | 'default';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white px-3 py-2.5 shadow-sm',
        accent === 'expired' && 'border-l-[3px] border-l-red-500 border-red-200/80 bg-red-50/40',
        accent === 'soon' && 'border-l-[3px] border-l-amber-400 border-amber-200/80 bg-amber-50/40',
        (!accent || accent === 'default') && 'border-slate-200/90',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StockMobileCardHeader({
  seq,
  title,
  titleClassName,
  badge,
  actions,
}: {
  seq?: number;
  title: string;
  titleClassName?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      {seq != null ? (
        <span className="mt-0.5 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">{seq}</span>
      ) : null}
      <div className="flex min-w-0 flex-1 items-start gap-1">
        <p className={cn('min-w-0 flex-1 font-semibold leading-snug line-clamp-2', titleClassName)} title={title}>
          {title}
        </p>
        {(badge || actions) && (
          <div className="flex shrink-0 items-center gap-0.5">
            {badge}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** บรรทัดข้อมูลย่อยใต้หัวข้อ */
export function StockMobileCardMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('mt-0.5 truncate text-xs leading-snug text-muted-foreground', className)}>{children}</p>
  );
}

/** จำนวน / คงเหลือ — กลางคอลัมน์ขวา */
export function StockMobileCardQty({
  label,
  value,
  low,
}: {
  label: string;
  value: number | string;
  low?: boolean;
}) {
  return (
    <div className="flex min-w-[3.25rem] shrink-0 flex-col items-center justify-center self-center border-l border-slate-100 px-2 text-center">
      <span className="text-[10px] leading-none text-muted-foreground">{label}</span>
      <span className="mt-0.5 inline-flex items-center justify-center gap-0.5 text-base font-bold leading-none tabular-nums text-foreground">
        {low ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden /> : null}
        {value}
      </span>
    </div>
  );
}

export function StockMobileCardRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex items-center gap-2', className)}>{children}</div>;
}

export function RfidTagLinesPanel({
  lines,
  filteredLines,
  statusFilterLabel,
}: {
  lines: RfidStockLine[];
  filteredLines: RfidStockLine[];
  statusFilterLabel?: string;
}) {
  if (lines.length === 0) {
    return <p className="text-sm text-muted-foreground">ไม่พบแท็ก RFID ใน itemstock</p>;
  }
  if (filteredLines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        ไม่มีแท็ก RFID ที่ตรงกับชิปสถานะหรือช่วงวันหมดอายุที่กรอง
        {lines.length > 0 ? ` (ทั้งหมด ${lines.length} แท็ก)` : ''}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        รายการ RFID ({filteredLines.length}
        {filteredLines.length !== lines.length ? ` / ${lines.length}` : ''})
        {statusFilterLabel ? ` · ${statusFilterLabel}` : ''}
      </p>
      <div className="space-y-2">
        {filteredLines.map((line) => {
          const lb = rfidLineBadge(line.expireDate);
          const rel = formatExpireRelativeLabel(line.expireDate);
          const expCls =
            lb.key === 'EXPIRED'
              ? 'text-red-600 font-medium'
              : lb.key === 'SOON'
                ? 'text-amber-700 font-medium'
                : 'text-gray-900';
          const relCls =
            lb.key === 'EXPIRED'
              ? 'text-red-600/90'
              : lb.key === 'SOON'
                ? 'text-amber-700/85'
                : 'text-gray-500';
          return (
            <div
              key={`${line.rowId}-${line.rfidCode}`}
              className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3"
            >
              <p className="break-all font-mono text-xs leading-relaxed text-gray-900">{line.rfidCode}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className={cn('text-sm tabular-nums', expCls)}>
                  <span>{formatYmd(line.expireDate)}</span>
                  {rel ? <span className={cn('ml-1 text-xs font-normal', relCls)}>({rel})</span> : null}
                </div>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                    lb.className,
                  )}
                >
                  {itemsStockStatusKeyLabelTh(lb.key)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
