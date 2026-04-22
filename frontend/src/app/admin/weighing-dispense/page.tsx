'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { weighingApi, cabinetApi, reportsApi, medicalSuppliesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import CabinetStockTabs, {
  cabinetStockTableMode,
  pickDefaultCabinet,
  type CabinetTabCabinet,
  type CabinetStockTableMode,
} from '../items-stock/components/CabinetStockTabs';
import WeighingDispensePageHeader from './components/WeighingDispensePageHeader';
import WeighingDispenseSummaryCards from './components/WeighingDispenseSummaryCards';
import WeighingDispenseFiltersCard from './components/WeighingDispenseFiltersCard';
import WeighingDispenseTableCard from './components/WeighingDispenseTableCard';
import { getTodayISO, type RfidDispensedListRow, type WeighingDispenseDetailRow } from './components/types';

export default function WeighingDispensePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<(WeighingDispenseDetailRow | RfidDispensedListRow)[]>([]);
  const [cabinets, setCabinets] = useState<CabinetTabCabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(true);
  const [itemcodeFilter, setItemcodeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockIdFilter, setStockIdFilter] = useState<string>('');
  const [selectedCabinetId, setSelectedCabinetId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);
  const [combinedExcelLoading, setCombinedExcelLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(getTodayISO);
  const [dateTo, setDateTo] = useState(getTodayISO);
  const [dateFromFilter, setDateFromFilter] = useState(getTodayISO);
  const [dateToFilter, setDateToFilter] = useState(getTodayISO);

  const selectedCabinet = useMemo(() => {
    if (selectedCabinetId != null) {
      const byId = cabinets.find((c) => c.id === selectedCabinetId);
      if (byId) return byId;
    }
    if (!stockIdFilter) return null;
    const sid = parseInt(stockIdFilter, 10);
    if (Number.isNaN(sid)) return null;
    return cabinets.find((c) => c.stock_id != null && Number(c.stock_id) === sid) ?? null;
  }, [cabinets, selectedCabinetId, stockIdFilter]);

  const tableMode: CabinetStockTableMode = useMemo(
    () => cabinetStockTableMode(selectedCabinet),
    [selectedCabinet],
  );

  const stockIdParsed = useMemo(() => {
    if (!stockIdFilter) return null;
    const n = parseInt(stockIdFilter, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [stockIdFilter]);

  useEffect(() => {
    if (user?.id) fetchCabinets();
  }, [user?.id]);

  const fetchCabinets = async () => {
    try {
      setLoadingCabinets(true);
      const res = await cabinetApi.getAll({ page: 1, limit: 200 });
      const data = (res as { success?: boolean; data?: CabinetTabCabinet[] }).data;
      const rawList = Array.isArray(data) ? data : [];
      const sorted = [...rawList].sort((a, b) => {
        const aWeigh = cabinetStockTableMode(a) === 'WEIGHING' ? 0 : 1;
        const bWeigh = cabinetStockTableMode(b) === 'WEIGHING' ? 0 : 1;
        if (aWeigh !== bWeigh) return aWeigh - bWeigh;
        const an = (a.cabinet_name || a.cabinet_code || '').toString();
        const bn = (b.cabinet_name || b.cabinet_code || '').toString();
        return an.localeCompare(bn, 'th');
      });
      const defaultCab = pickDefaultCabinet(sorted);
      setCabinets(sorted);
      setStockIdFilter((prev) => {
        if (prev) return prev;
        return defaultCab?.stock_id != null ? String(defaultCab.stock_id) : '';
      });
      setSelectedCabinetId((prevId) => {
        if (prevId != null) return prevId;
        return defaultCab?.id ?? null;
      });
    } catch {
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  };

  const handleSelectCabinet = (c: CabinetTabCabinet) => {
    if (c.stock_id == null || Number(c.stock_id) <= 0) return;
    setSelectedCabinetId(c.id);
    setStockIdFilter(String(c.stock_id));
    setCurrentPage(1);
  };

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);

      if (tableMode === 'WEIGHING') {
        if (stockIdParsed == null) {
          setItems([]);
          setTotalItems(0);
          setTotalPages(1);
          return;
        }
        const res = await weighingApi.getDetailsBySign({
          sign: '-',
          page: currentPage,
          limit: itemsPerPage,
          itemName: itemcodeFilter || undefined,
          stockId: stockIdParsed,
          dateFrom: dateFromFilter || undefined,
          dateTo: dateToFilter || undefined,
        });
        if (res?.success && Array.isArray(res.data)) {
          setItems(res.data as WeighingDispenseDetailRow[]);
          setTotalItems(res.pagination?.total ?? res.data.length);
          setTotalPages(res.pagination?.totalPages ?? 1);
        } else {
          setItems([]);
          setTotalItems(0);
          setTotalPages(1);
        }
        return;
      }

      if (selectedCabinetId == null || selectedCabinetId <= 0) {
        setItems([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }

      const res = await medicalSuppliesApi.getDispensedItems({
        keyword: itemcodeFilter || undefined,
        startDate: dateFromFilter,
        endDate: dateToFilter,
        page: currentPage,
        limit: itemsPerPage,
        cabinetId: String(selectedCabinetId),
      });
      if (res?.success && Array.isArray(res.data)) {
        setItems(res.data as RfidDispensedListRow[]);
        setTotalItems(typeof res.total === 'number' ? res.total : res.data.length);
        setTotalPages(typeof res.totalPages === 'number' ? res.totalPages : 1);
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
  }, [
    tableMode,
    stockIdParsed,
    selectedCabinetId,
    currentPage,
    itemcodeFilter,
    dateFromFilter,
    dateToFilter,
  ]);

  useEffect(() => {
    if (user?.id) void fetchList();
  }, [user?.id, fetchList]);

  const handleSearch = () => {
    setItemcodeFilter(searchTerm.trim());
    setDateFromFilter(dateFrom);
    setDateToFilter(dateTo);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchTerm('');
    setItemcodeFilter('');
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

  const hasActiveFilters = Boolean(
    itemcodeFilter || dateFromFilter !== getTodayISO() || dateToFilter !== getTodayISO(),
  );

  const totalQty = useMemo(() => {
    if (tableMode === 'WEIGHING') {
      return (items as WeighingDispenseDetailRow[]).reduce((sum, row) => sum + (row.Qty ?? 0), 0);
    }
    return (items as RfidDispensedListRow[]).reduce((sum, row) => sum + (row.qty ?? 0), 0);
  }, [items, tableMode]);

  const listEmptyHint = useMemo(() => {
    if (tableMode === 'WEIGHING' && stockIdParsed == null) {
      return 'เลือกตู้ชั่ง (Weighing) จากแท็บด้านบนเพื่อแสดงรายการเบิก';
    }
    if (tableMode === 'RFID' && (selectedCabinetId == null || selectedCabinetId <= 0)) {
      return 'เลือกตู้ RFID จากแท็บด้านบนเพื่อแสดงรายการเบิก';
    }
    return null;
  }, [tableMode, stockIdParsed, selectedCabinetId]);

  const cabinetDisplayFallback = useMemo(() => {
    if (!selectedCabinet) return null;
    const name = (selectedCabinet.cabinet_name ?? '').trim();
    const code = (selectedCabinet.cabinet_code ?? '').trim();
    if (name && code) return `${name} (${code})`;
    return name || code || null;
  }, [selectedCabinet]);

  const handleDownloadWeighingDispenseExcel = async () => {
    try {
      setExportLoading('excel');
      if (tableMode === 'WEIGHING') {
        const stockId = stockIdParsed ?? undefined;
        const itemName = itemcodeFilter || undefined;
        await reportsApi.downloadWeighingDispenseExcel({
          stockId,
          itemName,
          dateFrom: dateFromFilter,
          dateTo: dateToFilter,
        });
        toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
        return;
      }
      if (selectedCabinetId == null) {
        toast.error('เลือกตู้ RFID ก่อนดาวน์โหลดรายงาน');
        return;
      }
      await medicalSuppliesApi.downloadDispensedItemsExcel({
        keyword: itemcodeFilter || undefined,
        startDate: dateFromFilter,
        endDate: dateToFilter,
        cabinetId: String(selectedCabinetId),
      });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadDispensedAllExcel = async () => {
    try {
      setCombinedExcelLoading(true);
      await reportsApi.downloadDispensedAllExcel({
        weighing: {
          stockId: stockIdParsed ?? undefined,
          itemName: itemcodeFilter || undefined,
          dateFrom: dateFromFilter,
          dateTo: dateToFilter,
        },
        rfid: {
          keyword: itemcodeFilter || undefined,
          startDate: dateFromFilter,
          endDate: dateToFilter,
          cabinetId:
            selectedCabinetId != null && selectedCabinetId > 0 ? String(selectedCabinetId) : undefined,
        },
      });
      toast.success('ดาวน์โหลด Excel (Weighing + RFID) สำเร็จ');
    } catch (e) {
      console.error(e);
      toast.error('ดาวน์โหลดรายงานไม่สำเร็จ');
    } finally {
      setCombinedExcelLoading(false);
    }
  };

  const handleDownloadWeighingDispensePdf = async () => {
    try {
      setExportLoading('pdf');
      if (tableMode === 'WEIGHING') {
        const stockId = stockIdParsed ?? undefined;
        const itemName = itemcodeFilter || undefined;
        await reportsApi.downloadWeighingDispensePdf({
          stockId,
          itemName,
          dateFrom: dateFromFilter,
          dateTo: dateToFilter,
        });
        toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
        return;
      }
      if (selectedCabinetId == null) {
        toast.error('เลือกตู้ RFID ก่อนดาวน์โหลดรายงาน');
        return;
      }
      await medicalSuppliesApi.downloadDispensedItemsPdf({
        keyword: itemcodeFilter || undefined,
        startDate: dateFromFilter,
        endDate: dateToFilter,
        cabinetId: String(selectedCabinetId),
      });
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
          <WeighingDispensePageHeader />
      

          <Card className="rounded-xl border-slate-200/80 shadow-sm">
            <CardContent className="pt-0">
              <CabinetStockTabs
                cabinets={cabinets}
                selectedCabinetId={selectedCabinetId}
                onSelectCabinet={handleSelectCabinet}
                loading={loadingCabinets}
              />
            </CardContent>
          </Card>
          <WeighingDispenseSummaryCards totalItems={totalItems} totalQty={totalQty} />

          <WeighingDispenseFiltersCard
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearchTermEnter={handleSearch}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            loading={loading}
            hasActiveFilters={hasActiveFilters}
            onSearch={handleSearch}
            onClear={handleClear}
          />
          <WeighingDispenseTableCard
            tableMode={tableMode}
            loading={loading}
            items={items}
            totalItems={totalItems}
            totalPages={totalPages}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            exportLoading={exportLoading}
            combinedExcelLoading={combinedExcelLoading}
            onDownloadDispensedAllExcel={handleDownloadDispensedAllExcel}
            onDownloadExcel={handleDownloadWeighingDispenseExcel}
            onDownloadPdf={handleDownloadWeighingDispensePdf}
            cabinetDisplayFallback={cabinetDisplayFallback}
            emptyHint={listEmptyHint}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
