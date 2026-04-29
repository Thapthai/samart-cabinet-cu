'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface WeighingStockReportDownloadGroupsProps {
  /** แสดงกลุ่มปุ่มตามแท็บที่เลือก — ทั้งหมด vs สต็อกต่ำ */
  statusFilter: StockStatusFilter;
  exportLoading: ItemsStockExportLoading;
  onExcelAll: () => void;
  onPdfAll: () => void;
  onCombinedAll: () => void;
  /** สต็อกต่ำ: Excel / PDF รวมทุกตู้ (Weighing + RFID) */
  onLowStockExcel: () => void;
  onLowStockPdf: () => void;
}

/** ปุ่มรายงาน Weighing — สลับกลุ่มตามแท็บชิป */
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
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/90 bg-amber-50/50 px-3 py-2 shadow-sm">
        <span className="text-xs font-semibold text-amber-900">สต็อกต่ำ</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLowStockExcel}
          disabled={busy}
          className="border-amber-200 bg-white shadow-sm hover:bg-amber-50/80"
        >
          <Download className="h-4 w-4 mr-1.5" />
          {exportLoading === 'low-excel' ? 'กำลังโหลด...' : 'Excel'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLowStockPdf}
          disabled={busy}
          className="border-amber-200 bg-white shadow-sm hover:bg-amber-50/80"
        >
          <Download className="h-4 w-4 mr-1.5" />
          {exportLoading === 'low-pdf' ? 'กำลังโหลด...' : 'PDF'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 shadow-sm">
      <span className="text-xs font-semibold text-muted-foreground">ทั้งหมด</span>
      <Button type="button" variant="outline" size="sm" onClick={onExcelAll} disabled={busy} className="shadow-sm">
        <Download className="h-4 w-4 mr-1.5" />
        {exportLoading === 'w-excel-all' ? 'กำลังโหลด...' : 'Excel'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPdfAll} disabled={busy} className="shadow-sm">
        <Download className="h-4 w-4 mr-1.5" />
        {exportLoading === 'w-pdf-all' ? 'กำลังโหลด...' : 'PDF'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCombinedAll} disabled={busy} className="shadow-sm whitespace-nowrap">
        <Download className="h-4 w-4 mr-1.5" />
        {exportLoading === 'w-combined' ? 'กำลังโหลด...' : 'Excel รวม'}
      </Button>
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

/** ปุ่มรายงาน RFID ตู้เดียว — สอดคล้อง Weighing (กล่องทั้งหมด / สต็อกต่ำ) */
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
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/90 bg-amber-50/50 px-3 py-2 shadow-sm">
        <span className="text-xs font-semibold text-amber-900">สต็อกต่ำ</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLowStockExcel}
          disabled={busy}
          className="border-amber-200 bg-white shadow-sm hover:bg-amber-50/80"
        >
          <Download className="h-4 w-4 mr-1.5" />
          {exportLoading === 'low-excel' ? 'กำลังโหลด...' : 'Excel'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLowStockPdf}
          disabled={busy}
          className="border-amber-200 bg-white shadow-sm hover:bg-amber-50/80"
        >
          <Download className="h-4 w-4 mr-1.5" />
          {exportLoading === 'low-pdf' ? 'กำลังโหลด...' : 'PDF'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-2 shadow-sm">
      <span className="text-xs font-semibold text-muted-foreground">ทั้งหมด</span>
      <Button type="button" variant="outline" size="sm" onClick={onExcelAll} disabled={busy} className="shadow-sm">
        <Download className="h-4 w-4 mr-1.5" />
        {exportLoading === 'r-excel-all' ? 'กำลังโหลด...' : 'Excel'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onPdfAll} disabled={busy} className="shadow-sm">
        <Download className="h-4 w-4 mr-1.5" />
        {exportLoading === 'r-pdf-all' ? 'กำลังโหลด...' : 'PDF'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCombinedAll} disabled={busy} className="shadow-sm whitespace-nowrap">
        <Download className="h-4 w-4 mr-1.5" />
        {exportLoading === 'combined' ? 'กำลังโหลด...' : 'Excel รวม'}
      </Button>
    </div>
  );
}
