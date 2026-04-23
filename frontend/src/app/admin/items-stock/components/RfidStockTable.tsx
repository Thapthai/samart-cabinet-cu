'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, Radio, Settings2 } from 'lucide-react';
import { itemsApi } from '@/lib/api';
import type { Item } from '@/types/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/Pagination';
import { cn } from '@/lib/utils';
import StockStatusChips, { type StockStatusChipDef } from './StockStatusChips';
import type { ItemSlotInCabinetRow, RfidStockLine, StockStatusFilter } from '../items-stock-shared';
import {
  formatYmd,
  rfidLineBadge,
  rowBadge,
  rowFlags,
  stableRfidSummaryRowId,
  STOCK_TABLE_FRAME,
} from '../items-stock-shared';

export interface RfidListStats {
  systemTotal: number;
  rawOnPage: number;
  visibleCount: number;
}

interface RfidStockTableProps {
  cabinetId: number | null;
  stockId: number | null;
  cabinetName: string | null;
  cabinetCode: string | null;
  appliedItemName: string;
  statusFilter: StockStatusFilter;
  chipDefs: StockStatusChipDef[];
  onStatusFilterChange: (value: StockStatusFilter) => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onManage: (row: ItemSlotInCabinetRow) => void;
  /** รีเซ็ตแถวขยาย RFID เมื่อเปลี่ยนตู้ / หน้า / refetch */
  resetExpandSignal: string | number;
  refetchSignal: number;
  onLoadingChange?: (loading: boolean) => void;
  onStatsChange?: (stats: RfidListStats) => void;
}

/** แมปจาก GET /items?cabinet_id= (item + itemStocks[]) */
function mapItemsApiToSlotRow(
  item: Item,
  stockId: number,
  cabinetId: number,
  cabinetName: string | null,
  cabinetCode: string | null,
): ItemSlotInCabinetRow | null {
  const code = item.itemcode?.trim();
  if (!code) return null;
  const stocks = item.itemStocks ?? [];
  let nearest: string | Date | null = null;
  let nearestMs = Infinity;
  for (const s of stocks) {
    if (!s.ExpireDate) continue;
    const t = new Date(s.ExpireDate).getTime();
    if (Number.isNaN(t)) continue;
    if (t < nearestMs) {
      nearestMs = t;
      nearest = s.ExpireDate;
    }
  }
  return {
    id: stableRfidSummaryRowId(stockId, code),
    itemcode: code,
    StockID: stockId,
    SlotNo: 0,
    Sensor: 0,
    Qty: stocks.length,
    nearestExpireDate: nearest,
    cabinet: {
      id: cabinetId,
      cabinet_name: cabinetName,
      cabinet_code: cabinetCode,
      stock_id: stockId,
    },
    item: {
      itemcode: code,
      itemname: item.itemname ?? null,
      Alternatename: item.Alternatename ?? null,
      Barcode: item.Barcode ?? null,
      stock_min: item.stock_min ?? null,
      stock_max: item.stock_max ?? null,
    },
    cabinetItemSetting: (() => {
      const cis =
        item.cabinetItemSetting ??
        (item as unknown as { cabinet_item_setting?: Item['cabinetItemSetting'] | null })
          .cabinet_item_setting;
      return cis
        ? {
            stock_min: cis.stock_min ?? null,
            stock_max: cis.stock_max ?? null,
          }
        : null;
    })(),
  };
}

export default function RfidStockTable({
  cabinetId,
  stockId,
  cabinetName,
  cabinetCode,
  appliedItemName,
  statusFilter,
  chipDefs,
  onStatusFilterChange,
  currentPage,
  itemsPerPage,
  onPageChange,
  onManage,
  resetExpandSignal,
  refetchSignal,
  onLoadingChange,
  onStatsChange,
}: RfidStockTableProps) {
  const [pageRows, setPageRows] = useState<ItemSlotInCabinetRow[]>([]);
  const [rfidByItemcode, setRfidByItemcode] = useState<Record<string, RfidStockLine[]>>({});
  const [serverTotal, setServerTotal] = useState(0);
  const [serverLastPage, setServerLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  const onLoadingChangeRef = useRef(onLoadingChange);
  const onStatsChangeRef = useRef(onStatsChange);
  onLoadingChangeRef.current = onLoadingChange;
  onStatsChangeRef.current = onStatsChange;

  useEffect(() => {
    setExpandedIds(new Set());
  }, [resetExpandSignal]);

  useEffect(() => {
    if (cabinetId == null || cabinetId <= 0 || stockId == null || stockId <= 0) {
      setPageRows([]);
      setRfidByItemcode({});
      setServerTotal(0);
      setServerLastPage(1);
      setLoading(false);
      onLoadingChangeRef.current?.(false);
      onStatsChangeRef.current?.({ systemTotal: 0, rawOnPage: 0, visibleCount: 0 });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        onLoadingChangeRef.current?.(true);
        const kw = appliedItemName.trim() || undefined;
        const res = await itemsApi.getAll({
          page: currentPage,
          limit: itemsPerPage,
          keyword: kw,
          cabinet_id: cabinetId,
          stock_status: statusFilter === 'all' ? undefined : statusFilter,
        });
        if (cancelled) return;

        const list = Array.isArray(res?.data) ? (res.data as Item[]) : [];
        if (res?.success === false && list.length === 0) {
          toast.error((res as { message?: string }).message ?? 'โหลดข้อมูลไม่สำเร็จ');
        }

        const mapped: ItemSlotInCabinetRow[] = [];
        const byCode: Record<string, RfidStockLine[]> = {};
        for (const it of list) {
          const slot = mapItemsApiToSlotRow(it, stockId, cabinetId, cabinetName, cabinetCode);
          if (slot) mapped.push(slot);
          const c = it.itemcode?.trim();
          if (c) {
            byCode[c] = (it.itemStocks ?? [])
              .filter((s) => String(s.RfidCode ?? '').trim().length > 0)
              .map((s) => ({
                rowId: Number(s.RowID ?? 0),
                rfidCode: String(s.RfidCode).trim(),
                expireDate: s.ExpireDate ?? null,
              }));
          }
        }

        setPageRows(mapped);
        setRfidByItemcode(byCode);
        const total = typeof res?.total === 'number' ? res.total : mapped.length;
        const last =
          typeof res?.lastPage === 'number' && res.lastPage >= 1
            ? res.lastPage
            : Math.max(1, Math.ceil(total / itemsPerPage) || 1);
        setServerTotal(total);
        setServerLastPage(last);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error('โหลดข้อมูลไม่สำเร็จ');
          setPageRows([]);
          setRfidByItemcode({});
          setServerTotal(0);
          setServerLastPage(1);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          onLoadingChangeRef.current?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    cabinetId,
    stockId,
    appliedItemName,
    refetchSignal,
    cabinetName,
    cabinetCode,
    currentPage,
    itemsPerPage,
    statusFilter,
  ]);

  const totalPages = serverLastPage;

  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  useEffect(() => {
    onStatsChangeRef.current?.({
      systemTotal: serverTotal,
      rawOnPage: pageRows.length,
      visibleCount: pageRows.length,
    });
  }, [serverTotal, pageRows.length]);

  const toggleExpand = (row: ItemSlotInCabinetRow) => {
    if (expandedIds.has(row.id)) {
      setExpandedIds((prev) => {
        const n = new Set(prev);
        n.delete(row.id);
        return n;
      });
      return;
    }
    setExpandedIds((prev) => new Set(prev).add(row.id));
  };

  if (cabinetId == null || cabinetId <= 0 || stockId == null || stockId <= 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        <Radio className="h-10 w-10 opacity-35" />
        <p>เลือกตู้ RFID เพื่อแสดงรายการ</p>
      </div>
    );
  }

  const chipsToolbar = (
    <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
      <StockStatusChips
        chipDefs={chipDefs}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
      />
    </div>
  );

  if (loading) {
    return (
      <div className={STOCK_TABLE_FRAME}>
        {chipsToolbar}
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p>กำลังโหลดรายการ...</p>
        </div>
      </div>
    );
  }

  if (pageRows.length === 0) {
    const filteredEmpty = statusFilter !== 'all';
    return (
      <>
        <div className={STOCK_TABLE_FRAME}>
          {chipsToolbar}
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
            <Radio className="h-10 w-10 opacity-35" />
            <p>{filteredEmpty ? 'ไม่มีรายการที่ตรงกับชิปสถานะ' : 'ไม่พบข้อมูลตามเงื่อนไข'}</p>
            <p className="text-xs">
              {filteredEmpty ? 'ลองเลือก &quot;ทั้งหมด&quot; หรือเปลี่ยนคำค้น' : 'ลองเปลี่ยนคำค้น'}
            </p>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="pt-5">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              loading={loading}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className={STOCK_TABLE_FRAME}>
        {chipsToolbar}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-11 min-w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ชื่ออุปกรณ์
                </TableHead>
                <TableHead className="min-w-[110px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  วันหมดอายุ
                </TableHead>
                <TableHead className="w-36 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  จำนวนคงเหลือ
                </TableHead>
                <TableHead className="w-[100px] text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  สถานะ
                </TableHead>
                <TableHead className="min-w-[140px] text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  รายละเอียด RFID
                </TableHead>
                <TableHead className="w-[100px] text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  จัดการ
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {pageRows.map((row) => {
              const name = row.item?.itemname || row.item?.Alternatename || '—';
              const { expired, soon, low } = rowFlags(row);
              const badge = rowBadge(row);
              const nameDateClass = expired
                ? 'text-red-600 font-medium'
                : soon
                  ? 'text-amber-700 font-medium'
                  : 'text-foreground font-medium';
              const warnQtyBelowMin = low;
              const open = expandedIds.has(row.id);
              const lines = rfidByItemcode[row.itemcode] ?? [];

              return (
                <Fragment key={row.id}>
                  <TableRow className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <TableCell className={cn('max-w-[260px] truncate', nameDateClass)} title={name}>
                      {name}
                    </TableCell>
                    <TableCell className={cn('tabular-nums', nameDateClass)}>
                      {formatYmd(row.nearestExpireDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center justify-end gap-1.5 font-medium">
                        {warnQtyBelowMin && (
                          <span className="inline-flex shrink-0" title="จำนวนต่ำกว่า Min">
                            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                          </span>
                        )}
                        {row.Qty}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                          badge.className,
                        )}
                      >
                        {badge.key}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => toggleExpand(row)}
                      >
                        {open ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            ซ่อน
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            RFID
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={!row.cabinet?.id}
                        onClick={() => onManage(row)}
                        title={!row.cabinet?.id ? 'ไม่มีข้อมูลตู้' : 'ตั้งค่า Min/Max ต่อตู้'}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        จัดการ
                      </Button>
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableCell colSpan={6} className="border-b border-border/60 bg-muted/25 p-0">
                        <div className="px-4 py-4 sm:px-5">
                          {lines.length === 0 ? (
                            <p className="text-sm text-muted-foreground">ไม่พบแท็ก RFID ใน itemstock</p>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                รายการ RFID ({lines.length})
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-slate-200/80 bg-white shadow-sm">
                                <table className="w-full table-fixed border-collapse text-sm">
                                  <colgroup>
                                    <col className="w-[52%]" />
                                    <col className="w-[28%]" />
                                    <col className="w-[20%]" />
                                  </colgroup>
                                  <thead>
                                    <tr className="border-b border-slate-200/80 bg-slate-50/90">
                                      <th className="h-10 min-w-0 px-3 py-2 text-left align-middle text-xs font-semibold text-gray-500">
                                        รหัส RFID
                                      </th>
                                      <th className="h-10 px-3 py-2 text-left align-middle text-xs font-semibold text-gray-500">
                                        วันหมดอายุ
                                      </th>
                                      <th className="h-10 px-3 py-2 text-center align-middle text-xs font-semibold text-gray-500">
                                        สถานะ
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lines.map((line) => {
                                      const lb = rfidLineBadge(line.expireDate);
                                      const expCls =
                                        lb.key === 'EXPIRED'
                                          ? 'text-red-600 font-medium'
                                          : lb.key === 'SOON'
                                            ? 'text-amber-700 font-medium'
                                            : 'text-gray-900';
                                      return (
                                        <tr
                                          key={`${line.rowId}-${line.rfidCode}`}
                                          className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/80"
                                        >
                                          <td className="min-w-0 px-3 py-2.5 align-middle font-mono text-xs leading-relaxed text-gray-900 break-all">
                                            {line.rfidCode}
                                          </td>
                                          <td
                                            className={cn(
                                              'min-w-0 px-3 py-2.5 align-middle text-sm tabular-nums',
                                              expCls,
                                            )}
                                          >
                                            {formatYmd(line.expireDate)}
                                          </td>
                                          <td className="min-w-0 px-3 py-2.5 align-middle text-center">
                                            <span
                                              className={cn(
                                                'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                                                lb.className,
                                              )}
                                            >
                                              {lb.key}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            </TableBody>
          </Table>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="pt-5">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            loading={loading}
          />
        </div>
      )}
    </>
  );
}
