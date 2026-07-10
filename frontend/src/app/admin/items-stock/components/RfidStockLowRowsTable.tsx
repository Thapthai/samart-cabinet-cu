'use client';

import { Fragment } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ItemSlotInCabinetRow, RfidStockLine } from '../items-stock-shared';
import {
  filterRfidStockLinesForToolbar,
  formatExpireRelativeLabel,
  formatYmd,
  itemsStockStatusKeyLabelTh,
  rowBadge,
  rowFlags,
} from '../items-stock-shared';
import { RfidTagLinesPanel } from './ItemsStockMobileCards';
import RfidStockMobileCardList from './RfidStockMobileCardList';

export interface RfidStockLowRowsTableProps {
  pageRows: ItemSlotInCabinetRow[];
  currentPage: number;
  itemsPerPage: number;
  rfidByItemcode: Record<string, RfidStockLine[]>;
  toolbarExpireRange: { expire_from?: string; expire_to?: string };
  expandedIds: Set<number>;
  onToggleExpand: (row: ItemSlotInCabinetRow) => void;
}

/** ตาราง RFID เฉพาะชิปสต็อกต่ำ — ไม่มีคอลัมน์จัดการ (แยกจากโหมดทั่วไป) */
export default function RfidStockLowRowsTable({
  pageRows,
  currentPage,
  itemsPerPage,
  rfidByItemcode,
  toolbarExpireRange,
  expandedIds,
  onToggleExpand,
}: RfidStockLowRowsTableProps) {
  return (
    <>
      <RfidStockMobileCardList
        pageRows={pageRows}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        statusFilter="low"
        showSequence
      />

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
              <TableHead className="h-11 w-14 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ลำดับ
              </TableHead>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, index) => {
              const name = row.item?.itemname || row.item?.Alternatename || '—';
              const { expired, soon, low } = rowFlags(row);
              const expireRel = formatExpireRelativeLabel(row.nearestExpireDate);
              const badge = rowBadge(row);
              const nameDateClass = expired
                ? 'text-red-600 font-medium'
                : soon
                  ? 'text-amber-700 font-medium'
                  : 'text-foreground font-medium';
              const warnQtyBelowMin = low;
              const open = expandedIds.has(row.id);
              const lines = rfidByItemcode[row.itemcode] ?? [];
              const filteredLines = filterRfidStockLinesForToolbar(lines, 'low', toolbarExpireRange);
              const seq = (currentPage - 1) * itemsPerPage + index + 1;

              return (
                <Fragment key={row.id}>
                  <TableRow className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <TableCell className="text-center text-muted-foreground tabular-nums text-sm">{seq}</TableCell>
                    <TableCell className={cn('max-w-[260px] truncate', nameDateClass)} title={name}>
                      {name}
                    </TableCell>
                    <TableCell className={cn('tabular-nums', nameDateClass)}>
                      <div className="flex flex-col gap-0.5">
                        <span>{formatYmd(row.nearestExpireDate)}</span>
                        {expireRel && (
                          <span
                            className={cn(
                              'text-xs font-normal',
                              expired
                                ? 'text-red-600/90'
                                : soon
                                  ? 'text-amber-700/85'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {expireRel}
                          </span>
                        )}
                      </div>
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
                        {itemsStockStatusKeyLabelTh(badge.key)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => onToggleExpand(row)}
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
                  </TableRow>
                  {open && (
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableCell colSpan={6} className="border-b border-border/60 bg-muted/25 p-0">
                        <div className="px-4 py-4 sm:px-5">
                          <RfidTagLinesPanel lines={lines} filteredLines={filteredLines} />
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
    </>
  );
}
