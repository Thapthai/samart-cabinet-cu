'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StockStatusFilter } from '../items-stock-shared';

export type ItemsStockExportLoading =
  | null
  | 'excel'
  | 'pdf'
  | 'combined'
  | 'w-excel-all'
  | 'w-pdf-all'
  | 'w-combined'
  | 'r-excel-all'
  | 'r-pdf-all'
  | 'low-excel'
  | 'low-pdf';

const exportBtnClass =
  'h-9 w-full gap-1 px-2 text-xs shadow-sm sm:h-9 sm:w-auto sm:px-3 sm:text-sm [&_svg]:size-3.5 sm:[&_svg]:size-4';

function ExportButtonGroup({
  children,
  className,
  columns = 3,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-1.5',
        columns === 2 ? 'grid-cols-2' : 'grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface WeighingStockReportDownloadGroupsProps {
  statusFilter: StockStatusFilter;
  exportLoading: ItemsStockExportLoading;
  onExcelAll: () => void;
  onPdfAll: () => void;
  onCombinedAll: () => void;
  onLowStockExcel: () => void;
  onLowStockPdf: () => void;
}

export function WeighingStockReportDownloadGroups({
  statusFilter,
  exportLoading,
  onExcelAll,
  onPdfAll,
  onCombinedAll,
  onLowStockExcel,
  onLowStockPdf,
}: WeighingStockReportDownloadGroupsProps) {
  const busy = exportLoading !== null;

  if (statusFilter === 'low') {
    return (
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <p className="shrink-0 text-[11px] font-medium text-amber-800">ดาวน์โหลดรายงานสต็อกต่ำ</p>
        <ExportButtonGroup columns={2} className="min-w-0 flex-1 sm:flex-none">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLowStockExcel}
            disabled={busy}
            className={cn(exportBtnClass, 'border-amber-200 bg-amber-50/40 hover:bg-amber-50')}
          >
            <Download />
            {exportLoading === 'low-excel' ? '...' : 'Excel'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLowStockPdf}
            disabled={busy}
            className={cn(exportBtnClass, 'border-amber-200 bg-amber-50/40 hover:bg-amber-50')}
          >
            <Download />
            {exportLoading === 'low-pdf' ? '...' : 'PDF'}
          </Button>
        </ExportButtonGroup>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <p className="shrink-0 text-[11px] font-medium text-slate-500">ดาวน์โหลดรายงาน</p>
      <ExportButtonGroup className="min-w-0 flex-1 sm:flex-none">
        <Button type="button" variant="outline" size="sm" onClick={onExcelAll} disabled={busy} className={exportBtnClass}>
          <Download />
          {exportLoading === 'w-excel-all' ? '...' : 'Excel'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPdfAll} disabled={busy} className={exportBtnClass}>
          <Download />
          {exportLoading === 'w-pdf-all' ? '...' : 'PDF'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCombinedAll}
          disabled={busy}
          className={cn(exportBtnClass, 'whitespace-nowrap')}
        >
          <Download />
          <span className="truncate">{exportLoading === 'w-combined' ? '...' : 'Excel รวม'}</span>
        </Button>
      </ExportButtonGroup>
    </div>
  );
}

interface RfidStockReportDownloadGroupsProps {
  statusFilter: StockStatusFilter;
  exportLoading: ItemsStockExportLoading;
  onExcelAll: () => void;
  onPdfAll: () => void;
  onCombinedAll: () => void;
  onLowStockExcel: () => void;
  onLowStockPdf: () => void;
}

export function RfidStockReportDownloadGroups({
  statusFilter,
  exportLoading,
  onExcelAll,
  onPdfAll,
  onCombinedAll,
  onLowStockExcel,
  onLowStockPdf,
}: RfidStockReportDownloadGroupsProps) {
  const busy = exportLoading !== null;

  if (statusFilter === 'low') {
    return (
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <p className="shrink-0 text-[11px] font-medium text-amber-800">ดาวน์โหลดรายงานสต็อกต่ำ</p>
        <ExportButtonGroup columns={2} className="min-w-0 flex-1 sm:flex-none">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLowStockExcel}
            disabled={busy}
            className={cn(exportBtnClass, 'border-amber-200 bg-amber-50/40 hover:bg-amber-50')}
          >
            <Download />
            {exportLoading === 'low-excel' ? '...' : 'Excel'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLowStockPdf}
            disabled={busy}
            className={cn(exportBtnClass, 'border-amber-200 bg-amber-50/40 hover:bg-amber-50')}
          >
            <Download />
            {exportLoading === 'low-pdf' ? '...' : 'PDF'}
          </Button>
        </ExportButtonGroup>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <p className="shrink-0 text-[11px] font-medium text-slate-500">ดาวน์โหลดรายงาน</p>
      <ExportButtonGroup className="min-w-0 flex-1 sm:flex-none">
        <Button type="button" variant="outline" size="sm" onClick={onExcelAll} disabled={busy} className={exportBtnClass}>
          <Download />
          {exportLoading === 'r-excel-all' ? '...' : 'Excel'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onPdfAll} disabled={busy} className={exportBtnClass}>
          <Download />
          {exportLoading === 'r-pdf-all' ? '...' : 'PDF'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCombinedAll}
          disabled={busy}
          className={cn(exportBtnClass, 'whitespace-nowrap')}
        >
          <Download />
          <span className="truncate">{exportLoading === 'combined' ? '...' : 'Excel รวม'}</span>
        </Button>
      </ExportButtonGroup>
    </div>
  );
}
