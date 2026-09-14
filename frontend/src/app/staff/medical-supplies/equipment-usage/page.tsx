'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { reportsApi, medicalSuppliesApi } from '@/lib/api';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { toast } from 'sonner';
import { FileBarChart, Download, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface UsageItem {
  en?: string;
  hn: string;
  code: string;
  description: string;
  assessionNo?: string;
  status?: string;
  qty: number;
  uom?: string;
}

export default function EquipmentUsageReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [items, setItems] = useState<UsageItem[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    hospital: '',
    department: '',
    usageIds: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const queryParams: any = {
        page: 1,
        limit: 1000,
      };
      if (filters.dateFrom) queryParams.dateFrom = filters.dateFrom;
      if (filters.dateTo) queryParams.dateTo = filters.dateTo;
      if (filters.hospital) queryParams.hospital = filters.hospital;
      if (filters.department) queryParams.department_code = filters.department;

      const itemsList: UsageItem[] = [];

      if (filters.usageIds) {
        const usageIds = filters.usageIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        for (const usageId of usageIds) {
          const itemsResponse = await medicalSuppliesApi.getSupplyItemsByUsageId(usageId);
          if (itemsResponse && itemsResponse.success && itemsResponse.data) {
            const usageResponse = await medicalSuppliesApi.getById(usageId);
            if (usageResponse && usageResponse.success && usageResponse.data) {
              itemsResponse.data.forEach((item: any) => {
                itemsList.push({
                  en: usageResponse.data.en,
                  hn: usageResponse.data.patient_hn,
                  code: item.order_item_code || item.supply_code || '-',
                  description: item.order_item_description || item.supply_name || '-',
                  assessionNo: item.assession_no || '-',
                  status: item.order_item_status || '-',
                  qty: item.qty || 0,
                  uom: item.uom || '-',
                });
              });
            }
          }
        }
      } else {
        const usagesResponse = await staffMedicalSuppliesApi.getAll(queryParams);
        let usagesArray: any[] = [];
        if (usagesResponse && usagesResponse.data) {
          usagesArray = Array.isArray(usagesResponse.data) ? usagesResponse.data : [usagesResponse.data];
        }

        for (const usage of usagesArray) {
          const usageData = usage.data || usage;
          const itemsResponse = await staffMedicalSuppliesApi.getSupplyItemsByUsageId(usageData.id || usage.id);

          if (itemsResponse && itemsResponse.success && itemsResponse.data) {
            itemsResponse.data.forEach((item: any) => {
              itemsList.push({
                en: usageData.en,
                hn: usageData.patient_hn,
                code: item.order_item_code || item.supply_code || '-',
                description: item.order_item_description || item.supply_name || '-',
                assessionNo: item.assession_no || '-',
                status: item.order_item_status || '-',
                qty: item.qty || 0,
                uom: item.uom || '-',
              });
            });
          }
        }
      }
      setItems(itemsList);
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
      const params: any = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.hospital) params.hospital = filters.hospital;
      if (filters.department) params.department = filters.department;
      if (filters.usageIds) {
        params.usageIds = filters.usageIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }

      const blob = await reportsApi.exportEquipmentUsageExcel(params);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = filters.dateFrom ? filters.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      link.download = `equipment_usage_report_${dateStr}.xlsx`;
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
      const params: any = {};
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.hospital) params.hospital = filters.hospital;
      if (filters.department) params.department = filters.department;
      if (filters.usageIds) {
        params.usageIds = filters.usageIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }

      const blob = await reportsApi.exportEquipmentUsagePDF(params);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = filters.dateFrom ? filters.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      link.download = `equipment_usage_report_${dateStr}.pdf`;
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileBarChart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายงานการใช้อุปกรณ์กับคนไข้
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                สร้างรายงานการใช้อุปกรณ์กับคนไข้ตามเงื่อนไขที่กำหนด
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="usageIds">Usage IDs (คั่นด้วย comma)</Label>
                <Input
                  id="usageIds"
                  placeholder="เช่น: 1,2,3"
                  value={filters.usageIds}
                  onChange={(e) => setFilters({ ...filters, usageIds: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {items.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>รายการใช้อุปกรณ์</CardTitle>
                  <CardDescription>ทั้งหมด {items.length} รายการ</CardDescription>
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
                    <FileBarChart className="h-4 w-4" />
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
                      <TableHead>EN</TableHead>
                      <TableHead>HN</TableHead>
                      <TableHead>รหัสอุปกรณ์</TableHead>
                      <TableHead>ชื่ออุปกรณ์</TableHead>
                      <TableHead>Assession No.</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        </TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          ไม่พบข้อมูล
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>{item.en || '-'}</TableCell>
                          <TableCell>{item.hn}</TableCell>
                          <TableCell>{item.code}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.assessionNo || '-'}</TableCell>
                          <TableCell>{item.status || '-'}</TableCell>
                          <TableCell className="text-center">{item.qty}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {!loadingData && items.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileBarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">ยังไม่มีข้อมูล กรุณาค้นหาหรือกรองข้อมูล</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

