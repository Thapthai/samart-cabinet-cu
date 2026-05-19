import { Download, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DispensedPagination from '../../dispense-from-cabinet/components/DispensedPagination';
import type { DispensedItem } from '../../dispense-from-cabinet/types';
import { formatThaiDateTime } from '@/lib/formatThaiDateTime';

 
interface ReturnedTableProps {
  loading: boolean;
  items: DispensedItem[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  searchItemCode: string;
  itemTypeFilter: string;
  onPageChange: (page: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export default function ReturnedTable({
  loading,
  items,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  searchItemCode,
  itemTypeFilter,
  onPageChange,
  onExportExcel,
  onExportPdf,
}: ReturnedTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>รายการเติมอุปกรณ์เข้าตู้</CardTitle>
            <CardDescription>
              รายการอุปกรณ์ทั้งหมดที่คืนเข้าตู้ SmartCabinet
              {(searchItemCode || itemTypeFilter !== 'all') && ' (กรองแล้ว)'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onExportExcel}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={onExportPdf}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">ไม่พบรายการเติมมอุปกรณ์เข้าตู้</p>
            <p className="text-sm text-gray-400 mt-2">กรุณาตรวจสอบว่ามีข้อมูลในระบบ</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ลำดับ</TableHead>
                    <TableHead>ชื่ออุปกรณ์</TableHead>
                    <TableHead>ชื่อผู้เติม</TableHead>
                    <TableHead className="text-right">จำนวนคืน</TableHead>
                    <TableHead>วันที่</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow
                      key={item.RowID}
                      className="hover:bg-green-50 transition-colors"
                    >
                      <TableCell className="text-center text-gray-500">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.itemname || '-'}</TableCell>
                      <TableCell>{item.cabinetUserName || 'ไม่ระบุ'}</TableCell>
                      <TableCell className="text-right font-medium">{item.qty || 0}</TableCell>
                      <TableCell>
                        {formatThaiDateTime(item.modifyDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DispensedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
