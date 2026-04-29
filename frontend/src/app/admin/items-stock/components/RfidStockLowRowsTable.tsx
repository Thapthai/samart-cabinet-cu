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
  rfidLineBadge,
  rowBadge,
  rowFlags,
} from '../items-stock-shared';

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
    <div className="overflow-x-auto">
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
                        {lines.length === 0 ? (
                          <p className="text-sm text-muted-foreground">ไม่พบแท็ก RFID ใน itemstock</p>
                        ) : filteredLines.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            ไม่มีแท็ก RFID ที่ตรงกับชิปสถานะหรือช่วงวันหมดอายุที่กรอง
                            {lines.length > 0 ? ` (ทั้งหมด ${lines.length} แท็ก)` : ''}
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              รายการ RFID ({filteredLines.length}
                              {filteredLines.length !== lines.length ? ` / ${lines.length}` : ''})
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
                                      วันหมดอายุ / เหลือ
                                    </th>
                                    <th className="h-10 px-3 py-2 text-center align-middle text-xs font-semibold text-gray-500">
                                      สถานะ
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredLines.map((line) => {
                                    const lb = rfidLineBadge(line.expireDate);
                                    const rel = formatExpireRelativeLabel(line.expireDate);
                                    const expCls =
                                      lb.key === 'EXPIRED'
                                        ? 'text-red-600 font-medium'
                                        : lb.key === 'SOON'
                                          ? 'text-amber-700 font-medium'
                                          : 'text-gray-900';
                                    const relCls =
                                      lb.key === 'EXPIRED'
                                        ? 'text-red-600/90'
                                        : lb.key === 'SOON'
                                          ? 'text-amber-700/85'
                                          : 'text-gray-500';
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
                                          <div className="flex flex-col gap-0.5">
                                            <span>{formatYmd(line.expireDate)}</span>
                                            {rel && (
                                              <span className={cn('text-xs font-normal', relCls)}>{rel}</span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="min-w-0 px-3 py-2.5 align-middle text-center">
                                          <span
                                            className={cn(
                                              'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                                              lb.className,
                                            )}
                                          >
                                            {itemsStockStatusKeyLabelTh(lb.key)}
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
  );
}
