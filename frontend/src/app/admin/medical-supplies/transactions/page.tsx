'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { FileText, Search, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TransactionsTable from './components/TransactionsTable';
import { ExpireDateInput } from '@/components/ExpireDateInput';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [filters, setFilters] = useState({
    visitDate: getTodayDate(), // Default to today
    patientHN: '',
    en: '',
    firstName: '',
    lastName: '',
    itemCode: '',
    assessionNo: '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [user?.id]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 10000, // Large limit to get all data for filtering
      };

      // Use visit_date for filtering by visit date
      if (filters.visitDate) {
        params.visit_date = filters.visitDate;
      }
      if (filters.patientHN) params.patient_hn = filters.patientHN;
      if (filters.en) params.en = filters.en;
      // Combine firstName and lastName into keyword for backend search
      if (filters.firstName || filters.lastName) {
        params.keyword = `${filters.firstName} ${filters.lastName}`.trim();
      }

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
        
        // Flatten supply_items to create transaction list
        const flattenedTransactions: any[] = [];
        dataArray.forEach((supply: any) => {
          const supplyData = supply.data || supply;
          const supplyItems = supplyData.supply_items || [];
          
          supplyItems.forEach((item: any) => {
            // Filter by item code and assession no if provided
            if (filters.itemCode && 
                !item.order_item_code?.toLowerCase().includes(filters.itemCode.toLowerCase()) && 
                !item.supply_code?.toLowerCase().includes(filters.itemCode.toLowerCase())) {
              return;
            }
            if (filters.assessionNo && 
                !item.assession_no?.toLowerCase().includes(filters.assessionNo.toLowerCase())) {
              return;
            }
            
            // Additional filter by firstName/lastName if provided
            if (filters.firstName && 
                !supplyData.first_name?.toLowerCase().includes(filters.firstName.toLowerCase())) {
              return;
            }
            if (filters.lastName && 
                !supplyData.lastname?.toLowerCase().includes(filters.lastName.toLowerCase())) {
              return;
            }
            
            flattenedTransactions.push({
              ...item,
              usage_id: supplyData.id || supply.id,
              patient_hn: supplyData.patient_hn,
              en: supplyData.en,
              first_name: supplyData.first_name,
              lastname: supplyData.lastname,
              created_at: supplyData.created_at || supply.created_at,
              recorded_by_name: supplyData.recorded_by_name || supply.recorded_by_name,
            });
          });
        });
        
        setTransactions(flattenedTransactions);
        
        // Calculate total pages from transactions
        const calculatedPages = Math.ceil(flattenedTransactions.length / itemsPerPage);
        
        setTotalPages(calculatedPages || 1);
        setTotalItems(flattenedTransactions.length);
      } else {
        setTransactions([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
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
    fetchTransactions();
  };

  const handleReset = () => {
    setFilters({
      visitDate: getTodayDate(),
      patientHN: '',
      en: '',
      firstName: '',
      lastName: '',
      itemCode: '',
      assessionNo: '',
    });
    setCurrentPage(1);
    fetchTransactions();
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Transaction การเบิกอุปกรณ์
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ข้อมูลการบันทึกใช้อุปกรณ์กับคนไข้ที่ส่งจาก HIS ของโรงพยาบาล
                </p>
              </div>
            </div>
          </div>

          {/* Search Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitDate">วันที่คนไข้เข้ารับบริการ</Label>
                <ExpireDateInput
                  id="visitDate"
                  value={filters.visitDate}
                  onChange={(ymd) => setFilters({ ...filters, visitDate: ymd })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientHN">HN</Label>
                <Input
                  id="patientHN"
                  placeholder="HN..."
                  value={filters.patientHN}
                  onChange={(e) => setFilters({ ...filters, patientHN: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="en">EN</Label>
                <Input
                  id="en"
                  placeholder="EN..."
                  value={filters.en}
                  onChange={(e) => setFilters({ ...filters, en: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">ชื่อ (Fname)</Label>
                <Input
                  id="firstName"
                  placeholder="ชื่อ..."
                  value={filters.firstName}
                  onChange={(e) => setFilters({ ...filters, firstName: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">นามสกุล (Lname)</Label>
                <Input
                  id="lastName"
                  placeholder="นามสกุล..."
                  value={filters.lastName}
                  onChange={(e) => setFilters({ ...filters, lastName: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemCode">รหัสอุปกรณ์ (รายการ)</Label>
                <Input
                  id="itemCode"
                  placeholder="รหัสอุปกรณ์..."
                  value={filters.itemCode}
                  onChange={(e) => setFilters({ ...filters, itemCode: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assessionNo">Assession No</Label>
                <Input
                  id="assessionNo"
                  placeholder="Assession No..."
                  value={filters.assessionNo}
                  onChange={(e) => setFilters({ ...filters, assessionNo: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
              <Button onClick={fetchTransactions} variant="outline" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                โหลดใหม่
              </Button>
            </div>
          </div>

          {/* Table */}
          <TransactionsTable
            loading={loading}
            transactions={transactions}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            filters={filters}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

