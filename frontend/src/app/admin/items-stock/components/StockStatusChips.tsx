'use client';

import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { hintForExpireAfterDaysInput, type StockStatusFilter } from '../items-stock-shared';

export type StockStatusChipDef = { id: StockStatusFilter; label: string };

type Props = {
  chipDefs: StockStatusChipDef[];
  statusFilter: StockStatusFilter;
  onStatusFilterChange: (value: StockStatusFilter) => void;
  /** แสดงช่องจำนวนวัน — กรองวันหมดเร็วสุดภายใน <= n วันจากวันนี้ (ตู้ RFID) */
  showExpiryDateRange?: boolean;
  /** จำนวนวันนับจากวันนี้ (สตริงตัวเลข เช่น "30") */
  expiryAfterDay?: string;
  onExpiryAfterDayChange?: (value: string) => void;
  onClearExpiryDate?: () => void;
};

export default function StockStatusChips({
  chipDefs,
  statusFilter,
  onStatusFilterChange,
  showExpiryDateRange = false,
  expiryAfterDay = '',
  onExpiryAfterDayChange,
  onClearExpiryDate,
}: Props) {
  const rawDays = (expiryAfterDay ?? '').trim();
  const hasDays = Boolean(rawDays);
  const daysHint = hasDays ? hintForExpireAfterDaysInput(rawDays) : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">กรองสถานะในหน้านี้</p>
      <div className="flex min-w-0 flex-wrap items-end gap-2">
        {chipDefs.map((c) => {
          const active = statusFilter === c.id;
          return (
            <Fragment key={c.id}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  'rounded-xl',
                  active
                    ? 'border-transparent bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:from-blue-600 hover:to-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
                onClick={() => onStatusFilterChange(c.id)}
              >
                {c.label}
              </Button>
              {c.id === 'low' && showExpiryDateRange && onExpiryAfterDayChange && (
                <div
                  className="flex min-w-0 flex-col gap-1 border-l border-slate-200/90 pl-3 sm:ml-0.5"
                  title="ใส่จำนวนวันนับจากวันนี้ — แสดงเฉพาะรายการที่วันหมดเร็วสุดภายใน <= จำนวนวันที่ใส่"
                >
                  <div className="flex min-w-0 flex-wrap items-end gap-2">
                    <div className="grid min-w-0 gap-1">
            
                      <Input
                        id="items-stock-expire-after-days"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        placeholder="เช่น 100"
                        className="h-9 w-[100px] max-w-full text-sm"
                        value={expiryAfterDay}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          onExpiryAfterDayChange(v);
                        }}
                      />
                    </div>
                    {onClearExpiryDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 shrink-0 text-slate-600"
                        disabled={!hasDays}
                        onClick={() => onClearExpiryDate()}
                      >
                        ล้าง
                      </Button>
                    )}
                  </div>
                  {daysHint && (
                    <p className="max-w-[min(100%,320px)] text-[11px] leading-snug text-slate-500">
                      {daysHint}
                    </p>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
