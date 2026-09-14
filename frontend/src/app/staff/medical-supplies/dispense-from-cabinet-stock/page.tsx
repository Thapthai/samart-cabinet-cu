'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Package, Search, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { medicalSuppliesApi } from '@/lib/api';
import { toast } from 'sonner';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface ItemStock {
  RowID: number;
  ItemCode: string;
  itemcode: string;
  itemname: string;
  RfidCode: string;
  Qty: number;
  StockID?: number; // Optional - ไม่แสดงในตาราง แต่ยังคงส่งจาก backend
  LastCabinetModify: string;
  CreateDate: string;
  itemType: string;
  itemtypeID: number;
}

export default function DispenseFromCabinetStockPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [itemStocks, setItemStocks] = useState<ItemStock[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [itemCode, setItemCode] = useState('');
  const [rfidCode, setRfidCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchItemStocks();
  }, [page, itemCode, rfidCode, startDate, endDate]);

  const fetchItemStocks = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page,
        limit,
      };
      if (itemCode) filters.itemCode = itemCode;
      if (rfidCode) filters.rfidCode = rfidCode;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const result: any = await medicalSuppliesApi.getItemStocksForDispenseFromCabinet(filters);
      
      if (result.success) {
        setItemStocks(result.data || []);
        setTotal(result.total || 0);
        setTotalPages(result.totalPages || 0);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedRowIds.length === itemStocks.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(itemStocks.map(item => item.RowID));
    }
  };

  const handleSelectItem = (rowId: number) => {
    if (selectedRowIds.includes(rowId)) {
      setSelectedRowIds(selectedRowIds.filter(id => id !== rowId));
    } else {
      setSelectedRowIds([...selectedRowIds, rowId]);
    }
  };

  const handleDispenseFromCabinet = async () => {
    if (selectedRowIds.length === 0) {
      toast.error('กรุณาเลือกรายการที่ต้องการเบิกจากตู้');
      return;
    }

    try {
      setLoading(true);
      const result: any = await medicalSuppliesApi.dispenseItemsFromCabinet(selectedRowIds);
      
      if (result.success) {
        toast.success(result.message || `เบิกอุปกรณ์จากตู้สำเร็จ ${result.updatedCount} รายการ`);
        setSelectedRowIds([]);
        fetchItemStocks();
      } else {
        toast.error(result.error || 'ไม่สามารถเบิกอุปกรณ์จากตู้ได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setItemCode('');
    setRfidCode('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">เบิกอุปกรณ์จากตู้</h1>
              <p className="text-muted-foreground mt-2">
                เลือกรายการอุปกรณ์ เพื่อเบิกจากตู้ (เปลี่ยน StockID เป็น 0)
              </p>
            </div>
            <div className="flex gap-2">
              {selectedRowIds.length > 0 && (
                <Button
                  onClick={handleDispenseFromCabinet}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Package className="mr-2 h-4 w-4" />
                  เบิกจากตู้ ({selectedRowIds.length} รายการ)
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ค้นหาและกรองข้อมูล</CardTitle>
              <CardDescription>กรองรายการอุปกรณ์</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemCode">รหัสอุปกรณ์</Label>
                  <Input
                    id="itemCode"
                    placeholder="รหัสอุปกรณ์"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfidCode">RFID Code</Label>
                  <Input
                    id="rfidCode"
                    placeholder="RFID Code"
                    value={rfidCode}
                    onChange={(e) => setRfidCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                  <ExpireDateInput
                    id="startDate"
                    value={startDate}
                    onChange={(ymd) => setStartDate(ymd)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                  <ExpireDateInput
                    id="endDate"
                    value={endDate}
                    onChange={(ymd) => setEndDate(ymd)}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={fetchItemStocks} disabled={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  ค้นหา
                </Button>
                <Button variant="outline" onClick={handleResetFilters}>
                  รีเซ็ต
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>รายการอุปกรณ์ที่ </CardTitle>
                  <CardDescription>
                    ทั้งหมด {total} รายการ (หน้า {page} จาก {totalPages})
                  </CardDescription>
                </div>
                {itemStocks.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedRowIds.length === itemStocks.length ? (
                      <>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        ยกเลิกเลือกทั้งหมด
                      </>
                    ) : (
                      <>
                        <Square className="mr-2 h-4 w-4" />
                        เลือกทั้งหมด
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">กำลังโหลด...</div>
              ) : itemStocks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่พบข้อมูล
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <input
                              type="checkbox"
                              checked={selectedRowIds.length === itemStocks.length && itemStocks.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-gray-300"
                            />
                          </TableHead>
                          <TableHead>ลำดับ</TableHead>
                          {/* <TableHead>RowID</TableHead> */}
                          <TableHead>รหัสอุปกรณ์</TableHead>
                          <TableHead>ชื่ออุปกรณ์</TableHead>
                          <TableHead>RFID Code</TableHead>
                          <TableHead>จำนวน</TableHead>
                          <TableHead>ประเภท</TableHead>
                          <TableHead>วันที่แก้ไขล่าสุด</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemStocks.map((item, index) => (
                          <TableRow
                            key={item.RowID}
                            className={selectedRowIds.includes(item.RowID) ? 'bg-muted' : ''}
                          >
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedRowIds.includes(item.RowID)}
                                onChange={() => handleSelectItem(item.RowID)}
                                className="rounded border-gray-300"
                              />
                            </TableCell>
                            <TableCell className="text-center text-gray-500">
                              {((page - 1) * limit) + index + 1}
                            </TableCell>
                            {/* <TableCell>{item.RowID}</TableCell> */}
                            <TableCell>
                              <Badge variant="outline">{item.ItemCode || item.itemcode}</Badge>
                            </TableCell>
                            <TableCell>{item.itemname}</TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {item.RfidCode}
                              </code>
                            </TableCell>
                            <TableCell>{item.Qty}</TableCell>
                            <TableCell>{item.itemType || '-'}</TableCell>
                            <TableCell>
                              {item.LastCabinetModify
                                ? new Date(item.LastCabinetModify).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        แสดง {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} จาก {total} รายการ
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1 || loading}
                        >
                          ก่อนหน้า
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages || loading}
                        >
                          ถัดไป
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
