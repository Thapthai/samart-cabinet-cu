'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Receipt, Search, RefreshCw, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { vendingReportsApi } from '@/lib/api';
import { toast } from 'sonner';
import { ExpireDateInput } from '@/components/ExpireDateInput';

export default function CancelBillReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancelBillData, setCancelBillData] = useState<any>(null);

  const fetchCancelBillData = async () => {
    try {
      setDataLoading(true);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const result = await vendingReportsApi.getCancelBillReportData(params);
      if (result.success || (result as any).status === 'success') {
        setCancelBillData(result.data || (result as any).data);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setDataLoading(false);
    }
  };

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

  return (
    <>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายงานยกเลิก Bill
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                รายงานการยกเลิก Bill และใบเสร็จ
              </p>
            </div>
          </div>

          {/* Filter Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>กรองข้อมูล</CardTitle>
                  <CardDescription>เลือกรายการที่ยกเลิก Bill</CardDescription>
                </div>
                <Button
                  onClick={fetchCancelBillData}
                  disabled={dataLoading}
                  className="flex items-center gap-2"
                >
                  {dataLoading ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">วันที่เริ่มต้น</Label>
                  <ExpireDateInput
                    id="start-date"
                    value={startDate}
                    onChange={(ymd) => setStartDate(ymd)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">วันที่สิ้นสุด</Label>
                  <ExpireDateInput
                    id="end-date"
                    value={endDate}
                    onChange={(ymd) => setEndDate(ymd)}
                  />
                </div>
              </div>
              {dataLoading && (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                  <span className="text-gray-500">กำลังโหลดข้อมูล...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Display Data */}
          {cancelBillData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวน Bill ที่ยกเลิก</div>
                    <div className="text-2xl font-bold text-red-600">{cancelBillData.summary?.total_cancelled_bills || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนรายการที่ยกเลิก</div>
                    <div className="text-2xl font-bold">{cancelBillData.summary?.total_cancelled_items || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>รายละเอียดการยกเลิก Bill</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await vendingReportsApi.downloadCancelBillReportExcel({
                              startDate,
                              endDate,
                            });
                            toast.success('ดาวน์โหลด Excel สำเร็จ');
                          } catch (error: any) {
                            toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            กำลังดาวน์โหลด...
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            ดาวน์โหลด Excel
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={async () => {
                          try {
                            setLoading(true);
                            await vendingReportsApi.downloadCancelBillReportPdf({
                              startDate,
                              endDate,
                            });
                            toast.success('ดาวน์โหลด PDF สำเร็จ');
                          } catch (error: any) {
                            toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            กำลังดาวน์โหลด...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            ดาวน์โหลด PDF
                          </>
                        )}
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
                          <TableHead>EN</TableHead>
                          <TableHead>HN</TableHead>
                          <TableHead>ชื่อคนไข้</TableHead>
                          <TableHead className="text-center">วันที่ Print</TableHead>
                          <TableHead className="text-center">วันที่ยกเลิก</TableHead>
                          <TableHead className="text-center">จำนวนรายการ</TableHead>
                          <TableHead>สถานะ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cancelBillData.data?.map((record: any, index: number) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell className="font-mono">{record.en}</TableCell>
                            <TableCell className="font-mono">{record.patient_hn}</TableCell>
                            <TableCell>{record.patient_name}</TableCell>
                            <TableCell className="text-center">
                              {record.print_date ? formatDate(record.print_date) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {formatDate(record.created_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {record.cancelled_items?.length || 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>
                                ยกเลิก
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </>
  );
}

