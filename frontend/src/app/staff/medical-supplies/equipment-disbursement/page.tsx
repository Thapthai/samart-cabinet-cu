'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { reportsApi, medicalSuppliesApi } from '@/lib/api';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { toast } from 'sonner';
import { FileText, Download, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { staffReportApi } from '@/lib/staffApi/reportApi';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface DisbursementRecord {
  code: string;
  description: string;
  date: string;
  time: string;
  recordedBy: string;
  qty: number;
}

interface SummaryItem {
  code: string;
  description: string;
  totalQty: number;
}

export default function EquipmentDisbursementReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [records, setRecords] = useState<DisbursementRecord[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    hospital: '',
    department: '',
  });

  useEffect(() => {
      fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const queryParams: any = {};
      if (filters.dateFrom) queryParams.dateFrom = filters.dateFrom;
      if (filters.dateTo) queryParams.dateTo = filters.dateTo;
      if (filters.hospital) queryParams.hospital = filters.hospital;
      if (filters.department) queryParams.department = filters.department;

      const usagesResponse = await medicalSuppliesApi.getAll({
        page: 1,
        limit: 1000,
        ...queryParams,
      });

      if (usagesResponse && usagesResponse.data) {
        const usagesArray = Array.isArray(usagesResponse.data) ? usagesResponse.data : [usagesResponse.data];
        const recordsList: DisbursementRecord[] = [];
        const summaryMap = new Map<string, { code: string; description: string; totalQty: number }>();

        for (const usage of usagesArray) {
          const usageData = usage.data || usage;
          const itemsResponse = await staffMedicalSuppliesApi.getSupplyItemsByUsageId(usageData.id || usage.id);

          if (itemsResponse && itemsResponse.success && itemsResponse.data) {
            itemsResponse.data.forEach((item: any) => {
              const code = item.order_item_code || item.supply_code || '-';
              const description = item.order_item_description || item.supply_name || '-';
              const qty = item.qty || 0;

              let date = '';
              let time = '';
              if (usageData.usage_datetime) {
                try {
                  const dateTime = new Date(usageData.usage_datetime);
                  date = dateTime.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  time = dateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                  const parts = usageData.usage_datetime.split(' ');
                  if (parts.length >= 2) {
                    date = parts[0];
                    time = parts[1];
                  } else {
                    date = usageData.usage_datetime;
                    time = '';
                  }
                }
              }

              recordsList.push({
                code,
                description,
                date,
                time,
                recordedBy: usageData.recorded_by_user_id || '-',
                qty,
              });

              const key = code;
              if (summaryMap.has(key)) {
                const existing = summaryMap.get(key)!;
                existing.totalQty += qty;
              } else {
                summaryMap.set(key, {
                  code,
                  description,
                  totalQty: qty,
                });
              }
            });
          }
        }

        setRecords(recordsList);
        setSummary(Array.from(summaryMap.values()));
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoadingData(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const blob = await staffReportApi.exportEquipmentDisbursementExcel(filters);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = filters.dateFrom ? filters.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      link.download = `equipment_disbursement_report_${dateStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export Excel สำเร็จ');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการ export');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const blob = await staffReportApi.exportEquipmentDisbursementPDF(filters);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = filters.dateFrom ? filters.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      link.download = `equipment_disbursement_report_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export PDF สำเร็จ');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการ export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  รายงานการรับบันทึกตัดจ่ายอุปกรณ์
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  สร้างรายงานการบันทึกตัดจ่ายอุปกรณ์พร้อมสรุปผลรวม
                </p>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>กรองข้อมูล</CardTitle>
                  <CardDescription>ระบุเงื่อนไขสำหรับดูข้อมูล</CardDescription>
                </div>
                <Button
                  onClick={fetchData}
                  disabled={loadingData}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  ค้นหา
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">วันที่เริ่มต้น</Label>
                  <ExpireDateInput
                    id="dateFrom"
                    value={filters.dateFrom}
                    onChange={(ymd) => setFilters({ ...filters, dateFrom: ymd })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateTo">วันที่สิ้นสุด</Label>
                  <ExpireDateInput
                    id="dateTo"
                    value={filters.dateTo}
                    onChange={(ymd) => setFilters({ ...filters, dateTo: ymd })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hospital">โรงพยาบาล</Label>
                  <Input
                    id="hospital"
                    placeholder="ระบุชื่อโรงพยาบาล..."
                    value={filters.hospital}
                    onChange={(e) => setFilters({ ...filters, hospital: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">แผนก/หน่วยงาน</Label>
                  <Input
                    id="department"
                    placeholder="ระบุแผนก..."
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          {records.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>รายการบันทึกตัดจ่าย</CardTitle>
                      <CardDescription>ทั้งหมด {records.length} รายการ</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleExportExcel}
                        disabled={loading}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <Download className="h-4 w-4" />
                        Excel
                      </Button>
                      <Button
                        onClick={handleExportPDF}
                        disabled={loading}
                        variant="outline"
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
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
                          <TableHead>อุปกรณ์</TableHead>
                          <TableHead>วันที่</TableHead>
                          <TableHead>เวลา</TableHead>
                          <TableHead>ผู้บันทึก</TableHead>
                          <TableHead className="text-center">จำนวน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingData ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8">
                              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            </TableCell>
                          </TableRow>
                        ) : records.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              ไม่พบข้อมูล
                            </TableCell>
                          </TableRow>
                        ) : (
                          records.map((record, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-center">{index + 1}</TableCell>
                              <TableCell>{record.code}</TableCell>
                              <TableCell>{record.description}</TableCell>
                              <TableCell>{record.date || '-'}</TableCell>
                              <TableCell>{record.time || '-'}</TableCell>
                              <TableCell>{record.recordedBy}</TableCell>
                              <TableCell className="text-center">{record.qty}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Table */}
              {summary.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>สรุปผลรวม</CardTitle>
                    <CardDescription>ผลรวมของแต่ละอุปกรณ์</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 py-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">ลำดับ</TableHead>
                            <TableHead>รหัสอุปกรณ์</TableHead>
                            <TableHead>อุปกรณ์</TableHead>
                            <TableHead className="text-center">ผลรวม</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-center">{index + 1}</TableCell>
                              <TableCell>{item.code}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-center font-semibold">{item.totalQty}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!loadingData && records.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">ยังไม่มีข้อมูล กรุณาค้นหาหรือกรองข้อมูล</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </>
  );
}

