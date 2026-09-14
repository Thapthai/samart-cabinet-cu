'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { FileText, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ExpireDateInput } from '@/components/ExpireDateInput';

export default function LogsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const getTodayDate = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  const [formFilters, setFormFilters] = useState({
    usage_id: '',
    method: '',
    status: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });
  const [activeFilters, setActiveFilters] = useState({
    usage_id: '',
    method: '',
    status: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });

  const fetchLogs = async (customFilters?: typeof activeFilters, page?: number) => {
    try {
      setLoading(true);
      const f = customFilters ?? activeFilters;
      const params: any = { page: page ?? currentPage, limit };
      if (f.usage_id?.trim()) params.usage_id = parseInt(f.usage_id, 10);
      if (f.method?.trim()) params.method = f.method;
      if (f.status?.trim()) params.status = f.status;
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;

      const res = await medicalSuppliesApi.getLogs(params);
      const data = res?.data ?? [];
      setLogs(Array.isArray(data) ? data : []);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      toast.error('โหลด log ไม่ได้');
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchLogs(activeFilters, currentPage);
    }
  }, [user?.id, activeFilters, currentPage]);

  const handleSearch = () => {
    setActiveFilters(formFilters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const reset = { usage_id: '', method: '', status: '', startDate: getTodayDate(), endDate: getTodayDate() };
    setFormFilters(reset);
    setActiveFilters(reset);
    setCurrentPage(1);
  };

  const METHOD_OPTIONS = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'GET', label: 'QUERY (อ่าน)' },
    { value: 'POST', label: 'CREATE (สร้าง)' },
    { value: 'PUT', label: 'UPDATE (แก้ไข)' },
    { value: 'DELETE', label: 'DELETE (ลบ)' },
    { value: 'OTHER', label: 'อื่นๆ' },
  ];

  const getMethodFromAction = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const type = String((action as Record<string, unknown>).type ?? '').toUpperCase();
    if (type === 'QUERY') return 'GET';
    if (type === 'CREATE') return 'POST';
    if (type === 'UPDATE' || type === 'UPDATE_PRINT_INFO') return 'PUT';
    if (type === 'DELETE') return 'DELETE';
    return 'OTHER';
  };

  const getActionTypeLabel = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const type = String((action as Record<string, unknown>).type ?? '').toUpperCase();
    if (type === 'UPDATE_PRINT_INFO') return 'UPDATE_PRINT_INFO';
    return type || '-';
  };

  const getMethodBadge = (action: any) => {
    const typeLabel = getActionTypeLabel(action);
    const method = getMethodFromAction(action);
    const classes: Record<string, string> = {
      GET: 'bg-blue-50 text-blue-700 border-blue-200',
      POST: 'bg-green-50 text-green-700 border-green-200',
      PUT: 'bg-amber-50 text-amber-700 border-amber-200',
      DELETE: 'bg-red-50 text-red-700 border-red-200',
      OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    return (
      <Badge variant="outline" className={cn('text-xs font-mono', classes[method] ?? classes.OTHER)}>
        {typeLabel}
      </Badge>
    );
  };

  const formatDate = (v: string | Date) => {
    try {
      const d = new Date(v as string);
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(v ?? '-');
    }
  };

  const getActionSummary = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const a = action as Record<string, unknown>;
    if (a.reason && typeof a.reason === 'string') return a.reason;
    if (a.error_message && typeof a.error_message === 'string') return a.error_message;
    if (a.action && typeof a.action === 'string') return a.action;
    if (a.type && typeof a.type === 'string') return a.type;
    try {
      return JSON.stringify(action).slice(0, 80) + (JSON.stringify(action).length > 80 ? '…' : '');
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (action: any) => {
    if (!action || typeof action !== 'object') return null;
    const status = (action as Record<string, unknown>).status as string | undefined;
    if (!status) return null;
    const s = String(status).toLowerCase();
    if (s === 'success')
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          SUCCESS
        </Badge>
      );
    if (s === 'error')
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
          ERROR
        </Badge>
      );
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="p-4 md:p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7" />
              Log การเบิกอุปกรณ์ (Medical Supply Usage Logs)
            </h1>
            <p className="text-gray-500 mt-1">
              แสดงประวัติการดำเนินการของระบบเบิกอุปกรณ์
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ตัวกรอง</CardTitle>
              <CardDescription>กรองตาม Usage ID, ประเภท (CREATE / QUERY), สถานะ (SUCCESS / ERROR) หรือช่วงวันที่</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <Label>Usage ID</Label>
                  <Input
                    type="number"
                    placeholder="เช่น 123"
                    value={formFilters.usage_id}
                    onChange={(e) => setFormFilters((p) => ({ ...p, usage_id: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>ประเภท (CREATE / QUERY)</Label>
                  <select
                    value={formFilters.method}
                    onChange={(e) => setFormFilters((p) => ({ ...p, method: e.target.value }))}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    {METHOD_OPTIONS.map((opt) => (
                      <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>สถานะ</Label>
                  <select
                    value={formFilters.status}
                    onChange={(e) => setFormFilters((p) => ({ ...p, status: e.target.value }))}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">ทั้งหมด</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                </div>
                <div>
                  <Label>วันที่เริ่ม</Label>
                  <ExpireDateInput
                    value={formFilters.startDate}
                    onChange={(ymd) => setFormFilters((p) => ({ ...p, startDate: ymd }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>วันที่สิ้นสุด</Label>
                  <ExpireDateInput
                    value={formFilters.endDate}
                    onChange={(ymd) => setFormFilters((p) => ({ ...p, endDate: ymd }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleSearch} className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    ค้นหา
                  </Button>
                  <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    ล้าง
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>รายการ Log</CardTitle>
              <CardDescription>
                ทั้งหมด {total} รายการ (หน้า {currentPage} / {totalPages})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-gray-500">กำลังโหลด...</div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">ไม่พบข้อมูล log</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">ID</TableHead>
                        <TableHead className="w-[180px]">วันเวลา</TableHead>
                        <TableHead className="w-[100px]">Usage ID</TableHead>
                        <TableHead className="w-[200px]">ประเภท (CREATE / QUERY / UPDATE)</TableHead>
                        <TableHead className="w-[100px]">สถานะ</TableHead>
                        <TableHead className="min-w-[300px]">รายละเอียด</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-sm w-[60px]">{row.id}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap w-[180px]">
                            {formatDate(row.created_at)}
                          </TableCell>
                          <TableCell className="font-mono text-sm w-[100px]">
                            {row.usage_id ?? '-'}
                          </TableCell>
                          <TableCell className="text-sm w-[200px]">
                            {getMethodBadge(row.action)}
                          </TableCell>
                          <TableCell className="w-[100px]">{getStatusBadge(row.action)}</TableCell>
                          <TableCell className="text-sm text-gray-600 min-w-[300px] truncate" title={getActionSummary(row.action)}>
                            {getActionSummary(row.action)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    แสดง {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)} จาก {total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
