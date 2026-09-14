'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi } from '@/lib/api';
import { staffVendingReportsApi } from '@/lib/staffApi/vendingReportsApi';
import { ExpireDateInput } from '@/components/ExpireDateInput';

import { toast } from 'sonner';
import { History, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import MedicalSuppliesTable from './components/MedicalSuppliesTable';
import CancelBillDialog from './components/CancelBillDialog';

export default function MedicalSuppliesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<any>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [cancelBillDialogOpen, setCancelBillDialogOpen] = useState(false);
  const [selectedSupplyForCancel, setSelectedSupplyForCancel] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

  const [staffDepartment, setStaffDepartment] = useState<{ department_id: string; department_name: string }>({
    department_id: '',
    department_name: '',
  });

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    patientHN: '',
    keyword: '',
    userName: '',
    firstName: '',
    lastName: '',
    assessionNo: '',
    usageType: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // โหลด department จาก localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('staff_user');
      if (raw) {
        const staffUser = JSON.parse(raw.trim());
        if (staffUser?.department_id) {
          setStaffDepartment({
            department_id: String(staffUser.department_id),
            department_name: staffUser.department_name ?? '',
          });
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchSupplies();
    }
  }, [user?.id, currentPage]);

  const fetchSupplies = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.userName) params.user_name = filters.userName;


      const response: any = await medicalSuppliesApi.getAll(params);

      if (response && response.data) {
        let dataArray: any[] = [];

        if (Array.isArray(response.data)) {
          dataArray = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          dataArray = response.data.data;
        } else if (response.data && typeof response.data === 'object') {
          dataArray = [response.data];
        }

        setSupplies(dataArray);

        const totalItems = response.total || dataArray.length;
        const calculatedPages = Math.ceil(totalItems / itemsPerPage);

        setTotalPages(calculatedPages || 1);
        setTotalItems(totalItems);
      } else {
        setSupplies([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Failed to fetch medical supplies:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchSupplies();
  };

  const handleReset = () => {
    setFilters({
      startDate: '',
      endDate: '',
      patientHN: '',
      keyword: '',
      userName: '',
      firstName: '',
      lastName: '',
      assessionNo: '',
      usageType: '',
    });
    setCurrentPage(1);
    setSelectedSupply(null);
    setSelectedSupplyId(null);
    fetchSupplies();
  };

  const handleSelectSupply = (supply: any) => {
    const supplyData = supply.data || supply;
    const id = supply.id || supplyData.id;
    setSelectedSupply(supply);
    setSelectedSupplyId(id);
    setTimeout(() => {
      const detailSection = document.getElementById('supply-details');
      if (detailSection) {
        detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleCancelBill = (supply: any) => {
    setSelectedSupplyForCancel(supply);
    setCancelBillDialogOpen(true);
  };

  const handleCancelBillSuccess = () => {
    fetchSupplies();
    setSelectedSupply(null);
    setSelectedSupplyId(null);
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      setExportLoading(format);
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);
      const params = {
        keyword: filters.keyword || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        patientHn: filters.patientHN || undefined,
        departmentCode: staffDepartment.department_id || undefined,
        usageType: filters.usageType || undefined,
      };
      if (format === 'excel') {
        await staffVendingReportsApi.downloadDispensedItemsForPatientsExcel(params);
      } else {
        await staffVendingReportsApi.downloadDispensedItemsForPatientsPdf(params);
      }
      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    } finally {
      setExportLoading(null);
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

  /** แสดงวันที่/เวลาที่พิมพ์บิล (print_date อาจเป็น YYYY-MM-DD, time_print_date เป็น HH:mm:ss) */
  const formatPrintDateTime = (printDate: string | null | undefined, timePrintDate: string | null | undefined): string => {
    const datePart = printDate?.trim();
    const timePart = timePrintDate?.trim();
    if (!datePart && !timePart) return '-';
    const parts: string[] = [];
    if (datePart) {
      if (/^\d{4}-\d{2}-\d{2}/.test(datePart)) {
        try {
          const d = new Date(datePart.includes('T') ? datePart : datePart + 'T00:00:00');
          parts.push(d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }));
        } catch {
          parts.push(datePart);
        }
      } else {
        parts.push(datePart);
      }
    }
    if (timePart) {
      parts.push(timePart.length > 8 ? timePart.slice(0, 8) : timePart);
    }
    return parts.join(' ') || '-';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                รายการเบิกอุปกรณ์ใช้กับคนไข้
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ประวัติการเบิกอุปกรณ์จากตู้ SmartCabinet
              </p>
            </div>
          </div>
        </div>

        {/* Search Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
              <ExpireDateInput
                id="startDate"
                value={filters.startDate}
                onChange={(ymd) => setFilters({ ...filters, startDate: ymd })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
              <ExpireDateInput
                id="endDate"
                value={filters.endDate}
                onChange={(ymd) => setFilters({ ...filters, endDate: ymd })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">ผู้เพิ่มรายการ</Label>
              <Input
                id="userName"
                placeholder="ชื่อผู้เพิ่มรายการ..."
                value={filters.userName}
                onChange={(e) => setFilters({ ...filters, userName: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {staffDepartment.department_id && (
              <div className="space-y-2">
                <Label>แผนก</Label>
                <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground">
                  {staffDepartment.department_name || `แผนก ${staffDepartment.department_id}`}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>ประเภทผู้ป่วย</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={filters.usageType}
                onChange={(e) => setFilters({ ...filters, usageType: e.target.value })}
              >
                <option value="">-- ทั้งหมด --</option>
                <option value="OPD">ผู้ป่วยนอก (OPD)</option>
                <option value="IPD">ผู้ป่วยใน (IPD)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              ค้นหา
            </Button>
            <Button onClick={handleReset} variant="outline" disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเซ็ต
            </Button>
            <Button onClick={fetchSupplies} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              โหลดใหม่
            </Button>
          </div>
        </div>

        {/* Table */}
        <MedicalSuppliesTable
          loading={loading}
          supplies={supplies}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onSelectSupply={handleSelectSupply}
          selectedSupplyId={selectedSupplyId}
          onCancelBill={handleCancelBill}
          onExportExcel={() => handleExportReport('excel')}
          onExportPdf={() => handleExportReport('pdf')}
          exportLoading={exportLoading}
          filters={filters}
        />

        {/* Detail Section */}
        {selectedSupply && selectedSupplyId && (
          <div id="supply-details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>รายละเอียดการเบิกอุปกรณ์</CardTitle>
                <CardDescription>
                  HN: {selectedSupply.data?.patient_hn || selectedSupply.patient_hn || '-'} |
                  Assession No: {(() => {
                    const supplyItems = selectedSupply.data?.supply_items || selectedSupply.supply_items || [];
                    const assessionNos = [...new Set(
                      supplyItems
                        .map((item: any) => item.assession_no)
                        .filter((no: string) => no && no.trim() !== '')
                    )];
                    return assessionNos.length > 0 ? assessionNos.join(', ') : '-';
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">ชื่อคนไข้</p>
                      <p className="font-semibold">
                        {selectedSupply.data?.first_name || selectedSupply.first_name || ''}{' '}
                        {selectedSupply.data?.lastname || selectedSupply.lastname || ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ผู้เบิก</p>
                      <p className="font-semibold">
                        {selectedSupply.data?.recorded_by_display ||
                          selectedSupply.recorded_by_display ||
                          selectedSupply.recorded_by_name ||
                          selectedSupply.data?.recorded_by_name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">แผนก</p>
                      <p className="font-semibold">
                        {selectedSupply.data?.department_name || selectedSupply.department_name || 
                         selectedSupply.data?.department_code || selectedSupply.department_code || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ประเภทผู้ป่วย</p>
                      <div className="mt-1">
                        {(() => {
                          const ut = (selectedSupply.data?.usage_type || selectedSupply.usage_type || '').toUpperCase();
                          if (ut === 'OPD') return (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500" />
                              ผู้ป่วยนอก (OPD)
                            </Badge>
                          );
                          if (ut === 'IPD') return (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-purple-500" />
                              ผู้ป่วยใน (IPD)
                            </Badge>
                          );
                          return <span className="text-gray-400 text-sm">-</span>;
                        })()}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">จำนวนรายการ</p>
                      <p className="font-semibold">
                        {selectedSupply.supplies_count || selectedSupply.data?.supplies_count ||
                          (selectedSupply.data?.supply_items || selectedSupply.supply_items || []).length || 0}{' '}
                        รายการ
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">สถานะใบเสร็จ</p>
                      <div className="mt-1">
                        {(() => {
                          const status = selectedSupply.data?.billing_status || selectedSupply.billing_status;
                          if (!status) {
                            return (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-500" />
                                ไม่ระบุ
                              </Badge>
                            );
                          }
                          const statusLower = status.toLowerCase();
                          if (statusLower === 'cancelled') {
                            return (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500" />
                                ยกเลิก
                              </Badge>
                            );
                          }
                          if (statusLower === 'paid') {
                            return (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500" />
                                ชำระแล้ว
                              </Badge>
                            );
                          }
                          if (statusLower === 'pending') {
                            return (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-yellow-500" />
                                รอชำระ
                              </Badge>
                            );
                          }
                          return (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500" />
                              {status}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">วันเวลา</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">เวลาที่เบิก</p>
                        <p className="font-semibold">
                          {formatDate(
                            selectedSupply.created_at ||
                              selectedSupply.data?.created_at ||
                              selectedSupply.data?.usage_datetime
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date and TimeBillPrinted</p>
                        <p className="font-semibold">
                          {formatPrintDateTime(
                            selectedSupply.data?.print_date || selectedSupply.print_date,
                            selectedSupply.data?.time_print_date || selectedSupply.time_print_date
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">วันที่แก้ไขล่าสุด</p>
                        <p className="font-semibold">
                          {(selectedSupply.updated_at || selectedSupply.data?.updated_at)
                            ? formatDate(selectedSupply.updated_at || selectedSupply.data?.updated_at)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>รายการอุปกรณ์ที่เบิก</CardTitle>
                <CardDescription>รายละเอียดอุปกรณ์ทั้งหมดที่เบิกในครั้งนี้</CardDescription>
              </CardHeader>
              <CardContent className="px-4 py-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ลำดับ</TableHead>
                        <TableHead>รหัสอุปกรณ์</TableHead>
                        <TableHead>ชื่ออุปกรณ์</TableHead>
                        <TableHead className="text-center">จำนวน</TableHead>
                        <TableHead>หน่วย</TableHead>
                        <TableHead>Assession No</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const supplyItems = selectedSupply.data?.supply_items || selectedSupply.supply_items || [];

                        if (supplyItems.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                ไม่มีรายการอุปกรณ์
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return supplyItems
                          .map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.order_item_code || item.supply_code || '-'} 
                            </TableCell>
                            <TableCell>
                              {item.order_item_description || item.supply_name || '-'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {item.qty || item.quantity || 0}
                            </TableCell>
                            <TableCell>{item.uom || item.unit || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.assession_no || '-'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const status = item.order_item_status || '-';
                                const statusLower = status.toLowerCase();

                                if (statusLower === 'discontinue' || statusLower === 'discontinued') {
                                  return (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>
                                      ยกเลิก
                                    </Badge>
                                  );
                                } else if (statusLower === 'verified') {
                                  return (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500"></span>
                                      ยืนยันแล้ว
                                    </Badge>
                                  );
                                } else if (status === '-') {
                                  return <span className="text-gray-400">-</span>;
                                } else {
                                  return (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500"></span>
                                      {status}
                                    </Badge>
                                  );
                                }
                              })()}
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Cancel Bill Dialog */}
      <CancelBillDialog
        open={cancelBillDialogOpen}
        onOpenChange={setCancelBillDialogOpen}
        supply={selectedSupplyForCancel}
        onSuccess={handleCancelBillSuccess}
      />
    </>
  );
}
