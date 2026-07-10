'use client';

import type { ReactNode } from 'react';
import { Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface WeighingDispenseFiltersToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  loading: boolean;
  hasActiveFilters: boolean;
  onSearch: () => void;
  onClear: () => void;
  reportActions?: ReactNode;
}

export default function WeighingDispenseFiltersToolbar({
  searchTerm,
  onSearchTermChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  loading,
  hasActiveFilters,
  onSearch,
  onClear,
  reportActions,
}: WeighingDispenseFiltersToolbarProps) {
  return (
    <div className="space-y-1.5">
      <form
        className="space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >

        <div className="grid grid-cols-2 gap-1.5">
          <div className="space-y-0.5">
            <label htmlFor="weighing-dispense-date-from" className="text-[11px] font-medium text-slate-500">
              วันที่เริ่ม
            </label>
            <Input
              id="weighing-dispense-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-9 border-slate-200 bg-white text-sm"
            />
          </div>
          <div className="space-y-0.5">
            <label htmlFor="weighing-dispense-date-to" className="text-[11px] font-medium text-slate-500">
              วันที่สิ้นสุด
            </label>
            <Input
              id="weighing-dispense-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-9 border-slate-200 bg-white text-sm"
            />
          </div>
        </div>
        <div className="flex items-stretch gap-1.5">
          <label htmlFor="weighing-dispense-keyword" className="sr-only">
            ค้นหาชื่ออุปกรณ์
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              id="weighing-dispense-keyword"
              placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="h-9 border-slate-200 bg-slate-50/50 pl-9 pr-3 text-sm shadow-none focus-visible:bg-white"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            disabled={loading}
            className="h-9 shrink-0 border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {loading ? '...' : 'ค้นหา'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClear}
            disabled={!hasActiveFilters || loading}
            aria-label="ล้างตัวกรอง"
            className="h-9 w-9 shrink-0 border-slate-200 bg-white p-0 shadow-sm sm:w-auto sm:px-3"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:ml-1 sm:inline">ล้าง</span>
          </Button>
        </div>
      </form>
      {reportActions ? (
        <div className="border-t border-slate-100 pt-2">{reportActions}</div>
      ) : null}
    </div>
  );
}

const exportBtnClass =
  'h-9 w-full gap-1 px-2 text-xs shadow-sm sm:h-9 sm:w-auto sm:px-3 sm:text-sm [&_svg]:size-3.5 sm:[&_svg]:size-4';

export function WeighingDispenseReportDownloadButtons({
  exportLoading,
  combinedExcelLoading,
  showCombined,
  onDownloadExcel,
  onDownloadPdf,
  onDownloadDispensedAllExcel,
}: {
  exportLoading: 'excel' | 'pdf' | null;
  combinedExcelLoading: boolean;
  showCombined: boolean;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
  onDownloadDispensedAllExcel?: () => void;
}) {
  const busy = exportLoading !== null || combinedExcelLoading;
  const cols = showCombined ? 3 : 2;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <p className="shrink-0 text-[11px] font-medium text-slate-500">ดาวน์โหลดรายงาน</p>
      <div
        className={cn(
          'grid min-w-0 flex-1 gap-1.5 sm:flex sm:w-auto sm:flex-none sm:flex-wrap sm:items-center sm:gap-1.5',
          cols === 3 ? 'grid-cols-3' : 'grid-cols-2',
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownloadExcel}
          disabled={busy}
          className={exportBtnClass}
        >
          <Download />
          {exportLoading === 'excel' ? '...' : 'Excel'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDownloadPdf}
          disabled={busy}
          className={exportBtnClass}
        >
          <Download />
          {exportLoading === 'pdf' ? '...' : 'PDF'}
        </Button>
        {showCombined && onDownloadDispensedAllExcel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadDispensedAllExcel}
            disabled={busy}
            className={cn(exportBtnClass, 'whitespace-nowrap')}
          >
            <Download />
            <span className="truncate">{combinedExcelLoading ? '...' : 'Excel รวม'}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
