'use client';

import { AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StockStatusFilter } from '../items-stock-shared';
import { rowFlags, weighingRefillQuantity } from '../items-stock-shared';
import type { WeighingRow } from './weighingStockFetch';

export interface WeighingStockRowsTableProps {
  rows: WeighingRow[];
  statusFilter: StockStatusFilter;
  currentPage: number;
  itemsPerPage: number;
}

/** ตาราง Weighing: ลำดับ, ชื่ออุปกรณ์, คงเหลือ, ต้องเติม */
export default function WeighingStockRowsTable({
  rows,
  statusFilter,
  currentPage,
  itemsPerPage,
}: WeighingStockRowsTableProps) {
  return (
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
            <TableHead className="w-28 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              คงเหลือ
            </TableHead>
            <TableHead className="w-28 text-right text-xs font-semibold uppercase tracking-wide text-amber-900">
              ต้องเติม
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const name = row.item?.itemname || row.item?.Alternatename || '—';
            const { low } = rowFlags(row);
            const refill =
              row.refillQuantity !== undefined && row.refillQuantity !== null
                ? row.refillQuantity
                : weighingRefillQuantity(row);
            return (
              <TableRow key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                <TableCell className="text-center text-muted-foreground tabular-nums">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell className="max-w-[280px] truncate font-medium text-foreground" title={name}>
                  {name}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {(statusFilter === 'low' || low) && (
                      <span className="inline-flex shrink-0" title="จำนวนต่ำกว่า Min">
                        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                      </span>
                    )}
                    {row.Qty}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold text-amber-900">
                  {refill != null ? refill : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
