'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, PackageSearch, Settings2 } from 'lucide-react';
import { weighingApi } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/Pagination';
import StockStatusChips, { type StockStatusChipDef } from './StockStatusChips';
import type { ItemSlotInCabinetRow, StockStatusFilter } from '../items-stock-shared';
import { rowFlags, STOCK_TABLE_FRAME } from '../items-stock-shared';
import { WeighingSlotPill } from './WeighingSlotPill';

export interface WeighingListStats {
  systemTotal: number;
  rawOnPage: number;
  visibleCount: number;
}

/** WEIGHING: ItemSlotInCabinet ผ่าน GET /weighing เท่านั้น */
async function fetchWeighingItemSlots(params: {
  stockId: number;
  page: number;
  limit: number;
  itemName?: string;
  stock_status?: string;
}) {
  return weighingApi.getAll({
    page: params.page,
    limit: params.limit,
    itemName: params.itemName,
    stockId: params.stockId,
    stock_status: params.stock_status,
  });
}

interface WeighingStockTableProps {
  stockId: number | null;
  appliedItemName: string;
  statusFilter: StockStatusFilter;
  chipDefs: StockStatusChipDef[];
  onStatusFilterChange: (value: StockStatusFilter) => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onManage: (row: ItemSlotInCabinetRow) => void;
  refetchSignal: number;
  onLoadingChange?: (loading: boolean) => void;
  onStatsChange?: (stats: WeighingListStats) => void;
}

export default function WeighingStockTable({
  stockId,
  appliedItemName,
  statusFilter,
  chipDefs,
  onStatusFilterChange,
  currentPage,
  itemsPerPage,
  onPageChange,
  onManage,
  refetchSignal,
  onLoadingChange,
  onStatsChange,
}: WeighingStockTableProps) {
  const [rawRows, setRawRows] = useState<ItemSlotInCabinetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [systemTotal, setSystemTotal] = useState(0);

  const onLoadingChangeRef = useRef(onLoadingChange);
  const onStatsChangeRef = useRef(onStatsChange);
  onLoadingChangeRef.current = onLoadingChange;
  onStatsChangeRef.current = onStatsChange;

  useEffect(() => {
    if (stockId == null || stockId <= 0) {
      setRawRows([]);
      setTotalPages(1);
      setSystemTotal(0);
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
        const res = await fetchWeighingItemSlots({
          stockId,
          page: currentPage,
          limit: itemsPerPage,
          itemName: appliedItemName.trim() || undefined,
          stock_status: statusFilter === 'all' ? undefined : statusFilter,
        });
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setRawRows(res.data);
          const total = res.pagination?.total ?? res.data.length;
          setSystemTotal(total);
          setTotalPages(res.pagination?.totalPages ?? 1);
        } else {
          setRawRows([]);
          setSystemTotal(0);
          setTotalPages(1);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error('โหลดข้อมูลไม่สำเร็จ');
          setRawRows([]);
          setSystemTotal(0);
          setTotalPages(1);
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
  }, [stockId, appliedItemName, currentPage, itemsPerPage, refetchSignal, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  useEffect(() => {
    onStatsChangeRef.current?.({
      systemTotal,
      rawOnPage: rawRows.length,
      visibleCount: rawRows.length,
    });
  }, [systemTotal, rawRows.length]);

  if (stockId == null || stockId <= 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        <PackageSearch className="h-10 w-10 opacity-35" />
        <p>เลือกตู้ที่มี stock เพื่อแสดงรายการช่องชั่ง</p>
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

  if (rawRows.length === 0) {
    const filteredEmpty = statusFilter !== 'all';
    return (
      <>
        <div className={STOCK_TABLE_FRAME}>
          {chipsToolbar}
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
            <PackageSearch className="h-10 w-10 opacity-35" />
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
                <TableHead className="h-11 w-14 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ลำดับ
                </TableHead>
                <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ชื่ออุปกรณ์
                </TableHead>
                <TableHead className="w-20 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ช่อง
                </TableHead>
                <TableHead className="w-24 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  สล็อต
                </TableHead>
                <TableHead className="w-28 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  จำนวน
                </TableHead>
                <TableHead className="w-[110px] text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  จัดการ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rawRows.map((row, index) => {
                const name = row.item?.itemname || row.item?.Alternatename || '—';
                const { low } = rowFlags(row);
                return (
                  <TableRow key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <TableCell className="text-center text-muted-foreground tabular-nums">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate font-medium text-foreground" title={name}>
                      {name}
                    </TableCell>
                    <TableCell className="text-center">{row.SlotNo ?? '—'}</TableCell>
                    <TableCell className="text-center">
                      <WeighingSlotPill sensor={row.Sensor} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      <span className="inline-flex items-center justify-end gap-1.5">
                        {low && (
                          <span className="inline-flex shrink-0" title="จำนวนต่ำกว่า Min">
                            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                          </span>
                        )}
                        {row.Qty}
                      </span>
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
