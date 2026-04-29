'use client';

import { AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { WeighingRow } from './weighingStockFetch';
import { WeighingSlotPill } from './WeighingSlotPill';

export interface WeighingStockLowRowsTableProps {
  rows: WeighingRow[];
  currentPage: number;
  itemsPerPage: number;
}

/** ตาราง Weighing เฉพาะชิปสต็อกต่ำ — ไม่มีคอลัมน์จัดการ (แยกจากโหมดทั่วไป) */
export default function WeighingStockLowRowsTable({
  rows,
  currentPage,
  itemsPerPage,
}: WeighingStockLowRowsTableProps) {
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
            <TableHead className="w-20 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              ช่อง
            </TableHead>
            <TableHead className="w-24 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              สล็อต
            </TableHead>
            <TableHead className="w-28 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              จำนวน
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const name = row.item?.itemname || row.item?.Alternatename || '—';
            const channel = row.SlotNo != null ? String(row.SlotNo) : '—';
            return (
              <TableRow key={row.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                <TableCell className="text-center text-muted-foreground tabular-nums">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell className="max-w-[280px] truncate font-medium text-foreground" title={name}>
                  {name}
                </TableCell>
                <TableCell className="text-center tabular-nums text-sm text-muted-foreground">{channel}</TableCell>
                <TableCell className="text-center">
                  <WeighingSlotPill sensor={row.Sensor} />
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    <span className="inline-flex shrink-0" title="สต็อกต่ำ">
                      <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                    </span>
                    {row.Qty}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
