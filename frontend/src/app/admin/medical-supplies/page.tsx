'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi, vendingReportsApi, departmentApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { ExpireDateInput } from '@/components/ExpireDateInput';

export default function MedicalSuppliesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<any>(null);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [cancelBillDialogOpen, setCancelBillDialogOpen] = useState(false);
  const [selectedSupplyForCancel, setSelectedSupplyForCancel] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

  // Departments for search dropdown (admin)
  const [departments, setDepartments] = useState<Array<{ ID: number; DepName: string | null; DepName2: string | null }>>([]);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Form filters (for display in form, doesn't trigger search)
  const [formFilters, setFormFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    patientHN: '',
    keyword: '',
    userName: '',
    firstName: '',
    lastName: '',
    assessionNo: '',
    itemName: '',
    departmentCode: '',
    usageType: '',
    printDate: '',
    timePrintDate: '',
  });

  // Active filters (for actual search, triggers fetchSupplies)
  const [activeFilters, setActiveFilters] = useState({
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    patientHN: '',
    keyword: '',
    userName: '',
    firstName: '',
    lastName: '',
    assessionNo: '',
    itemName: '',
    departmentCode: '',
    usageType: '',
    printDate: '',
    timePrintDate: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;


  const fetchSupplies = async (customFilters?: typeof activeFilters, customPage?: number) => {
    try {
      setLoading(true);
      const filtersToUse = customFilters || activeFilters;
      const activePage = customPage !== undefined ? customPage : currentPage;

      const params: any = {
        page: activePage,
        limit: itemsPerPage,
      };

      if (filtersToUse.startDate) params.startDate = filtersToUse.startDate;
      if (filtersToUse.endDate) params.endDate = filtersToUse.endDate;
      if (filtersToUse.userName) params.user_name = filtersToUse.userName;
      if (filtersToUse.itemName) params.keyword = filtersToUse.itemName;
      if (filtersToUse.patientHN?.trim()) params.patient_hn = filtersToUse.patientHN.trim();
      if (filtersToUse.firstName?.trim()) params.first_name = filtersToUse.firstName.trim();
      if (filtersToUse.lastName?.trim()) params.lastname = filtersToUse.lastName.trim();
      if (filtersToUse.assessionNo?.trim()) params.assession_no = filtersToUse.assessionNo.trim();
      if (filtersToUse.departmentCode?.trim()) params.department_code = filtersToUse.departmentCode.trim();
      if (filtersToUse.usageType?.trim()) params.usage_type = filtersToUse.usageType.trim();
      if (filtersToUse.printDate?.trim()) params.print_date = filtersToUse.printDate.trim();
      if (filtersToUse.timePrintDate?.trim()) params.time_print_date = filtersToUse.timePrintDate.trim();

      const response: any = await medicalSuppliesApi.getAll(params);

      if (response?.success === false) {
        toast.error(response.message || 'โหลดข้อมูลไม่สำเร็จ');
        setSupplies([]);
        setTotalPages(1);
        setTotalItems(0);
        return;
      }
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

  // Load departments for admin filter dropdown
  useEffect(() => {
    const load = async () => {
      try {
        const res = await departmentApi.getAll({ limit: 500 });
        if (res?.data && Array.isArray(res.data)) setDepartments(res.data);
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  // Update fetchSupplies when activeFilters or currentPage change
  useEffect(() => {
    if (user?.id) {
      fetchSupplies(activeFilters, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeFilters, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = () => {
    // Copy formFilters to activeFilters to trigger search
    setActiveFilters(formFilters);
    setCurrentPage(1);
    // useEffect will trigger fetchSupplies when activeFilters and currentPage change
  };

  const handleReset = () => {
    const resetFilters = {
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      patientHN: '',
      keyword: '',
      userName: '',
      firstName: '',
      lastName: '',
      assessionNo: '',
      itemName: '',
      departmentCode: '',
      usageType: '',
      printDate: '',
      timePrintDate: '',
    };
    setFormFilters(resetFilters);
    setActiveFilters(resetFilters);
    setCurrentPage(1);
    setSelectedSupply(null);
    setSelectedSupplyId(null);
    setDepartmentSearch('');
    // useEffect will trigger fetchSupplies when activeFilters and currentPage change
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

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      setExportLoading(format);
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);

      const params = {
        keyword: activeFilters.itemName || undefined,
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        patientHn: activeFilters.patientHN || undefined,
        departmentCode: activeFilters.departmentCode || undefined,
        usageType: activeFilters.usageType || undefined,
      };

      if (format === 'excel') {
        await vendingReportsApi.downloadDispensedItemsForPatientsExcel(params);
      } else {
        await vendingReportsApi.downloadDispensedItemsForPatientsPdf(params);
      }

      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    } finally {
      setExportLoading(null);
    }
  };


  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
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
            <div className="flex items-center space-x-2 font-bold text-lg mb-4">
              วันที่เบิกอุปกรณ์ใช้กับคนไข้
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                <ExpireDateInput
                  id="startDate"
                  value={formFilters.startDate}
                  onChange={(ymd) => setFormFilters({ ...formFilters, startDate: ymd })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                <ExpireDateInput
                  id="endDate"
                  value={formFilters.endDate}
                  onChange={(ymd) => setFormFilters({ ...formFilters, endDate: ymd })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemName">ค้นหารายการ (ชื่ออุปกรณ์)</Label>
                <Input
                  id="itemName"
                  placeholder="กรอกชื่ออุปกรณ์..."
                  value={formFilters.itemName}
                  onChange={(e) => setFormFilters({ ...formFilters, itemName: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label>แผนก</Label>
                <DropdownMenu open={departmentDropdownOpen} onOpenChange={setDepartmentDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                      type="button"
                    >
                      <span className="truncate">
                        {formFilters.departmentCode
                          ? (departments.find((d) => String(d.ID) === formFilters.departmentCode)?.DepName ||
                            departments.find((d) => String(d.ID) === formFilters.departmentCode)?.DepName2 ||
                            `แผนก ${formFilters.departmentCode}`)
                          : 'เลือกแผนก...'}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1">
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="ค้นหาแผนก..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-auto">
                      <button
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setFormFilters({ ...formFilters, departmentCode: '' });
                          setDepartmentDropdownOpen(false);
                          setDepartmentSearch('');
                        }}
                      >
                        -- ทุกแผนก --
                      </button>
                      {departments
                        .filter(
                          (d) =>
                            !departmentSearch.trim() ||
                            (d.DepName?.toLowerCase().includes(departmentSearch.toLowerCase()) ||
                              d.DepName2?.toLowerCase().includes(departmentSearch.toLowerCase()))
                        )
                        .map((dept) => (
                          <button
                            key={dept.ID}
                            type="button"
                            className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                            onClick={() => {
                              setFormFilters({ ...formFilters, departmentCode: String(dept.ID) });
                              setDepartmentDropdownOpen(false);
                              setDepartmentSearch('');
                            }}
                          >
                            {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                          </button>
                        ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <Label>ประเภทผู้ป่วย</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formFilters.usageType}
                  onChange={(e) => setFormFilters({ ...formFilters, usageType: e.target.value })}
                >
                  <option value="">-- ทั้งหมด --</option>
                  <option value="OPD">ผู้ป่วยนอก (OPD)</option>
                  <option value="IPD">ผู้ป่วยใน (IPD)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="printDate">วันที่พิมพ์บิล</Label>
                <ExpireDateInput
                  id="printDate"
                  value={formFilters.printDate}
                  onChange={(ymd) => setFormFilters({ ...formFilters, printDate: ymd })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timePrintDate">เวลาที่พิมพ์บิล</Label>
                <Input
                  id="timePrintDate"
                  type="time"
                  value={formFilters.timePrintDate}
                  onChange={(e) => setFormFilters({ ...formFilters, timePrintDate: e.target.value })}
                />
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
              <Button onClick={() => fetchSupplies()} variant="outline" disabled={loading}>
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
            filters={activeFilters}
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
                    {/* ข้อมูลผู้ป่วยและผู้เบิก */}
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

                    {/* วันเวลา — อยู่ด้านล่าง */}
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
                          <p className="text-sm text-gray-500">วันที่และเวลาที่พิมพ์บิล</p>
                          <p className="font-semibold">
                            {(() => {
                              const printDate = selectedSupply.data?.print_date || selectedSupply.print_date;
                              const timePrintDate = selectedSupply.data?.time_print_date || selectedSupply.time_print_date;
                              if (!printDate?.trim() && !timePrintDate?.trim()) return '-';
                              const dateTimeStr = printDate?.trim()
                                ? (printDate.includes('T') ? printDate : `${printDate}T${timePrintDate?.trim() || '00:00:00'}`)
                                : null;
                              return dateTimeStr ? formatDate(dateTimeStr) : '-';
                            })()}
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
      </AppLayout>
    </ProtectedRoute>
  );
}
