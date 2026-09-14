import { useState } from 'react';
import { Download, RefreshCw, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { vendingReportsApi } from '@/lib/api';
import { toast } from 'sonner';
import { ExpireDateInput } from '@/components/ExpireDateInput';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export function UnmappedDispensedTab() {
  const [loading, setLoading] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState<string | null>(null);

  const [unmappedStartDate, setUnmappedStartDate] = useState('');
  const [unmappedEndDate, setUnmappedEndDate] = useState('');
  const [unmappedGroupBy, setUnmappedGroupBy] = useState<'day' | 'month'>('day');
  const [unmappedData, setUnmappedData] = useState<any>(null);

  const fetchUnmappedData = async () => {
    try {
      setDataLoading('unmapped');
      const params: any = {};
      if (unmappedStartDate) params.startDate = unmappedStartDate;
      if (unmappedEndDate) params.endDate = unmappedEndDate;
      if (unmappedGroupBy) params.groupBy = unmappedGroupBy;

      const result = await vendingReportsApi.getUnmappedDispensedData(params);
      if (result.success || (result as any).status === 'success') {
        setUnmappedData(result.data || (result as any).data);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setDataLoading(null);
    }
  };

  const handleUnmappedDispensedReport = () => {
    const params = new URLSearchParams();
    if (unmappedStartDate) params.append('startDate', unmappedStartDate);
    if (unmappedEndDate) params.append('endDate', unmappedEndDate);
    if (unmappedGroupBy) params.append('groupBy', unmappedGroupBy);

    const filename = `unmapped_dispensed_report_${unmappedGroupBy}_${unmappedStartDate || new Date().toISOString().split('T')[0]}.xlsx`;
    const url = `${API_BASE_URL}/reports/unmapped-dispensed/excel?${params.toString()}`;

    handleDownload(url, filename, 'รายงานการเบิกที่ Mapping ไม่ได้');
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
    <TabsContent value="unmapped" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>รายงานการเบิกที่ Mapping ไม่ได้</CardTitle>
                <CardDescription>
                  รายงานสรุปการเบิกรายการเวชภัณฑ์จากที่ Mapping ไม่ได้ว่าใช้ไปกับคนไข้ใด รายวัน และ รายเดือน ตามวันที่ของการเบิกเวชภัณฑ์
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={fetchUnmappedData}
              disabled={dataLoading === 'unmapped' || (!unmappedStartDate || !unmappedEndDate)}
              className="flex items-center gap-2"
            >
              {dataLoading === 'unmapped' ? (
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
              <Label htmlFor="unmapped-start-date">วันที่เริ่มต้น</Label>
              <ExpireDateInput
                id="unmapped-start-date"
                value={unmappedStartDate}
                onChange={(ymd) => setUnmappedStartDate(ymd)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unmapped-end-date">วันที่สิ้นสุด</Label>
              <ExpireDateInput
                id="unmapped-end-date"
                value={unmappedEndDate}
                onChange={(ymd) => setUnmappedEndDate(ymd)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unmapped-group-by">รูปแบบการจัดกลุ่ม</Label>
              <Select value={unmappedGroupBy} onValueChange={(value: 'day' | 'month') => setUnmappedGroupBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">รายวัน</SelectItem>
                  <SelectItem value="month">รายเดือน</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {dataLoading === 'unmapped' && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">กำลังโหลดข้อมูล...</span>
            </div>
          )}

          {unmappedData && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนช่วงเวลา</div>
                    <div className="text-2xl font-bold">{unmappedData.summary?.total_periods || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนรายการที่ Mapping ไม่ได้</div>
                    <div className="text-2xl font-bold text-red-600">{unmappedData.summary?.total_unmapped_items || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนรวม</div>
                    <div className="text-2xl font-bold">{unmappedData.summary?.total_unmapped_qty || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>รายละเอียดรายการ</CardTitle>
                    <Button
                      onClick={handleUnmappedDispensedReport}
                      disabled={loading === 'รายงานการเบิกที่ Mapping ไม่ได้'}
                      variant="outline"
                      size="sm"
                    >
                      {loading === 'รายงานการเบิกที่ Mapping ไม่ได้' ? (
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
                          <TableHead>{unmappedData.groupBy === 'day' ? 'วันที่' : 'เดือน'}</TableHead>
                          <TableHead>รหัสอุปกรณ์</TableHead>
                          <TableHead>ชื่ออุปกรณ์</TableHead>
                          <TableHead className="text-center">วันที่เบิก</TableHead>
                          <TableHead className="text-center">จำนวน</TableHead>
                          <TableHead>RFID Code</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmappedData.data?.map((period: any, periodIndex: number) =>
                          period.items?.map((item: any, itemIndex: number) => (
                            <TableRow key={`${periodIndex}-${itemIndex}`}>
                              {itemIndex === 0 ? (
                                <TableCell rowSpan={period.items.length} className="align-top border-r">
                                  <div className="font-semibold">{period.date}</div>
                                  <div className="text-xs text-gray-500 mt-1">({period.items.length} รายการ)</div>
                                </TableCell>
                              ) : null}
                              <TableCell className="font-mono">{item.item_code}</TableCell>
                              <TableCell>{item.item_name}</TableCell>
                              <TableCell className="text-center">{formatDate(item.dispensed_date)}</TableCell>
                              <TableCell className="text-center">{item.qty}</TableCell>
                              <TableCell className="font-mono">{item.rfid_code}</TableCell>
                            </TableRow>
                          ))
                        )}
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

