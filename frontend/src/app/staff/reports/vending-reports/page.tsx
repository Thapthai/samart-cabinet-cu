'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FileBarChart, Download, RefreshCw, TrendingUp, AlertCircle, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { staffVendingReportsApi } from '@/lib/staffApi/vendingReportsApi';
import { ExpireDateInput } from '@/components/ExpireDateInput';

export default function VendingReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState<string | null>(null);

  // Report 1: Vending Mapping Report
  const [mappingStartDate, setMappingStartDate] = useState('');
  const [mappingEndDate, setMappingEndDate] = useState('');
  const [mappingPrintDate, setMappingPrintDate] = useState('');
  const [mappingData, setMappingData] = useState<any>(null);

  // Report 2: Unmapped Dispensed Report
  const [unmappedStartDate, setUnmappedStartDate] = useState('');
  const [unmappedEndDate, setUnmappedEndDate] = useState('');
  const [unmappedGroupBy, setUnmappedGroupBy] = useState<'day' | 'month'>('day');
  const [unmappedData, setUnmappedData] = useState<any>(null);

  // Report 3: Unused Dispensed Report
  const [unusedDate, setUnusedDate] = useState('');
  const [unusedData, setUnusedData] = useState<any>(null);

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

      const result = await staffVendingReportsApi.getVendingMappingData(params);
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

  const fetchUnmappedData = async () => {
    try {
      setDataLoading('unmapped');
      const params: any = {};
      if (unmappedStartDate) params.startDate = unmappedStartDate;
      if (unmappedEndDate) params.endDate = unmappedEndDate;
      if (unmappedGroupBy) params.groupBy = unmappedGroupBy;

      const result = await staffVendingReportsApi.getUnmappedDispensedData(params);
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

  const fetchUnusedData = async () => {
    try {
      setDataLoading('unused');
      const params: any = {};
      if (unusedDate) params.date = unusedDate;

      const result = await staffVendingReportsApi.getUnusedDispensedData(params);
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
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/reports/vending-mapping/${format}?${params.toString()}`;

    handleDownload(url, filename, `รายงาน Mapping Vending (${format.toUpperCase()})`);
  };


  const handleUnmappedDispensedReport = () => {
    const params = new URLSearchParams();
    if (unmappedStartDate) params.append('startDate', unmappedStartDate);
    if (unmappedEndDate) params.append('endDate', unmappedEndDate);
    if (unmappedGroupBy) params.append('groupBy', unmappedGroupBy);

    const filename = `unmapped_dispensed_report_${unmappedGroupBy}_${unmappedStartDate || new Date().toISOString().split('T')[0]}.xlsx`;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/reports/unmapped-dispensed/excel?${params.toString()}`;

    handleDownload(url, filename, 'รายงานการเบิกที่ Mapping ไม่ได้');
  };

  const handleUnusedDispensedReport = () => {
    const params = new URLSearchParams();
    if (unusedDate) params.append('date', unusedDate);

    const filename = `unused_dispensed_report_${unusedDate || new Date().toISOString().split('T')[0]}.xlsx`;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/reports/unused-dispensed/excel?${params.toString()}`;

    handleDownload(url, filename, 'รายงานรายการที่ไม่ได้ใช้');
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
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <FileBarChart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              รายงาน Vending
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              รายงานการ Mapping และการเบิกอุปกรณ์จาก Vending
            </p>
          </div>
        </div>

        <Tabs defaultValue="mapping" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mapping">Mapping Vending</TabsTrigger>
            <TabsTrigger value="unmapped">Mapping ไม่ได้</TabsTrigger>
            <TabsTrigger value="unused">ไม่ได้ใช้ภายในวัน</TabsTrigger>
          </TabsList>

          {/* Tab 1: Vending Mapping Report */}
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

                {/* Display Data */}
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

          {/* Tab 2: Unmapped Dispensed Report */}
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

                {/* Display Data */}
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

          {/* Tab 3: Unused Dispensed Report */}
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

                {/* Display Data */}
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
        </Tabs>
      </div>
    </>
  );
}
