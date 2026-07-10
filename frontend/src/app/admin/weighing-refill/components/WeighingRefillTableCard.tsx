'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Pagination from '@/components/Pagination';
import {
  StockMobileCard,
  StockMobileCardHeader,
  StockMobileCardList,
  StockMobileCardMeta,
  StockMobileCardQty,
  StockMobileCardRow,
} from '../../items-stock/components/ItemsStockMobileCards';
import WeighingRefillFiltersToolbar, {
  WeighingRefillReportDownloadButtons,
} from './WeighingRefillFiltersCard';
import { formatWeighingDispenseDate } from '../../weighing-dispense/components/formatWeighingDispenseDate';
import type { CabinetStockTableMode } from '../../items-stock/components/CabinetStockTabs';
import type { RfidReturnedListRow, WeighingRefillDetailRow } from './types';

function weighingRefillCabinetLabel(row: WeighingRefillDetailRow, fallback: string | null | undefined): string {
  const c = row.itemSlotInCabinet?.cabinet;
  const name = (c?.cabinet_name ?? '').trim();
  const code = (c?.cabinet_code ?? '').trim();
  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;
  const fb = (fallback ?? '').trim();
  return fb || '—';
}

function rfidReturnedCabinetLabel(row: RfidReturnedListRow): string {
  const name = (row.cabinetName ?? '').trim();
  const code = (row.cabinetCode ?? '').trim();
  if (name && code) return `${name} (${code})`;
  return name || code || '—';
}

function weighingOperatorLabel(row: WeighingRefillDetailRow): string {
  const emp = row.userCabinet?.legacyUser?.employee;
  if (!emp) return '—';
  return [emp.FirstName, emp.LastName].filter(Boolean).join(' ') || '—';
}

interface WeighingRefillTableCardProps {
  tableMode: CabinetStockTableMode;
  loading: boolean;
  items: (WeighingRefillDetailRow | RfidReturnedListRow)[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  exportLoading: 'excel' | 'pdf' | null;
  combinedExcelLoading?: boolean;
  onDownloadRefillAllExcel?: () => void;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
  cabinetDisplayFallback?: string | null;
  emptyHint?: string | null;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  hasActiveFilters: boolean;
  onSearch: () => void;
  onClear: () => void;
}

export default function WeighingRefillTableCard({
  tableMode,
  loading,
  items,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  onPageChange,
  exportLoading,
  combinedExcelLoading = false,
  onDownloadRefillAllExcel,
  onDownloadExcel,
  onDownloadPdf,
  cabinetDisplayFallback,
  emptyHint,
  searchTerm,
  onSearchTermChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  hasActiveFilters,
  onSearch,
  onClear,
}: WeighingRefillTableCardProps) {
  const tabDescription =
    tableMode === 'WEIGHING'
      ? ''
      : 'รายการเติมเข้าตู้ RFID ตามตู้ที่เลือก';

  const toolbar = (
    <WeighingRefillFiltersToolbar
      searchTerm={searchTerm}
      onSearchTermChange={onSearchTermChange}
      dateFrom={dateFrom}
      onDateFromChange={onDateFromChange}
      dateTo={dateTo}
      onDateToChange={onDateToChange}
      loading={loading}
      hasActiveFilters={hasActiveFilters}
      onSearch={onSearch}
      onClear={onClear}
      reportActions={
        <WeighingRefillReportDownloadButtons
          exportLoading={exportLoading}
          combinedExcelLoading={combinedExcelLoading}
          showCombined={Boolean(onDownloadRefillAllExcel)}
          onDownloadExcel={onDownloadExcel}
          onDownloadPdf={onDownloadPdf}
          onDownloadRefillAllExcel={onDownloadRefillAllExcel}
        />
      }
    />
  );

  return (
    <Card className="gap-0 overflow-hidden border-gray-200/80 py-0 shadow-sm">
      <CardHeader className="space-y-1 border-b bg-slate-50/50 px-3 py-3 sm:px-5 sm:py-3">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-lg leading-tight">
            {tableMode === 'RFID' ? 'รายการเติมเข้าตู้ (RFID)' : 'รายการเติมเข้าตู้ (Weighing)'}
          </CardTitle>
          {tabDescription ? <p className="text-sm text-muted-foreground">{tabDescription}</p> : null}
          <p className="text-sm text-muted-foreground">ทั้งหมด {totalItems} รายการ</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        <div className="border-b border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:px-5 sm:py-3">
          {toolbar}
        </div>

        {emptyHint ? (
          <div className="px-3 py-12 text-center text-sm text-muted-foreground sm:px-5">{emptyHint}</div>
        ) : loading ? (
          <div className="px-3 py-12 text-center text-muted-foreground sm:px-5">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-12 text-center text-muted-foreground sm:px-5">ไม่พบข้อมูล</div>
        ) : (
          <>
            <StockMobileCardList>
              {tableMode === 'WEIGHING' &&
                (items as WeighingRefillDetailRow[]).map((row, index) => {
                  const seq = (currentPage - 1) * itemsPerPage + index + 1;
                  const name = row.item?.itemname || row.item?.Alternatename || '—';
                  const cabinet = weighingRefillCabinetLabel(row, cabinetDisplayFallback);
                  const operator = weighingOperatorLabel(row);
                  const dateText = formatWeighingDispenseDate(row.ModifyDate);

                  return (
                    <StockMobileCard key={`w-m-${row.id}-${index}`}>
                      <StockMobileCardRow>
                        <div className="min-w-0 flex-1">
                          <StockMobileCardHeader seq={seq} title={name} />
                          <StockMobileCardMeta>
                            {cabinet}
                            <span className="mx-1 text-slate-300">·</span>
                            {operator}
                          </StockMobileCardMeta>
                          <StockMobileCardMeta className="text-foreground/80">{dateText}</StockMobileCardMeta>
                        </div>
                        <StockMobileCardQty label="จำนวน" value={row.Qty ?? 0} />
                      </StockMobileCardRow>
                    </StockMobileCard>
                  );
                })}
              {tableMode === 'RFID' &&
                (items as RfidReturnedListRow[]).map((row, index) => {
                  const seq = (currentPage - 1) * itemsPerPage + index + 1;
                  const name = row.itemname || '—';
                  const cabinet = rfidReturnedCabinetLabel(row);
                  const operator = row.cabinetUserName?.trim() || '—';
                  const dateText = formatWeighingDispenseDate(row.modifyDate);
                  const rfid = row.RfidCode?.trim() || '—';

                  return (
                    <StockMobileCard key={`r-m-${row.RowID}-${index}`}>
                      <StockMobileCardRow>
                        <div className="min-w-0 flex-1">
                          <StockMobileCardHeader seq={seq} title={name} />
                          <StockMobileCardMeta>
                            {cabinet}
                            <span className="mx-1 text-slate-300">·</span>
                            {operator}
                          </StockMobileCardMeta>
                          <StockMobileCardMeta className="font-mono text-[11px]">{rfid}</StockMobileCardMeta>
                          <StockMobileCardMeta className="text-foreground/80">{dateText}</StockMobileCardMeta>
                        </div>
                        <StockMobileCardQty label="จำนวน" value={row.qty ?? 0} />
                      </StockMobileCardRow>
                    </StockMobileCard>
                  );
                })}
            </StockMobileCardList>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
                    <TableHead className="h-11 w-14 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ลำดับ
                    </TableHead>
                    <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      อุปกรณ์
                    </TableHead>
                    <TableHead className="min-w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ตู้
                    </TableHead>
                    {tableMode === 'RFID' && (
                      <TableHead className="min-w-[140px] font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        รหัส RFID
                      </TableHead>
                    )}
                    <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ผู้ดำเนินการ
                    </TableHead>
                    <TableHead className="w-20 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      จำนวน
                    </TableHead>
                    <TableHead className="min-w-[140px] text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      วันที่แก้ไข
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableMode === 'WEIGHING' &&
                    (items as WeighingRefillDetailRow[]).map((row, index) => (
                      <TableRow key={`w-${row.id}-${index}`} className="border-b border-border/50 hover:bg-muted/40">
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-medium" title={row.item?.itemname ?? undefined}>
                          {row.item?.itemname || row.item?.Alternatename || '—'}
                        </TableCell>
                        <TableCell
                          className="max-w-[180px] truncate text-sm text-gray-700"
                          title={weighingRefillCabinetLabel(row, cabinetDisplayFallback)}
                        >
                          {weighingRefillCabinetLabel(row, cabinetDisplayFallback)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{weighingOperatorLabel(row)}</TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{row.Qty}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {formatWeighingDispenseDate(row.ModifyDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {tableMode === 'RFID' &&
                    (items as RfidReturnedListRow[]).map((row, index) => (
                      <TableRow key={`r-${row.RowID}-${index}`} className="border-b border-border/50 hover:bg-muted/40">
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-medium" title={row.itemname}>
                          {row.itemname || '—'}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-gray-700" title={rfidReturnedCabinetLabel(row)}>
                          {rfidReturnedCabinetLabel(row)}
                        </TableCell>
                        <TableCell
                          className="max-w-[180px] truncate font-mono text-xs text-gray-700"
                          title={row.RfidCode ?? undefined}
                        >
                          {row.RfidCode || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{row.cabinetUserName?.trim() || '—'}</TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{row.qty}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                          {formatWeighingDispenseDate(row.modifyDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="px-3 pt-2 sm:px-5 sm:pt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                  loading={loading}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
