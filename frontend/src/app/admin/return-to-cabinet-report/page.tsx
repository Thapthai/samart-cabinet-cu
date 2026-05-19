'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi, vendingReportsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import FilterSection from './components/FilterSection';
import ReturnedTable from './components/ReturnedTable';
import type { DispensedItem, FilterState, SummaryData } from './types.ts';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReturnToCabinetReportPage() {
  const { user } = useAuth();
  const [loadingList, setLoadingList] = useState(true);
  const [returnedList, setReturnedList] = useState<DispensedItem[]>([]);

  // Filters (ค่าเริ่มต้นแผนก/ตู้ = ทั้งหมด เหมือน dispense-from-cabinet)
  const [filters, setFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentId: '29',
    cabinetId: '1',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // โหลดข้อมูลเมื่อมี user พร้อมค่าเริ่มต้นของแผนก/ตู้
  useEffect(() => {
    if (!user?.id) return;
    fetchReturnedList(1);
  }, [user?.id]);

  const fetchReturnedList = async (page: number = 1, overrideFilters?: FilterState) => {
    try {
      setLoadingList(true);
      const activeFilters = overrideFilters ?? filters;
      const params: any = {
        page,
        limit: itemsPerPage,
      };
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
      if (activeFilters.itemTypeFilter && activeFilters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(activeFilters.itemTypeFilter);
      }
      if (activeFilters.departmentId) params.departmentId = activeFilters.departmentId;
      if (activeFilters.cabinetId) params.cabinetId = activeFilters.cabinetId;

      const response = await medicalSuppliesApi.getReturnedItems(params) as any;

      if (response.success || response.data) {
        // Backend returns: { success: true, data: [...], total, page, limit, totalPages }
        const returnedData = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || response.data || []);

        const total = response.total ?? 0;
        const limit = response.limit || itemsPerPage;
        const totalPagesNum = response.totalPages ?? (total > 0 ? Math.ceil(total / limit) : 1);
        const currentPageNum = response.page || page;

        setReturnedList(returnedData);
        setTotalItems(total);
        setTotalPages(totalPagesNum);
        setCurrentPage(currentPageNum);

        if (returnedData.length === 0) {
          toast.info('ไม่พบข้อมูลการคืนอุปกรณ์เข้าตู้ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
        } else {
          toast.success(`พบ ${total} รายการเติมอุปกรณ์เข้าตู้`);
        }
      } else {
        toast.error((response as any)?.error || (response as any)?.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchReturnedList(1);
  };

  const handleClearSearch = () => {
    const resetFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentId: '29',
      cabinetId: '1',
    };
    setFilters(resetFilters);
    setCurrentPage(1);
    fetchReturnedList(1, resetFilters);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      const params: any = {};
      if (filters.searchItemCode) params.keyword = filters.searchItemCode;
      if (filters.itemTypeFilter && filters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(filters.itemTypeFilter);
      }
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.cabinetId) params.cabinetId = filters.cabinetId;

      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);

      if (format === 'excel') {
        await vendingReportsApi.downloadReturnToCabinetReportExcel(params);
      } else {
        await vendingReportsApi.downloadReturnToCabinetReportPdf(params);
      }

      toast.success(`กำลังดาวน์โหลดรายงาน ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    }
  };

  const calculateSummary = (): SummaryData => {
    const totalQty = returnedList.reduce((sum, item) => sum + (item.qty || 0), 0);
    return {
      total: totalItems,
      totalQty,
    };
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchReturnedList(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getItemTypes = () => {
    const types = new Map();
    returnedList.forEach(item => {
      if (item.itemtypeID && item.itemType) {
        types.set(item.itemtypeID, item.itemType);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id: id.toString(), name }));
  };

  const summary = calculateSummary();

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                รายงานเติมอุปกรณ์เข้าตู้
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                รายการอุปกรณ์ทั้งหมดที่เติมเข้าตู้ SmartCabinet
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">รายการทั้งหมด</p>
              <p className="text-2xl font-bold text-green-900">{summary.total}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">จำนวนรวม</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalQty}</p>
            </div>
          </div>

          {/* Filter Section */}
          <FilterSection
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            onRefresh={() => fetchReturnedList(currentPage)}
            itemTypes={getItemTypes()}
            loading={loadingList}
          />

          {/* Returned Items Table */}
          <ReturnedTable
            loading={loadingList}
            items={returnedList}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            searchItemCode={filters.searchItemCode}
            itemTypeFilter={filters.itemTypeFilter}
            onPageChange={handlePageChange}
            onExportExcel={() => handleExportReport('excel')}
            onExportPdf={() => handleExportReport('pdf')}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
