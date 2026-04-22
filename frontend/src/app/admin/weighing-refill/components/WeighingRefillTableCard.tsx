import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/Pagination';
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
}: WeighingRefillTableCardProps) {
  const tabDescription =
    tableMode === 'WEIGHING'
      ? 'รายการเติมเข้าตู้ Weighing (รายละเอียด Slot, Sign = +)'
      : 'รายการคืนเข้าตู้ RFID (IsStock ในตู้, มีรหัส RFID) ตามตู้ที่เลือก';

  return (
    <Card className="shadow-sm border-gray-200/80 overflow-hidden">
      <CardHeader className="space-y-2 border-b bg-slate-50/50 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-lg leading-tight">
              {tableMode === 'RFID' ? 'รายการคืนเข้าตู้ (RFID)' : 'รายการเติมเข้าตู้ (Weighing)'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{tabDescription}</p>
            <p className="text-sm text-muted-foreground">ทั้งหมด {totalItems} รายการ</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadExcel}
              disabled={exportLoading !== null || combinedExcelLoading}
              className="shadow-sm"
            >
              <Download className="h-4 w-4 mr-1.5" />
              {exportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadPdf}
              disabled={exportLoading !== null || combinedExcelLoading}
              className="shadow-sm"
            >
              <Download className="h-4 w-4 mr-1.5" />
              {exportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
            </Button>
            {onDownloadRefillAllExcel ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownloadRefillAllExcel}
                disabled={exportLoading !== null || combinedExcelLoading}
                className="shadow-sm whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-1.5" />
                {combinedExcelLoading ? 'กำลังโหลด...' : 'Excel รวม'}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {emptyHint ? (
          <div className="py-12 text-center text-muted-foreground text-sm">{emptyHint}</div>
        ) : loading ? (
          <div className="py-12 text-center text-muted-foreground">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">ไม่พบข้อมูล</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 border-b">
                    <TableHead className="w-14 text-center font-semibold">ลำดับ</TableHead>
                    <TableHead className="min-w-[160px] font-semibold">ชื่อสินค้า</TableHead>
                    <TableHead className="min-w-[140px] font-semibold">ตู้</TableHead>
                    {tableMode === 'RFID' && (
                      <TableHead className="min-w-[140px] font-mono text-xs font-semibold">รหัส RFID</TableHead>
                    )}
                    <TableHead className="min-w-[120px] font-semibold">ผู้ดำเนินการ</TableHead>
                    <TableHead className="w-20 text-center font-semibold">จำนวน</TableHead>
                    <TableHead className="min-w-[140px] text-right font-semibold">วันที่แก้ไข</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableMode === 'WEIGHING' &&
                    (items as WeighingRefillDetailRow[]).map((row, index) => (
                      <TableRow key={`w-${row.id}-${index}`} className="hover:bg-slate-50/80">
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-medium" title={row.item?.itemname ?? undefined}>
                          {row.item?.itemname || row.item?.Alternatename || '-'}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-gray-700" title={weighingRefillCabinetLabel(row, cabinetDisplayFallback)}>
                          {weighingRefillCabinetLabel(row, cabinetDisplayFallback)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {row.userCabinet?.legacyUser?.employee
                            ? [row.userCabinet.legacyUser.employee.FirstName, row.userCabinet.legacyUser.employee.LastName]
                                .filter(Boolean)
                                .join(' ') || '-'
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{row.Qty}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                          {formatWeighingDispenseDate(row.ModifyDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {tableMode === 'RFID' &&
                    (items as RfidReturnedListRow[]).map((row, index) => (
                      <TableRow key={`r-${row.RowID}-${index}`} className="hover:bg-slate-50/80">
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate font-medium" title={row.itemname}>
                          {row.itemname || '-'}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-gray-700" title={rfidReturnedCabinetLabel(row)}>
                          {rfidReturnedCabinetLabel(row)}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate font-mono text-xs text-gray-700" title={row.RfidCode ?? undefined}>
                          {row.RfidCode || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{row.cabinetUserName?.trim() || '—'}</TableCell>
                        <TableCell className="text-center tabular-nums font-medium">{row.qty}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                          {formatWeighingDispenseDate(row.modifyDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="pt-4">
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
