import { useState } from 'react';
import { FileBarChart, Download, RefreshCw, TrendingUp, Search } from 'lucide-react';
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

export function MappingVendingTab() {
  const [loading, setLoading] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState<string | null>(null);

  const [mappingStartDate, setMappingStartDate] = useState('');
  const [mappingEndDate, setMappingEndDate] = useState('');
  const [mappingPrintDate, setMappingPrintDate] = useState('');
  const [mappingData, setMappingData] = useState<any>(null);

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

  const fetchMappingData = async () => {
    try {
      setDataLoading('mapping');
      const params: any = {};
      if (mappingPrintDate) {
        params.printDate = mappingPrintDate;
      } else {
        if (mappingStartDate) params.startDate = mappingStartDate;
        if (mappingEndDate) params.endDate = mappingEndDate;
      }

      const result = await vendingReportsApi.getVendingMappingData(params);
      if (result.success || (result as any).status === 'success') {
        setMappingData(result.data || (result as any).data);
      } else {
        toast.error('ไม่สามารถดึงข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setDataLoading(null);
    }
  };

  const handleVendingMappingDownload = (format: 'excel' | 'pdf') => {
    const params = new URLSearchParams();
    if (mappingPrintDate) {
      params.append('printDate', mappingPrintDate);
    } else {
      if (mappingStartDate) params.append('startDate', mappingStartDate);
      if (mappingEndDate) params.append('endDate', mappingEndDate);
    }

    const extension = format === 'excel' ? 'xlsx' : 'pdf';
    const filename = `vending_mapping_report_${mappingPrintDate || mappingStartDate || new Date().toISOString().split('T')[0]}.${extension}`;
    const url = `${API_BASE_URL}/reports/vending-mapping/${format}?${params.toString()}`;

    handleDownload(url, filename, `รายงาน Mapping Vending (${format.toUpperCase()})`);
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
    <TabsContent value="mapping" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>รายงานสรุป Mapping Vending กับ HIS</CardTitle>
                <CardDescription>
                  รายงานการใช้รายการเวชภัณฑ์จาก สรุปรายวันตามวันที่ของการ Print Receipt/Invoice
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={fetchMappingData}
              disabled={dataLoading === 'mapping' || (!mappingPrintDate && !mappingStartDate && !mappingEndDate)}
              className="flex items-center gap-2"
            >
              {dataLoading === 'mapping' ? (
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
              <Label htmlFor="mapping-print-date">วันที่ Print Receipt/Invoice</Label>
              <ExpireDateInput
                id="mapping-print-date"
                value={mappingPrintDate}
                onChange={(ymd) => {
                  setMappingPrintDate(ymd);
                  setMappingStartDate('');
                  setMappingEndDate('');
                }}
                placeholder="เลือกวันที่ Print"
              />
              <p className="text-xs text-gray-500">หรือระบุช่วงวันที่ด้านล่าง</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapping-start-date">วันที่เริ่มต้น</Label>
              <ExpireDateInput
                id="mapping-start-date"
                value={mappingStartDate}
                onChange={(ymd) => {
                  setMappingStartDate(ymd);
                  setMappingPrintDate('');
                }}
                disabled={!!mappingPrintDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapping-end-date">วันที่สิ้นสุด</Label>
              <ExpireDateInput
                id="mapping-end-date"
                value={mappingEndDate}
                onChange={(ymd) => {
                  setMappingEndDate(ymd);
                  setMappingPrintDate('');
                }}
                disabled={!!mappingPrintDate}
              />
            </div>
          </div>
          {dataLoading === 'mapping' && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">กำลังโหลดข้อมูล...</span>
            </div>
          )}

          {mappingData && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนวัน</div>
                    <div className="text-2xl font-bold">{mappingData.summary?.total_days || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวน Episode</div>
                    <div className="text-2xl font-bold">{mappingData.summary?.total_episodes || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนผู้ป่วย</div>
                    <div className="text-2xl font-bold">{mappingData.summary?.total_patients || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">จำนวนรายการทั้งหมด</div>
                    <div className="text-2xl font-bold">{mappingData.summary?.total_items || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">Mapping ได้</div>
                    <div className="text-2xl font-bold text-green-600">{mappingData.summary?.total_mapped || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500">Mapping ไม่ได้</div>
                    <div className="text-2xl font-bold text-red-600">{mappingData.summary?.total_unmapped || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>รายละเอียดรายวัน</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleVendingMappingDownload('excel')}
                        disabled={loading?.includes('Excel')}
                        variant="outline"
                        size="sm"
                      >
                        {loading?.includes('Excel') ? (
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
                      <Button
                        onClick={() => handleVendingMappingDownload('pdf')}
                        disabled={loading === 'รายงาน Mapping Vending (PDF)'}
                        variant="outline"
                        size="sm"
                      >
                        {loading === 'รายงาน Mapping Vending (PDF)' ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            กำลังดาวน์โหลด...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
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
                          <TableHead>วันที่ Print</TableHead>
                          <TableHead className="text-center">Episode</TableHead>
                          <TableHead className="text-center">ผู้ป่วย</TableHead>
                          <TableHead className="text-center">รายการทั้งหมด</TableHead>
                          <TableHead className="text-center">Mapping ได้</TableHead>
                          <TableHead className="text-center">Mapping ไม่ได้</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappingData.data?.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(item.print_date)}</TableCell>
                            <TableCell className="text-center">{item.total_episodes}</TableCell>
                            <TableCell className="text-center">{item.total_patients}</TableCell>
                            <TableCell className="text-center">{item.total_items}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {item.mapped_items?.length || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {item.unmapped_items?.length || 0}
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

