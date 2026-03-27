'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { weighingApi, cabinetApi, reportsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Package, Search, X, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Pagination from '@/components/Pagination';

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DetailRow {
  id: number;
  itemcode: string;
  HnCode: string;
  StockID: number;
  SlotNo: number;
  Sensor: number;
  Qty: number;
  ModifyDate: string;
  Sign: string;
  item?: {
    itemcode: string;
    itemname: string | null;
    Alternatename: string | null;
    Barcode: string | null;
  } | null;
  userCabinet?: {
    legacyUser?: {
      employee?: { FirstName: string | null; LastName: string | null } | null;
    } | null;
  } | null;
}

interface CabinetOption {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  stock_id?: number | null;
}

export default function WeighingDispensePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<DetailRow[]>([]);
  const [cabinets, setCabinets] = useState<CabinetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(true);
  const [itemcodeFilter, setItemcodeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockIdFilter, setStockIdFilter] = useState<string>('');
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const [dateFrom, setDateFrom] = useState(getTodayISO);
  const [dateTo, setDateTo] = useState(getTodayISO);
  const [dateFromFilter, setDateFromFilter] = useState(getTodayISO);
  const [dateToFilter, setDateToFilter] = useState(getTodayISO);

  useEffect(() => {
    if (user?.id) fetchCabinets();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchList();
  }, [user?.id, currentPage, itemcodeFilter, stockIdFilter, dateFromFilter, dateToFilter]);

  const fetchCabinets = async () => {
    try {
      setLoadingCabinets(true);
      const res = await cabinetApi.getAll({ page: 1, limit: 200 });
      const data = (res as { success?: boolean; data?: CabinetOption[] }).data;
      const list = Array.isArray(data) ? data : [];
      setCabinets(list.filter((c) => c.stock_id != null));
    } catch {
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await weighingApi.getDetailsBySign({
        sign: '-',
        page: currentPage,
        limit: itemsPerPage,
        itemName: itemcodeFilter || undefined,
        stockId: stockIdFilter ? parseInt(stockIdFilter, 10) : undefined,
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
      });
      if (res?.success && Array.isArray(res.data)) {
        setItems(res.data);
        setTotalItems(res.pagination?.total ?? res.data.length);
        setTotalPages(res.pagination?.totalPages ?? 1);
      } else {
        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
      }
    } catch (e) {
      console.error(e);
      toast.error('โหลดข้อมูลไม่สำเร็จ');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setItemcodeFilter(searchTerm.trim());
    setStockIdFilter(selectedStockId);
    setDateFromFilter(dateFrom);
    setDateToFilter(dateTo);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchTerm('');
    setItemcodeFilter('');
    setStockIdFilter('');
    setSelectedStockId('');
    const today = getTodayISO();
    setDateFrom(today);
    setDateTo(today);
    setDateFromFilter(today);
    setDateToFilter(today);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = itemcodeFilter || stockIdFilter || dateFromFilter !== getTodayISO() || dateToFilter !== getTodayISO();
  const totalQty = items.reduce((sum, row) => sum + (row.Qty ?? 0), 0);

  const formatDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const sec = String(date.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${sec}`;
  };

  const handleDownloadWeighingDispenseExcel = async () => {
    try {
      setExportLoading('excel');
      const stockId = stockIdFilter ? parseInt(stockIdFilter, 10) : undefined;
      const itemName = itemcodeFilter || undefined;
      await reportsApi.downloadWeighingDispenseExcel({ stockId, itemName, dateFrom: dateFromFilter, dateTo: dateToFilter });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadWeighingDispensePdf = async () => {
    try {
      setExportLoading('pdf');
      const stockId = stockIdFilter ? parseInt(stockIdFilter, 10) : undefined;
      const itemName = itemcodeFilter || undefined;
      await reportsApi.downloadWeighingDispensePdf({ stockId, itemName, dateFrom: dateFromFilter, dateTo: dateToFilter });
      toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl shadow-sm">
              <Package className="h-7 w-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เบิกอุปกรณ์จากตู้ Weighing</h1>
              <p className="text-sm text-gray-500 mt-0.5">การเบิกอุปกรณ์จากตู้ Weighing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50/80 border border-blue-100 p-5 rounded-xl shadow-sm">
              <p className="text-sm text-blue-600 font-medium">รายการทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-900 mt-0.5">{totalItems}</p>
            </div>
            <div className="bg-green-50/80 border border-green-100 p-5 rounded-xl shadow-sm">
              <p className="text-sm text-green-600 font-medium">จำนวนรวม (Qty)</p>
              <p className="text-2xl font-bold text-green-900 mt-0.5">{totalQty}</p>
            </div>
          </div>

          <Card className="border-purple-100/80 bg-gradient-to-br from-slate-50 to-purple-50/40 shadow-sm overflow-hidden">
            <CardContent className="pt-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">ชื่ออุปกรณ์</label>
                  <Input
                    placeholder="พิมพ์ชื่ออุปกรณ์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-white border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">ตู้ (Cabinet)</label>
                  <Select
                    value={selectedStockId || 'all'}
                    onValueChange={(v) => setSelectedStockId(v === 'all' ? '' : v)}
                    disabled={loadingCabinets}
                  >
                    <SelectTrigger className="w-full bg-white border-gray-200">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {cabinets.map((c) => (
                        <SelectItem key={c.id} value={String(c.stock_id)}>
                          {c.cabinet_name || c.cabinet_code || `Stock ${c.stock_id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-white border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-white border-gray-200"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSearch} disabled={loading} className="shadow-sm">
                  <Search className="h-4 w-4 mr-2" />
                  ค้นหา
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="border-gray-300"
                  disabled={!hasActiveFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  ล้าง
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200/80 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-slate-50/50">
              <CardTitle className="text-lg">รายการเบิกอุปกรณ์จากตู้ Weighing</CardTitle>
              
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">ทั้งหมด {totalItems} รายการ</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadWeighingDispenseExcel}
                    disabled={exportLoading !== null}
                    className="shadow-sm"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    {exportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadWeighingDispensePdf}
                    disabled={exportLoading !== null}
                    className="shadow-sm"
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    {exportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {loading ? (
                <div className="py-12 text-center text-muted-foreground">กำลังโหลด...</div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">ไม่พบข้อมูล</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 border-b">
                          <TableHead className="w-14 text-center font-semibold">ลำดับ</TableHead>
                          <TableHead className="min-w-[180px] font-semibold">ชื่อสินค้า</TableHead>
                          <TableHead className="min-w-[120px] font-semibold">ผู้ดำเนินการ</TableHead>
                          <TableHead className="w-20 text-center font-semibold">จำนวน</TableHead>
                          <TableHead className="min-w-[140px] text-right font-semibold">วันที่แก้ไข</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((row, index) => (
                          <TableRow key={`${row.id}-${index}`} className="hover:bg-slate-50/80">
                            <TableCell className="text-center text-muted-foreground tabular-nums">
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate font-medium" title={row.item?.itemname ?? undefined}>
                              {row.item?.itemname || row.item?.Alternatename || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700">
                              {row.userCabinet?.legacyUser?.employee
                                ? [row.userCabinet.legacyUser.employee.FirstName, row.userCabinet.legacyUser.employee.LastName].filter(Boolean).join(' ') || '-'
                                : '-'}
                            </TableCell>
                            <TableCell className="text-center tabular-nums font-medium">{row.Qty}</TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                              {formatDate(row.ModifyDate)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="pt-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        loading={loading}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
