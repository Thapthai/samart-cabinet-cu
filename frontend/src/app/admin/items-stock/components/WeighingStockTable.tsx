'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, PackageSearch } from 'lucide-react';
import Pagination from '@/components/Pagination';
import StockStatusChips, { type StockStatusChipDef } from './StockStatusChips';
import type { StockStatusFilter } from '../items-stock-shared';
import { STOCK_TABLE_FRAME } from '../items-stock-shared';
import WeighingStockLowRowsTable from './WeighingStockLowRowsTable';
import WeighingStockRowsTable from './WeighingStockRowsTable';
import { fetchWeighingItemSlots, type WeighingRow } from './weighingStockFetch';

export interface WeighingListStats {
  systemTotal: number;
  rawOnPage: number;
  visibleCount: number;
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
  refetchSignal: number;
  onLoadingChange?: (loading: boolean) => void;
  onStatsChange?: (stats: WeighingListStats) => void;
  /** ปุ่มรายงาน — แสดงในแถบเดียวกับ «กรองสถานะในหน้านี้» */
  reportToolbar?: ReactNode;
  /** คอลัมน์จัดการ — Min/Max ต่อตู้ */
  onManage?: (row: WeighingRow) => void;
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
  refetchSignal,
  onLoadingChange,
  onStatsChange,
  reportToolbar,
  onManage,
}: WeighingStockTableProps) {
  const [rawRows, setRawRows] = useState<WeighingRow[]>([]);
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
        reportActions={reportToolbar}
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
        {statusFilter === 'low' ? (
          <WeighingStockLowRowsTable rows={rawRows} currentPage={currentPage} itemsPerPage={itemsPerPage} />
        ) : (
          <WeighingStockRowsTable
            rows={rawRows}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onManage={onManage}
          />
        )}
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
