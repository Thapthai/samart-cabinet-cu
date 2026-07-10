'use client';

import type { ReactNode } from 'react';
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
  showExpiryDateRange?: boolean;
  expiryAfterDay?: string;
  onExpiryAfterDayChange?: (value: string) => void;
  onClearExpiryDate?: () => void;
  reportActions?: ReactNode;
  searchToolbar?: ReactNode;
};

export default function StockStatusChips({
  chipDefs,
  statusFilter,
  onStatusFilterChange,
  showExpiryDateRange = false,
  expiryAfterDay = '',
  onExpiryAfterDayChange,
  onClearExpiryDate,
  reportActions,
  searchToolbar,
}: Props) {
  const rawDays = (expiryAfterDay ?? '').trim();
  const hasDays = Boolean(rawDays);
  const matchedPreset = presetForStoredExpireDays(rawDays);
  const isLegacy = hasDays && !matchedPreset;
  const selectValue = matchedPreset || (isLegacy ? SELECT_LEGACY : SELECT_NONE);
  const daysHint = hasDays ? hintForExpireAfterDaysInput(rawDays) : null;

  return (
    <div className="space-y-1.5">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-500">กรองสถานะในหน้านี้</p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {chipDefs.map((c) => {
            const active = statusFilter === c.id;
            return (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  'h-8 rounded-lg px-3 text-xs sm:h-9 sm:rounded-xl sm:text-sm',
                  active
                    ? 'border-transparent bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 hover:from-blue-600 hover:to-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
                onClick={() => onStatusFilterChange(c.id)}
              >
                {c.label}
              </Button>
            );
          })}
        </div>

        {showExpiryDateRange && onExpiryAfterDayChange && (
          <div
            className="flex flex-col gap-1.5 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 sm:flex-row sm:flex-wrap sm:items-center"
            title="เลือกช่วงวันหมดอายุ — แสดงเฉพาะรายการที่วันหมดเร็วสุดภายใน <= จำนวนวันที่คำนวณจากพรีเซ็ต"
          >
            <span className="shrink-0 text-[11px] font-medium text-slate-500">ช่วงวันหมดอายุ</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Select
                value={selectValue}
                onValueChange={(v) => {
                  if (v === SELECT_NONE) onExpiryAfterDayChange('');
                  else if (v === SELECT_LEGACY) return;
                  else onExpiryAfterDayChange(String(expireAfterDaysForPreset(v as ExpireAfterPresetValue)));
                }}
              >
                <SelectTrigger
                  id="items-stock-expire-after-preset"
                  size="sm"
                  className="h-8 w-full min-w-0 bg-white sm:h-9 sm:w-[9.5rem]"
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
                  className="h-8 shrink-0 px-2.5 text-slate-600 sm:h-9"
                  disabled={!hasDays}
                  onClick={() => onClearExpiryDate()}
                >
                  ล้าง
                </Button>
              )}
            </div>
            {daysHint ? (
              <p className="text-[11px] leading-snug text-slate-500 sm:min-w-0 sm:flex-1" title={daysHint}>
                {daysHint}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {(searchToolbar || reportActions) && (
        <div className="space-y-1.5 border-t border-slate-100 pt-2">
          {searchToolbar}
          {reportActions ? (
            <div className={searchToolbar ? 'border-t border-slate-100 pt-2' : undefined}>{reportActions}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
