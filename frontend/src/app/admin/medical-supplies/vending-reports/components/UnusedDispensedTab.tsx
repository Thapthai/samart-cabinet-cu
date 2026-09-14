import { useState } from 'react';
import { Download, RefreshCw, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { vendingReportsApi } from '@/lib/api';
import { toast } from 'sonner';
import { ExpireDateInput } from '@/components/ExpireDateInput';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export function UnusedDispensedTab() {
  const [loading, setLoading] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState<string | null>(null);

  const [unusedDate, setUnusedDate] = useState('');
  const [unusedData, setUnusedData] = useState<any>(null);

  const fetchUnusedData = async () => {
    try {
      setDataLoading('unused');
      const params: any = {};
      if (unusedDate) params.date = unusedDate;

      const result = await vendingReportsApi.getUnusedDispensedData(params);
      if (result.success || (result as any).status === 'success') {
        setUnusedData(result.data || (result as any).data);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setDataLoading(null);
    }
  };

  const handleUnusedDispensedReport = () => {
    const params = new URLSearchParams();
    if (unusedDate) params.append('date', unusedDate);

    const filename = `unused_dispensed_report_${unusedDate || new Date().toISOString().split('T')[0]}.xlsx`;
    const url = `${API_BASE_URL}/reports/unused-dispensed/excel?${params.toString()}`;

    handleDownload(url, filename, 'รายงานรายการที่ไม่ได้ใช้');
  };

  const handleDownload = async (url: string, filename: string, reportName: string) => {
    try {
      setLoading(reportName);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download ${reportName}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`ดาวน์โหลด ${reportName} สำเร็จ`);
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <TabsContent value="unused" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <XCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle>รายงานรายการที่เบิกแล้วแต่ไม่ได้ใช้ภายในวัน</CardTitle>
                <CardDescription>
                  รายการที่เบิกเวชภัณฑ์ภายในวันไม่ได้ใช้
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={fetchUnusedData}
              disabled={dataLoading === 'unused'}
              className="flex items-center gap-2"
            >
              {dataLoading === 'unused' ? (
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
          <div className="space-y-2">
            <Label htmlFor="unused-date">วันที่ที่ต้องการตรวจสอบ</Label>
            <ExpireDateInput
              id="unused-date"
              value={unusedDate}
              onChange={(ymd) => setUnusedDate(ymd)}
              placeholder="ถ้าไม่ระบุจะใช้วันปัจจุบัน"
            />
            <p className="text-xs text-gray-500">ถ้าไม่ระบุจะใช้วันปัจจุบัน</p>
          </div>
          {dataLoading === 'unused' && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">กำลังโหลดข้อมูล...</span>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Flow การจัดการ:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• กรณีที่ยังไม่ได้แกะซอง หรือยังอยู่ในสภาพเดิมจากการเบิก: ให้นำกลับเข้าตู้ Vending (หมายถึงการนำกลับมาคืน)</li>
              <li>• กรณีที่ Package ไม่เหมือนเดิม หรือนำไปใช้ในแผนก: ติดต่อแผนกที่เกี่ยวข้อง</li>
            </ul>
          </div>

          {unusedData && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">วันที่</div>
                    <div className="text-2xl font-bold">{formatDate(unusedData.summary?.date || '')}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนรายการที่ไม่ได้ใช้</div>
                    <div className="text-2xl font-bold text-yellow-600">{unusedData.summary?.total_unused_items || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนรวม</div>
                    <div className="text-2xl font-bold">{unusedData.summary?.total_unused_qty || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>รายละเอียดรายการ</CardTitle>
                    <Button
                      onClick={handleUnusedDispensedReport}
                      disabled={loading === 'รายงานรายการที่ไม่ได้ใช้'}
                      variant="outline"
                      size="sm"
                    >
                      {loading === 'รายงานรายการที่ไม่ได้ใช้' ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          กำลังดาวน์โหลด...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          ดาวน์โหลด Excel
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัสอุปกรณ์</TableHead>
                          <TableHead>ชื่ออุปกรณ์</TableHead>
                          <TableHead className="text-center">วันที่เบิก</TableHead>
                          <TableHead className="text-center">จำนวน</TableHead>
                          <TableHead>RFID Code</TableHead>
                          <TableHead className="text-center">ชั่วโมงที่ผ่านมา</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unusedData.data?.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{item.item_code}</TableCell>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell className="text-center">{formatDate(item.dispensed_date)}</TableCell>
                            <TableCell className="text-center">{item.qty}</TableCell>
                            <TableCell className="font-mono">{item.rfid_code}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                {item.hours_since_dispense} ชม.
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
        </CardContent>
      </Card>
    </TabsContent>
  );
}

