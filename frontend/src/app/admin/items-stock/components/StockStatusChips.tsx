'use client';

import { Fragment } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  EXPIRE_AFTER_DAY_PRESET_LABELS,
  EXPIRE_AFTER_PRESET_ORDER,
  expireAfterDaysForPreset,
  hintForExpireAfterDaysInput,
  presetForStoredExpireDays,
  type ExpireAfterPresetValue,
  type StockStatusFilter,
} from '../items-stock-shared';

const SELECT_NONE = '__none__';
const SELECT_LEGACY = '__legacy__';

export type StockStatusChipDef = { id: StockStatusFilter; label: string };

type Props = {
  chipDefs: StockStatusChipDef[];
  statusFilter: StockStatusFilter;
  onStatusFilterChange: (value: StockStatusFilter) => void;
  /** แสดงดรอปดาวน์พรีเซ็ตช่วงวันหมด — กรองวันหมดเร็วสุดภายใน <= n วันจากวันนี้ (ตู้ RFID) */
  showExpiryDateRange?: boolean;
  /** จำนวนวันนับจากวันนี้ (สตริงตัวเลข) จากพรีเซ็ต — ใช้กับ GET /items */
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
  const matchedPreset = presetForStoredExpireDays(rawDays);
  const isLegacy = hasDays && !matchedPreset;
  const selectValue = matchedPreset || (isLegacy ? SELECT_LEGACY : SELECT_NONE);
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
                  className="flex min-w-0 max-w-full flex-nowrap items-center gap-2 border-l border-slate-200/90 pl-3 sm:ml-0.5"
                  title="เลือกช่วงวันหมดอายุ — แสดงเฉพาะรายการที่วันหมดเร็วสุดภายใน <= จำนวนวันที่คำนวณจากพรีเซ็ต"
                >
                  <Select
                    value={selectValue}
                    onValueChange={(v) => {
                      if (v === SELECT_NONE) onExpiryAfterDayChange('');
                      else if (v === SELECT_LEGACY) return;
                      else
                        onExpiryAfterDayChange(
                          String(expireAfterDaysForPreset(v as ExpireAfterPresetValue)),
                        );
                    }}
                  >
                    <SelectTrigger
                      id="items-stock-expire-after-preset"
                      size="sm"
                      className="h-9 w-[9rem] shrink-0"
                    >
                      <SelectValue placeholder="เลือกช่วง" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value={SELECT_NONE}>ไม่กรอง</SelectItem>
                      {isLegacy && (
                        <SelectItem value={SELECT_LEGACY} disabled>
                          ค่าที่เก็บไว้ ({rawDays} วัน) — เลือกช่วงใหม่
                        </SelectItem>
                      )}
                      {EXPIRE_AFTER_PRESET_ORDER.map((key) => (
                        <SelectItem key={key} value={key}>
                          {EXPIRE_AFTER_DAY_PRESET_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {onClearExpiryDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0 px-2 text-slate-600"
                      disabled={!hasDays}
                      onClick={() => onClearExpiryDate()}
                    >
                      ล้าง
                    </Button>
                  )}
                  {daysHint && (
                    <p
                      className="min-w-0 flex-1 truncate text-left text-[11px] leading-tight text-slate-500"
                      title={daysHint}
                    >
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
