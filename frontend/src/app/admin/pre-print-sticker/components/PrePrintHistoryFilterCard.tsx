'use client';

import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ExpireDateInput } from './ExpireDateInput';

const fieldInputClass = 'bg-white';

export type PrePrintHistoryFilters = {
  keyword: string;
  startDate: string;
  endDate: string;
};

type PrePrintHistoryFilterCardProps = {
  filters: PrePrintHistoryFilters;
  appliedFilters: PrePrintHistoryFilters;
  loading?: boolean;
  onFilterChange: <K extends keyof PrePrintHistoryFilters>(
    key: K,
    value: PrePrintHistoryFilters[K],
  ) => void;
  onSearch: () => void;
  onReset: () => void;
};

export default function PrePrintHistoryFilterCard({
  filters,
  appliedFilters,
  loading = false,
  onFilterChange,
  onSearch,
  onReset,
}: PrePrintHistoryFilterCardProps) {
  const hasActiveFilters =
    appliedFilters.keyword.trim() !== '' ||
    appliedFilters.startDate !== '' ||
    appliedFilters.endDate !== '';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">ค้นหาและกรองประวัติเอกสารเตรียมพิมพ์</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pre-print-history-keyword" className="text-xs font-medium text-slate-600">
              เลขที่เอกสาร / รหัส / ชื่ออุปกรณ์
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="pre-print-history-keyword"
                placeholder="ค้นหา..."
                value={filters.keyword}
                onChange={(e) => onFilterChange('keyword', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pre-print-start-date" className="text-xs font-medium text-slate-600">
                วันที่เริ่มต้น
              </label>
              <ExpireDateInput
                id="pre-print-start-date"
                value={filters.startDate}
                onChange={(ymd) => onFilterChange('startDate', ymd)}
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pre-print-end-date" className="text-xs font-medium text-slate-600">
                วันที่สิ้นสุด
              </label>
              <ExpireDateInput
                id="pre-print-end-date"
                value={filters.endDate}
                onChange={(ymd) => onFilterChange('endDate', ymd)}
                className={cn('h-10 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" onClick={onSearch} disabled={loading} className="h-10 gap-2">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            type="button"
            onClick={onReset}
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={loading}
            aria-label="รีเซ็ต"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {appliedFilters.keyword.trim() ? (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คำค้น: {appliedFilters.keyword.trim()}
              </span>
            ) : null}
            {appliedFilters.startDate || appliedFilters.endDate ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                วันที่: {appliedFilters.startDate || '—'} – {appliedFilters.endDate || '—'}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
