'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { RotateCcw, Search, RefreshCw, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { medicalSuppliesApi, vendingReportsApi } from '@/lib/api';
import { toast } from 'sonner';
import { ExpireDateInput } from '@/components/ExpireDateInput';

export default function ReturnReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [returnHistoryDateFrom, setReturnHistoryDateFrom] = useState('');
  const [returnHistoryDateTo, setReturnHistoryDateTo] = useState('');
  const [returnHistoryReason, setReturnHistoryReason] = useState<string>('ALL');
  const [returnHistoryData, setReturnHistoryData] = useState<any>(null);
  const [returnHistoryPage, setReturnHistoryPage] = useState(1);
  const [returnHistoryLimit] = useState(10);
  const [reportDownloadLoading, setReportDownloadLoading] = useState<'excel' | 'pdf' | null>(null);

  const fetchReturnHistory = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: returnHistoryPage,
        limit: returnHistoryLimit,
      };
      if (returnHistoryDateFrom) params.date_from = returnHistoryDateFrom;
      if (returnHistoryDateTo) params.date_to = returnHistoryDateTo;
      if (returnHistoryReason && returnHistoryReason !== 'ALL') params.return_reason = returnHistoryReason;

      const result = await medicalSuppliesApi.getReturnHistory(params);
      // Backend returns: { success: true, data: [...], total: ..., page: ..., limit: ... }
      if (result.success && result.data) {
        setReturnHistoryData(result);
      } else if (result.data) {
        // Fallback: if result has data but no success flag
        setReturnHistoryData(result);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลประวัติการคืนได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnHistoryPage]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const getReturnReasonLabel = (reason: string) => {
    const labels: { [key: string]: string } = {
      'UNWRAPPED_UNUSED': 'ยังไม่ได้แกะซอง หรือยังอยู่ในสภาพเดิม',
      'EXPIRED': 'อุปกรณ์หมดอายุ',
      'CONTAMINATED': 'อุปกรณ์มีการปนเปื้อน',
      'DAMAGED': 'อุปกรณ์ชำรุด',
    };
    return labels[reason] || reason;
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <RotateCcw className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายงานอุปกรณ์ที่ไม่ถูกใช้งาน
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                ดูและดาวน์โหลดรายงานอุปกรณ์ที่ไม่ถูกใช้งาน
              </p>
            </div>
          </div>

          {/* Filter Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>กรองข้อมูลประวัติการคืน</CardTitle>
                  <CardDescription>ดูประวัติการคืนเวชภัณฑ์ทั้งหมด</CardDescription>
                </div>
                <Button
                  onClick={fetchReturnHistory}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      กำลังโหลด...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      ค้นหา
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="history-date-from">วันที่เริ่มต้น</Label>
                  <ExpireDateInput
                    id="history-date-from"
                    value={returnHistoryDateFrom}
                    onChange={(ymd) => setReturnHistoryDateFrom(ymd)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-date-to">วันที่สิ้นสุด</Label>
                  <ExpireDateInput
                    id="history-date-to"
                    value={returnHistoryDateTo}
                    onChange={(ymd) => setReturnHistoryDateTo(ymd)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="history-reason">สาเหตุ</Label>
                  <Select value={returnHistoryReason || 'ALL'} onValueChange={setReturnHistoryReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">ทั้งหมด</SelectItem>
                      <SelectItem value="UNWRAPPED_UNUSED">ยังไม่ได้แกะซอง หรือยังอยู่ในสภาพเดิม</SelectItem>
                      <SelectItem value="EXPIRED">อุปกรณ์หมดอายุ</SelectItem>
                      <SelectItem value="CONTAMINATED">อุปกรณ์มีการปนเปื้อน</SelectItem>
                      <SelectItem value="DAMAGED">อุปกรณ์ชำรุด</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                  <span className="text-gray-500">กำลังโหลดข้อมูล...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Return History */}
          {returnHistoryData && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>ประวัติการคืนเวชภัณฑ์</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            setReportDownloadLoading('excel');
                            toast.info('กำลังสร้างรายงาน Excel...');
                            await vendingReportsApi.downloadReturnReportExcel({
                              date_from: returnHistoryDateFrom || undefined,
                              date_to: returnHistoryDateTo || undefined,
                              return_reason: returnHistoryReason !== 'ALL' ? returnHistoryReason : undefined,
                            });
                            toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
                          } catch (error: any) {
                            toast.error(`ไม่สามารถดาวน์โหลดรายงาน Excel ได้: ${error?.message || error}`);
                          } finally {
                            setReportDownloadLoading(null);
                          }
                        }}
                        disabled={loading || reportDownloadLoading !== null}
                        className="flex items-center gap-2"
                      >
                        {reportDownloadLoading === 'excel' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {reportDownloadLoading === 'excel' ? 'กำลังโหลด...' : 'ดาวน์โหลด Excel'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            setReportDownloadLoading('pdf');
                            toast.info('กำลังสร้างรายงาน PDF...');
                            await vendingReportsApi.downloadReturnReportPdf({
                              date_from: returnHistoryDateFrom || undefined,
                              date_to: returnHistoryDateTo || undefined,
                              return_reason: returnHistoryReason !== 'ALL' ? returnHistoryReason : undefined,
                            });
                            toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
                          } catch (error: any) {
                            toast.error(`ไม่สามารถดาวน์โหลดรายงาน PDF ได้: ${error?.message || error}`);
                          } finally {
                            setReportDownloadLoading(null);
                          }
                        }}
                        disabled={loading || reportDownloadLoading !== null}
                        className="flex items-center gap-2"
                      >
                        {reportDownloadLoading === 'pdf' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {reportDownloadLoading === 'pdf' ? 'กำลังโหลด...' : 'ดาวน์โหลด PDF'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">ลำดับ</TableHead>
                          <TableHead>รหัสอุปกรณ์</TableHead>
                          <TableHead>ชื่ออุปกรณ์</TableHead>
                          <TableHead>HN</TableHead>
                          <TableHead className="text-center">จำนวนที่คืน</TableHead>
                          <TableHead>สาเหตุ</TableHead>
                          <TableHead className="text-center">วันที่</TableHead>
                          <TableHead>หมายเหตุ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnHistoryData.data?.map((record: any, index: number) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-center">
                              {(returnHistoryPage - 1) * returnHistoryLimit + index + 1}
                            </TableCell>
                            <TableCell className="font-mono">
                              {record.supply_item?.order_item_code || record.supply_item?.supply_code || '-'}
                            </TableCell>
                            <TableCell>
                              {record.supply_item?.order_item_description || record.supply_item?.supply_name || '-'}
                            </TableCell>
                            <TableCell className="font-mono">
                              {record.supply_item?.usage?.patient_hn || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {record.qty_returned}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {getReturnReasonLabel(record.return_reason)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {formatDate(record.return_datetime)}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {record.return_note || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {returnHistoryData.data?.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      ไม่พบข้อมูลประวัติการคืน
                    </div>
                  )}
                  {/* Pagination */}
                  {returnHistoryData.total > returnHistoryLimit && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        แสดง {((returnHistoryPage - 1) * returnHistoryLimit) + 1} - {Math.min(returnHistoryPage * returnHistoryLimit, returnHistoryData.total)} จาก {returnHistoryData.total} รายการ
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnHistoryPage(p => Math.max(1, p - 1))}
                          disabled={returnHistoryPage === 1}
                        >
                          ก่อนหน้า
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnHistoryPage(p => p + 1)}
                          disabled={returnHistoryPage * returnHistoryLimit >= returnHistoryData.total}
                        >
                          ถัดไป
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

