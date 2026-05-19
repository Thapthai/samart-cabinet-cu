'use client';

import { useEffect, useState } from 'react';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import type { Item } from '@/types/item';
import { toast } from 'sonner';
import { Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { staffReportApi } from '@/lib/staffApi/reportApi';
import CreateItemDialog from './components/CreateItemDialog';
import EditItemDialog from './components/EditItemDialog';
import DeleteItemDialog from './components/DeleteItemDialog';
import UpdateMinMaxDialog from './components/UpdateMinMaxDialog';
import FilterSection from './components/FilterSection';
import ItemsTable from './components/ItemsTable';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMinMaxDialog, setShowMinMaxDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [reportLoading, setReportLoading] = useState<'excel' | 'pdf' | null>(null);
  const [staffDepartmentId, setStaffDepartmentId] = useState<string>('');

  // Active filters (after search button clicked)
  const [activeFilters, setActiveFilters] = useState({
    searchTerm: '',
    departmentId: '29',
    cabinetId: '1',
    statusFilter: 'all',
    keyword: '',
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10; // Table layout

  // โหลด department_id จาก localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('staff_user');
      if (raw) {
        const staffUser = JSON.parse(raw.trim());
        if (staffUser?.department_id) {
          const deptId = String(staffUser.department_id);
          setStaffDepartmentId(deptId);
          setActiveFilters(prev => ({ ...prev, departmentId: deptId }));
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [currentPage, activeFilters]);

  useEffect(() => {
    filterItems();
  }, [items, activeFilters.statusFilter]);

  const fetchItems = async () => {
    try {

      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: itemsPerPage,
        keyword: activeFilters.keyword || activeFilters.searchTerm || undefined,
        status: 'ACTIVE',
      };

      if (activeFilters.departmentId && activeFilters.departmentId !== "") {
        const deptId = parseInt(activeFilters.departmentId);
        if (!isNaN(deptId)) {
          params.department_id = deptId;
        }
      }

      if (activeFilters.cabinetId && activeFilters.cabinetId !== "") {
        const cabId = parseInt(activeFilters.cabinetId);
        if (!isNaN(cabId)) {
          params.cabinet_id = cabId;
        }
      }

      const response = await staffItemsApi.getAll(params);
      if (response.data) {
        const list = Array.isArray(response?.data) ? response.data : (response as any)?.data?.data;
        if (Array.isArray(list)) {
          setItems(list);
          setTotalItems((response as any).total ?? list.length);
          setTotalPages((response as any).lastPage ?? Math.ceil(((response as any).total ?? list.length) / itemsPerPage));
        }
      }

    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('ไม่สามารถโหลดข้อมูลอุปกรณ์ได้');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Filter by status (client-side)
    if (activeFilters.statusFilter !== 'all') {
      filtered = filtered.filter(item =>
        activeFilters.statusFilter === 'active' ? item.item_status === 0 : item.item_status !== 0
      );
    }

    setFilteredItems(filtered);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (filters: {
    searchTerm: string;
    departmentId: string;
    cabinetId: string;
    statusFilter: string;
    keyword: string;
  }) => {
    setActiveFilters(filters);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleDelete = (item: Item) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleUpdateMinMax = (item: Item) => {
    setSelectedItem(item);
    setShowMinMaxDialog(true);
  };

  const handleDownloadCabinetStockExcel = async () => {
    try {
      setReportLoading('excel');
      const cabinetId = activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined;
      const departmentId = activeFilters.departmentId ? parseInt(activeFilters.departmentId, 10) : undefined;
      await staffReportApi.downloadCabinetStockExcel({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  const handleDownloadCabinetStockPdf = async () => {
    try {
      setReportLoading('pdf');
      const cabinetId = activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : undefined;
      const departmentId = activeFilters.departmentId ? parseInt(activeFilters.departmentId, 10) : undefined;
      await staffReportApi.downloadCabinetStockPdf({ cabinetId, departmentId });
      toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการสต๊อกอุปกรณ์ในตู้</h1>
              <p className="text-sm text-gray-500">รายการอุปกรณ์ทั้งหมดในระบบ</p>
            </div>
          </div>
          {/* ให้เหมือน admin: ไม่แสดงปุ่มรีเฟรช/เพิ่มอุปกรณ์ */}
          {/* <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchItems()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มอุปกรณ์
            </Button>
          </div> */}
        </div>

        {/* Filter Section */}
        <FilterSection
          onSearch={handleSearch}
          onBeforeSearch={() => setCurrentPage(1)}
          initialDepartmentId={staffDepartmentId}
          departmentDisabled={!!staffDepartmentId}
        />

        {/* Table Section */}
        <ItemsTable
          items={filteredItems}
          loading={loading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdateMinMax={handleUpdateMinMax}
            onPageChange={handlePageChange}
            headerActions={
            <div className="flex flex-wrap items-center gap-2">
              {/* <span className="text-sm text-gray-600">รายงานสต๊อกอุปกรณ์ในตู้:</span> */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCabinetStockExcel}
                disabled={reportLoading !== null}
              >
                <Download className="h-4 w-4 mr-1.5" />
                {reportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadCabinetStockPdf}
                disabled={reportLoading !== null}
              >
                <Download className="h-4 w-4 mr-1.5" />
                {reportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
              </Button>
            </div>
          }
        />
      </div>

      <CreateItemDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchItems}
      />

      <EditItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={selectedItem}
        onSuccess={fetchItems}
      />

      <DeleteItemDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={selectedItem}
        onSuccess={fetchItems}
      />

      <UpdateMinMaxDialog
        open={showMinMaxDialog}
        onOpenChange={setShowMinMaxDialog}
        item={selectedItem}
        cabinetId={activeFilters.cabinetId ? (() => {
          const n = parseInt(activeFilters.cabinetId, 10);
          return Number.isNaN(n) ? undefined : n;
        })() : undefined}
        onSuccess={fetchItems}
      />
    </>
  );
}
