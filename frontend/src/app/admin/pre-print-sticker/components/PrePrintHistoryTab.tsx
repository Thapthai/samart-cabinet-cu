'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileDown,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  stickerPrintApi,
  type PrePrintStickerDetailRow,
  type PrePrintStickerDocument,
} from '@/lib/api';
import PrePrintHistoryFilterCard, {
  type PrePrintHistoryFilters,
} from './PrePrintHistoryFilterCard';
import { DeletePrePrintStickerDialog } from './DeletePrePrintStickerDialog';

const ITEMS_PER_PAGE = 10;
/** ซ่อนปุ่ม PDF รายแถวชั่วคราว — เปิดอีกครั้งเมื่อพร้อม */
const SHOW_ROW_PDF = false;
/** expand + สถานะพิมพ์ + ลำดับ + doc + date + lot + sheets + creator + actions (+ optional PDF) */
const COLUMN_COUNT = SHOW_ROW_PDF ? 10 : 9;

type HistoryStatusTab = 'all' | 'PREPARED' | 'PRINTED';

const HISTORY_STATUS_TABS: { value: HistoryStatusTab; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'PREPARED', label: 'ยังไม่ได้พิมพ์' },
  { value: 'PRINTED', label: 'พิมพ์แล้ว' },
];

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultFilters(): PrePrintHistoryFilters {
  const today = getTodayDate();
  return { keyword: '', startDate: today, endDate: today };
}

function formatThDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return iso;
  }
}

function formatThDateOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatExpireDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok' });
  } catch {
    return iso;
  }
}

function creatorLabel(doc: PrePrintStickerDocument): string {
  const u = doc.createdBy;
  if (!u) return '—';
  const name = [u.fname, u.lname].filter(Boolean).join(' ').trim();
  return name || u.email || '—';
}

function statusLabel(status: string): string {
  if (status === 'PREPARED') return 'เตรียมพิมพ์';
  if (status === 'PRINTED') return 'พิมพ์แล้ว';
  return status;
}

function groupDetailsByItem(details: PrePrintStickerDetailRow[]) {
  const map = new Map<string, PrePrintStickerDetailRow[]>();
  const sorted = [...details].sort((a, b) => {
    const nameA = (a.item_name ?? a.itemcode ?? '').localeCompare(b.item_name ?? b.itemcode ?? '', 'th');
    if (nameA !== 0) return nameA;
    return a.itemcode.localeCompare(b.itemcode, 'th');
  });
  for (const line of sorted) {
    const list = map.get(line.itemcode) ?? [];
    list.push(line);
    map.set(line.itemcode, list);
  }
  return [...map.entries()].sort((a, b) => {
    const nameA = (a[1][0]?.item_name ?? a[0]).localeCompare(b[1][0]?.item_name ?? b[0], 'th');
    if (nameA !== 0) return nameA;
    return a[0].localeCompare(b[0], 'th');
  });
}

function sortDetailsByItemName(details: PrePrintStickerDetailRow[]) {
  return [...details].sort((a, b) => {
    const nameA = (a.item_name ?? a.itemcode ?? '').localeCompare(b.item_name ?? b.itemcode ?? '', 'th');
    if (nameA !== 0) return nameA;
    return a.itemcode.localeCompare(b.itemcode, 'th');
  });
}

function StatBadge({
  value,
  unit,
  tone = 'sky',
}: {
  value: number;
  unit: string;
  tone?: 'sky' | 'violet';
}) {
  const toneClass =
    tone === 'violet'
      ? 'bg-violet-50 text-violet-950 ring-violet-100'
      : 'bg-sky-50 text-sky-950 ring-sky-100';
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 rounded-md px-2 py-1 ring-1 ring-inset',
        toneClass,
      )}
    >
      <span className="text-base font-semibold tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs font-medium opacity-80">{unit}</span>
    </span>
  );
}

function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}

type PrePrintHistoryTabProps = {
  refreshKey?: number;
};

export default function PrePrintHistoryTab({ refreshKey = 0 }: PrePrintHistoryTabProps) {
  const [history, setHistory] = useState<PrePrintStickerDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [detailById, setDetailById] = useState<Map<number, PrePrintStickerDocument>>(new Map());
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [rowPdfLoadingId, setRowPdfLoadingId] = useState<number | null>(null);
  const [filters, setFilters] = useState<PrePrintHistoryFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<PrePrintHistoryFilters>(defaultFilters);
  // const [editDoc, setEditDoc] = useState<PrePrintStickerDocument | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<PrePrintStickerDocument | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [statusTab, setStatusTab] = useState<HistoryStatusTab>('all');
  const [statusConfirm, setStatusConfirm] = useState<{
    doc: PrePrintStickerDocument;
    printed: boolean;
  } | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await stickerPrintApi.listPrePrintStickers({
        page,
        limit: ITEMS_PER_PAGE,
        keyword: appliedFilters.keyword.trim() || undefined,
        start_date: appliedFilters.startDate || undefined,
        end_date: appliedFilters.endDate || undefined,
        status: statusTab === 'all' ? undefined : statusTab,
      });
      if (res.success) {
        setHistory(res.data ?? []);
        setLastPage(res.lastPage ?? 1);
        setTotal(res.total ?? 0);
      }
    } catch {
      toast.error('โหลดประวัติไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters, statusTab]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, refreshKey]);

  useEffect(() => {
    setExpandedIds(new Set());
    setDetailById(new Map());
  }, [page, appliedFilters, statusTab]);

  const handleFilterChange = <K extends keyof PrePrintHistoryFilters>(
    key: K,
    value: PrePrintHistoryFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    const next = defaultFilters();
    setFilters(next);
    setAppliedFilters(next);
    setStatusTab('all');
    setPage(1);
  };

  const handleStatusTabChange = (value: string) => {
    setStatusTab(value as HistoryStatusTab);
    setPage(1);
  };

  const ensureDetail = async (doc: PrePrintStickerDocument) => {
    if (detailById.has(doc.id)) return;
    try {
      setDetailLoadingId(doc.id);
      const res = await stickerPrintApi.getPrePrintSticker(doc.id);
      if (res.success && res.data) {
        setDetailById((prev) => {
          const next = new Map(prev);
          next.set(doc.id, res.data!);
          return next;
        });
      } else {
        toast.error(res.message || 'โหลดรายละเอียดไม่สำเร็จ');
      }
    } catch {
      toast.error('โหลดรายละเอียดไม่สำเร็จ');
    } finally {
      setDetailLoadingId(null);
    }
  };

  const toggleExpand = async (doc: PrePrintStickerDocument) => {
    const willExpand = !expandedIds.has(doc.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(doc.id)) next.delete(doc.id);
      else next.add(doc.id);
      return next;
    });
    if (willExpand) await ensureDetail(doc);
  };

  const handleDownloadRowPdf = async (doc: PrePrintStickerDocument, e?: MouseEvent) => {
    e?.stopPropagation();
    try {
      setRowPdfLoadingId(doc.id);
      await stickerPrintApi.downloadPrePrintStickerPdf(doc.id);
      toast.success(`ดาวน์โหลด PDF ${doc.doc_no} สำเร็จ`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ดาวน์โหลด PDF ไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setRowPdfLoadingId(null);
    }
  };

  const openDelete = (doc: PrePrintStickerDocument, e?: MouseEvent) => {
    e?.stopPropagation();
    setDeleteDoc(doc);
  };

  const handleTogglePrinted = async (doc: PrePrintStickerDocument, printed: boolean) => {
    const nextStatus = printed ? 'PRINTED' : 'PREPARED';
    if (doc.status === nextStatus) return;
    try {
      setStatusUpdatingId(doc.id);
      const res = await stickerPrintApi.updatePrePrintStickerStatus(doc.id, nextStatus);
      if (!res.success || !res.data) {
        toast.error(res.message || 'อัปเดตสถานะไม่สำเร็จ');
        return;
      }
      setHistory((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: res.data!.status } : d)),
      );
      setDetailById((prev) => {
        if (!prev.has(doc.id)) return prev;
        const next = new Map(prev);
        next.set(doc.id, { ...prev.get(doc.id)!, status: res.data!.status });
        return next;
      });
      toast.success(res.message || (printed ? 'บันทึกว่าพิมพ์แล้ว' : 'ยกเลิกสถานะพิมพ์แล้ว'));
      setStatusConfirm(null);
      if (statusTab !== 'all' && statusTab !== res.data.status) {
        void loadHistory();
      }
    } catch {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openStatusConfirm = (doc: PrePrintStickerDocument, printed: boolean) => {
    const nextStatus = printed ? 'PRINTED' : 'PREPARED';
    if (doc.status === nextStatus) return;
    setStatusConfirm({ doc, printed });
  };

  // const handleEditSuccess = (updated: PrePrintStickerDocument) => {
  //   setHistory((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
  //   setDetailById((prev) => {
  //     const next = new Map(prev);
  //     next.set(updated.id, updated);
  //     return next;
  //   });
  //   void loadHistory();
  // };

  const handleDeleteSuccess = (id: number) => {
    setHistory((prev) => prev.filter((d) => d.id !== id));
    setDetailById((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setTotal((t) => Math.max(0, t - 1));
    void loadHistory();
  };

  const printedCheckbox = (doc: PrePrintStickerDocument) => {
    const isPrinted = doc.status === 'PRINTED';
    const busy = statusUpdatingId === doc.id;
    return (
      <div
        className="flex items-center justify-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isPrinted}
          disabled={busy || statusUpdatingId !== null}
          onCheckedChange={(checked) => {
            openStatusConfirm(doc, checked === true);
          }}
          aria-label={isPrinted ? 'พิมพ์แล้ว' : 'ยังไม่พิมพ์'}
        />
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      </div>
    );
  };

  const rowActions = (doc: PrePrintStickerDocument) => (
    <div className="flex items-center justify-end gap-1.5">
      {/* ซ่อนปุ่มแก้ไขชั่วคราว
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        title={`แก้ไข ${doc.doc_no}`}
        onClick={(e) => openEdit(doc, e)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        title={`ลบ ${doc.doc_no}`}
        onClick={(e) => openDelete(doc, e)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      {SHOW_ROW_PDF && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title={`ดาวน์โหลด PDF ${doc.doc_no}`}
          disabled={rowPdfLoadingId !== null}
          onClick={(e) => void handleDownloadRowPdf(doc, e)}
        >
          {rowPdfLoadingId === doc.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );

  const rowOffset = (page - 1) * ITEMS_PER_PAGE;
  const pageNumbers = useMemo(() => generatePageNumbers(page, lastPage), [page, lastPage]);

  const descriptionText =
    history.length > 0
      ? `แสดง ${history.length} เอกสารในหน้านี้ · รวม ${total.toLocaleString()} เอกสาร · คลิกแถวเพื่อดู lot`
      : 'เอกสารเตรียมพิมพ์สติ๊กเกอร์ที่บันทึกไว้';

  const renderExpandedDetail = (doc: PrePrintStickerDocument) => {
    const detail = detailById.get(doc.id);
    const loadingDetail = detailLoadingId === doc.id;

    if (loadingDetail) {
      return (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดรายละเอียด…
        </div>
      );
    }

    if (!detail?.details?.length) {
      return <p className="py-4 text-sm text-muted-foreground">ไม่มีรายละเอียด</p>;
    }

    const grouped = groupDetailsByItem(detail.details);

    return (
      <div>
        <h4 className="mb-3 flex flex-wrap items-center gap-2 font-semibold text-gray-700">
          <Package className="h-4 w-4" />
          <span>รายการ lot ในเอกสาร ({detail.details.length} lot)</span>
          <span className="font-normal text-muted-foreground">รวม</span>
          <StatBadge value={detail.total_sheets} unit="แผ่น" tone="violet" />
        </h4>

        {/* Mobile expanded list */}
        <ul className="divide-y rounded-md border bg-white md:hidden">
          {grouped.map(([itemcode, lines]) => {
            const head = lines[0];
            return (
              <li key={itemcode} className="px-3 py-2.5">
                <p className="text-sm font-medium text-slate-800">
                  {head.item_name ?? '—'}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{itemcode}</p>
                <ul className="mt-2 space-y-1.5">
                  {lines.map((line, idx) => (
                    <li
                      key={line.id}
                      className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600"
                    >
                      <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
                        Lot {idx + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        หมดอายุ {formatExpireDate(line.expire_date)}
                        {line.lot_no ? ` · #${line.lot_no}` : ''}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {line.copies}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        {/* Desktop nested table */}
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ลำดับ</TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่ออุปกรณ์</TableHead>
                <TableHead>วันหมดอายุ</TableHead>
                <TableHead className="text-center">จำนวน</TableHead>
                <TableHead>Lot no.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortDetailsByItemName(detail.details).map((line, idx) => (
                <TableRow key={line.id} className="hover:bg-gray-100/80">
                  <TableCell className="font-medium">{idx + 1}</TableCell>
                  <TableCell>
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs">{line.itemcode}</code>
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">
                    {line.item_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatExpireDate(line.expire_date)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatBadge value={line.copies} unit="แผ่น" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {line.lot_no?.trim() || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-4">
      <PrePrintHistoryFilterCard
        filters={filters}
        appliedFilters={appliedFilters}
        loading={loading}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base sm:text-lg">ประวัติเอกสารเตรียมพิมพ์</CardTitle>
            <CardDescription className="text-sm">
              <span className="sm:hidden">
                {history.length > 0
                  ? `${total.toLocaleString()} เอกสาร`
                  : 'เอกสารเตรียมพิมพ์ที่บันทึกไว้'}
              </span>
              <span className="hidden sm:inline">{descriptionText}</span>
            </CardDescription>
          </div>
          {/* <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportLoading !== null || loading || history.length === 0}
              onClick={() => void handleExportReport('excel')}
            >
              {exportLoading === 'excel' ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : (
                <Download className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportLoading !== null || loading || history.length === 0}
              onClick={() => void handleExportReport('pdf')}
            >
              {exportLoading === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : (
                <Download className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </Button>
     
          </div> */}
        </CardHeader>

        <CardContent className="px-3 py-3 sm:px-4 sm:py-4">
          <Tabs value={statusTab} onValueChange={handleStatusTabChange} className="mb-4 gap-0">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
              {HISTORY_STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-2 py-2 text-xs sm:text-sm"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading && history.length === 0 ? (
            <div className="flex items-center justify-center py-10 sm:py-12">
              <div className="text-center">
                <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center sm:py-12">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">
                {statusTab === 'PREPARED'
                  ? 'ไม่พบเอกสารที่ยังไม่ได้พิมพ์'
                  : statusTab === 'PRINTED'
                    ? 'ไม่พบเอกสารที่พิมพ์แล้ว'
                    : 'ไม่พบเอกสารเตรียมพิมพ์'}
              </p>
              <p className="mt-2 text-sm text-gray-400">ลองปรับเงื่อนไขค้นหาหรือช่วงวันที่</p>
            </div>
          ) : (
            <>
              {/* Mobile list — DispensedTable style */}
              <div className="divide-y rounded-md border bg-white md:hidden">
                {history.map((doc, index) => {
                  const isExpanded = expandedIds.has(doc.id);
                  const rowNum = rowOffset + index + 1;
                  return (
                    <div key={doc.id} className={cn(isExpanded && 'bg-slate-50/60')}>
                      <div className="flex w-full items-start gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => void toggleExpand(doc)}
                          className="mt-0.5 shrink-0 text-slate-500 touch-manipulation"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'ย่อ' : 'ขยาย'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleExpand(doc)}
                          className="min-w-0 flex-1 text-left touch-manipulation active:opacity-80"
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                              {rowNum}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug break-words text-slate-800">
                                {doc.doc_no}
                              </p>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {formatThDateOnly(doc.created_at)} · {creatorLabel(doc)}
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <StatBadge
                                  value={doc._count?.details ?? doc.total_lines}
                                  unit="lot"
                                />
                                <StatBadge value={doc.total_sheets} unit="แผ่น" tone="violet" />
                                <span
                                  className={cn(
                                    'rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                                    doc.status === 'PRINTED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-700',
                                  )}
                                >
                                  {statusLabel(doc.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <span>พิมพ์แล้ว</span>
                            {printedCheckbox(doc)}
                          </div>
                          {rowActions(doc)}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t bg-gray-50 px-3 py-3">
                          {renderExpandedDetail(doc)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12" />
                      <TableHead className="w-[100px] text-center">สถานะพิมพ์</TableHead>
                      <TableHead className="w-[72px]">ลำดับ</TableHead>
                      <TableHead>เลขที่เอกสาร</TableHead>
                      <TableHead>วันที่บันทึก</TableHead>
                      <TableHead className="text-center min-w-[6rem]">Lot</TableHead>
                      <TableHead className="text-center min-w-[6rem]">แผ่น</TableHead>
                      <TableHead>ผู้บันทึก</TableHead>
                      <TableHead className="w-[120px] text-center">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((doc, index) => {
                      const isExpanded = expandedIds.has(doc.id);
                      const rowNum = rowOffset + index + 1;
                      return (
                        <Fragment key={doc.id}>
                          <TableRow
                            className={cn(
                              'transition-colors',
                              isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/80',
                            )}
                          >
                            <TableCell className="w-12">
                              <button
                                type="button"
                                onClick={() => void toggleExpand(doc)}
                                className="rounded p-1 hover:bg-gray-200"
                                aria-label={isExpanded ? 'ย่อ' : 'ขยาย'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-slate-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-600" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="text-center">{printedCheckbox(doc)}</TableCell>
                            <TableCell className="font-medium text-slate-700">{rowNum}</TableCell>
                            <TableCell>
                              <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                                {doc.doc_no}
                              </code>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatThDateTime(doc.created_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <StatBadge
                                value={doc._count?.details ?? doc.total_lines}
                                unit="lot"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <StatBadge value={doc.total_sheets} unit="แผ่น" tone="violet" />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {creatorLabel(doc)}
                            </TableCell>
                            <TableCell className="text-center">{rowActions(doc)}</TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                                {renderExpandedDetail(doc)}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {lastPage > 1 && (
                <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-center text-sm text-gray-500 sm:text-left">
                    หน้า {page} จาก {lastPage}
                    <span className="hidden sm:inline"> ({total.toLocaleString()} เอกสาร)</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={() => setPage(1)}
                      disabled={page === 1 || loading}
                    >
                      แรกสุด
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || loading}
                    >
                      ก่อนหน้า
                    </Button>
                    <div className="hidden items-center gap-1.5 sm:flex">
                      {pageNumbers.map((pNum, idx) =>
                        pNum === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={pNum}
                            variant={page === pNum ? 'default' : 'outline'}
                            size="sm"
                            disabled={loading}
                            onClick={() => setPage(pNum as number)}
                          >
                            {pNum}
                          </Button>
                        ),
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === lastPage || loading}
                    >
                      ถัดไป
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={() => setPage(lastPage)}
                      disabled={page === lastPage || loading}
                    >
                      สุดท้าย
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ซ่อน dialog แก้ไขชั่วคราว
      <EditPrePrintStickerDialog
        open={editDoc != null}
        doc={editDoc}
        onOpenChange={(open) => {
          if (!open) setEditDoc(null);
        }}
        onSuccess={handleEditSuccess}
      />
      */}
      <DeletePrePrintStickerDialog
        open={deleteDoc != null}
        doc={deleteDoc}
        onOpenChange={(open) => {
          if (!open) setDeleteDoc(null);
        }}
        onSuccess={handleDeleteSuccess}
      />

      <Dialog
        open={statusConfirm != null}
        onOpenChange={(open) => {
          if (!open && statusUpdatingId === null) setStatusConfirm(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusConfirm?.printed ? 'ยืนยันว่าพิมพ์แล้ว' : 'ยืนยันยกเลิกสถานะพิมพ์แล้ว'}
            </DialogTitle>
            <DialogDescription>
              {statusConfirm?.printed ? (
                <>
                  ต้องการทำเครื่องหมายเอกสาร{' '}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {statusConfirm.doc.doc_no}
                  </code>{' '}
                  ว่าพิมพ์แล้วหรือไม่?
                </>
              ) : (
                <>
                  ต้องการยกเลิกสถานะพิมพ์แล้วของเอกสาร{' '}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {statusConfirm?.doc.doc_no}
                  </code>{' '}
                  หรือไม่?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusConfirm(null)}
              disabled={statusUpdatingId !== null}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!statusConfirm) return;
                void handleTogglePrinted(statusConfirm.doc, statusConfirm.printed);
              }}
              disabled={statusUpdatingId !== null || !statusConfirm}
            >
              {statusUpdatingId !== null ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  กำลังบันทึก…
                </>
              ) : (
                'ยืนยัน'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
