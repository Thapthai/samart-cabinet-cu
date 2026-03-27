'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { weighingApi, cabinetApi, reportsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Package, Search, X, Download, Settings2 } from 'lucide-react';
import type { Item } from '@/types/item';
import UpdateMinMaxDialog from '../items/components/UpdateMinMaxDialog';
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

export interface ItemSlotInCabinetRow {
  id: number;
  itemcode: string;
  StockID: number;
  SlotNo: number;
  Sensor: number;
  Qty: number;
  cabinet?: { id: number; cabinet_name: string | null; cabinet_code: string | null; stock_id: number | null } | null;
  item?: {
    itemcode: string;
    itemname: string | null;
    Alternatename: string | null;
    Barcode: string | null;
    stock_min?: number | null;
    stock_max?: number | null;
  } | null;
  cabinetItemSetting?: { stock_min: number | null; stock_max: number | null } | null;
  _count?: { itemSlotInCabinetDetail: number };
}

interface CabinetOption {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  stock_id?: number | null;
}

export default function WeighingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemSlotInCabinetRow[]>([]);
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
  const [minMaxOpen, setMinMaxOpen] = useState(false);
  const [minMaxRow, setMinMaxRow] = useState<ItemSlotInCabinetRow | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchCabinets();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchList();
  }, [user?.id, currentPage, itemcodeFilter, stockIdFilter]);

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
      const res = await weighingApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        itemName: itemcodeFilter || undefined,
        stockId: stockIdFilter ? parseInt(stockIdFilter, 10) : undefined,
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
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchTerm('');
    setItemcodeFilter('');
    setStockIdFilter('');
    setSelectedStockId('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = itemcodeFilter || stockIdFilter;

  const formatMinMax = (v: number | null | undefined) =>
    v != null && v !== undefined ? String(v) : '—';

  const effectiveMin = (row: ItemSlotInCabinetRow) =>
    row.cabinetItemSetting?.stock_min ?? row.item?.stock_min;
  const effectiveMax = (row: ItemSlotInCabinetRow) =>
    row.cabinetItemSetting?.stock_max ?? row.item?.stock_max;

  const rowToDialogItem = (row: ItemSlotInCabinetRow): Item =>
    ({
      itemcode: row.itemcode,
      itemname: row.item?.itemname ?? row.item?.Alternatename,
      stock_min: effectiveMin(row) ?? 0,
      stock_max: effectiveMax(row) ?? 0,
      stock_balance: row.Qty,
    }) as Item;

  const openMinMaxDialog = (row: ItemSlotInCabinetRow) => {
    if (!row.cabinet?.id) {
      toast.error('ไม่พบข้อมูลตู้สำหรับรายการนี้');
      return;
    }
    setMinMaxRow(row);
    setMinMaxOpen(true);
  };

  /** สล็อต 1 = ใน, 2 = นอก */
  const formatSlotDisplay = (value: number | null | undefined) =>
    value === 1 ? 'ใน' : value === 2 ? 'นอก' : value != null ? String(value) : '-';

  const handleDownloadWeighingStockExcel = async () => {
    try {
      setExportLoading('excel');
      const stockId = stockIdFilter ? parseInt(stockIdFilter, 10) : undefined;
      const itemName = itemcodeFilter || undefined;
      await reportsApi.downloadWeighingStockExcel({ stockId, itemName });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadWeighingStockPdf = async () => {
    try {
      setExportLoading('pdf');
      const stockId = stockIdFilter ? parseInt(stockIdFilter, 10) : undefined;
      const itemName = itemcodeFilter || undefined;
      await reportsApi.downloadWeighingStockPdf({ stockId, itemName });
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
        <UpdateMinMaxDialog
          open={minMaxOpen}
          onOpenChange={(open) => {
            setMinMaxOpen(open);
            if (!open) setMinMaxRow(null);
          }}
          item={minMaxRow ? rowToDialogItem(minMaxRow) : null}
          cabinetId={minMaxRow?.cabinet?.id}
          minMaxEndpoint="weighing"
          onSuccess={() => {
            fetchList();
          }}
        />
        <div className="space-y-6 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
              <Package className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">สต๊อกอุปกรณ์ในตู้ Weighing</h1>
              <p className="text-sm text-gray-500 mt-0.5">เมนูสต๊อกอุปกรณ์ที่มีในตู้ Weighing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50/80 border border-blue-100 p-5 rounded-xl shadow-sm">
              <p className="text-sm text-blue-600 font-medium">รายการทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-900 mt-0.5">{totalItems}</p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200 p-5 rounded-xl shadow-sm">
              <p className="text-sm text-slate-600 font-medium">จำนวนรวม (Qty)</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{items.reduce((sum, row) => sum + (row.Qty ?? 0), 0)}</p>
            </div>
          </div>

          <Card className="border-blue-100/80 bg-gradient-to-br from-slate-50 to-blue-50/40 shadow-sm overflow-hidden">
            <CardContent className="pt-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    ชื่ออุปกรณ์
                  </label>
                  <Input
                    placeholder="พิมพ์ชื่ออุปกรณ์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full bg-white border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    ตู้ (Cabinet)
                  </label>
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
              <CardTitle className="text-lg">รายการสต๊อกในตู้ Weighing</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  ทั้งหมด {totalItems} รายการ
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadWeighingStockExcel}
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
                    onClick={handleDownloadWeighingStockPdf}
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
                          <TableHead className="min-w-[200px] font-semibold">ชื่อสินค้า</TableHead>
                          <TableHead className="min-w-[120px] text-center font-semibold">ตู้</TableHead>
                          <TableHead className="w-20 text-center font-semibold">ช่อง</TableHead>
                          <TableHead className="w-20 text-center font-semibold">สล็อต</TableHead>
                          <TableHead className="w-24 text-right font-semibold">จำนวน</TableHead>
                          <TableHead className="w-20 text-center font-semibold">Min</TableHead>
                          <TableHead className="w-20 text-center font-semibold">Max</TableHead>
                          <TableHead className="w-[120px] text-center font-semibold">จัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((row, index) => (
                          <TableRow key={row.id} className="hover:bg-slate-50/80">
                            <TableCell className="text-center text-muted-foreground tabular-nums">
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate font-medium" title={row.item?.itemname ?? undefined}>
                              {row.item?.itemname || row.item?.Alternatename || '-'}
                            </TableCell>
                            <TableCell className="text-center text-gray-700">
                              {row.cabinet
                                ? row.cabinet.cabinet_name || row.cabinet.cabinet_code || row.StockID
                                : row.StockID}
                            </TableCell>
                            <TableCell className="text-center">{row.SlotNo ?? '-'}</TableCell>
                            <TableCell className="text-center">{formatSlotDisplay(row.Sensor)}</TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{row.Qty}</TableCell>
                            <TableCell className="text-center tabular-nums text-muted-foreground">
                              {formatMinMax(effectiveMin(row))}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-muted-foreground">
                              {formatMinMax(effectiveMax(row))}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                disabled={!row.cabinet?.id}
                                onClick={() => openMinMaxDialog(row)}
                                title={!row.cabinet?.id ? 'ไม่มีข้อมูลตู้' : 'ตั้งค่า Min/Max ต่อตู้'}
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                                จัดการ
                              </Button>
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
