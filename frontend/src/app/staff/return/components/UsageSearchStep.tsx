'use client';

import { Search, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Usage } from '../types';

interface UsageSearchStepProps {
  startDate: string;
  endDate: string;
  keyword: string;
  usages: Usage[];
  selectedUsageId: number | null;
  loading: boolean;
  page: number;
  total: number;
  limit: number;
  lastPage: number;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onKeywordChange: (v: string) => void;
  onSearch: () => void;
  onSelectUsage: (usageId: number) => void;
  onPageChange: (page: number) => void;
  formatDate: (dateString: string) => string;
}

export default function UsageSearchStep({
  startDate,
  endDate,
  keyword,
  usages,
  selectedUsageId,
  loading,
  page,
  total,
  limit,
  lastPage,
  onStartDateChange,
  onEndDateChange,
  onKeywordChange,
  onSearch,
  onSelectUsage,
  onPageChange,
  formatDate,
}: UsageSearchStepProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-emerald-100">
          <ListChecks className="h-4 w-4 text-emerald-600" />
        </div>
        <Label className="text-base font-semibold text-slate-800">
          ขั้นที่ 1: ค้นหาและเลือกการเบิก (Usage)
        </Label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="start-date" className="text-slate-600 font-medium">วันที่เริ่มต้น</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-lg border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-date" className="text-slate-600 font-medium">วันที่สิ้นสุด</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="rounded-lg border-slate-200"
          />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="keyword" className="text-slate-600 font-medium">ค้นหาชื่อรายการ</Label>
          <Input
            id="keyword"
            type="text"
            placeholder="รหัสหรือชื่อรายการ..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="rounded-lg border-slate-200"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={onSearch}
            disabled={loading}
            className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-6"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังค้นหา...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                ค้นหา
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
              <TableHead className="w-14 text-center text-slate-600 font-medium">เลือก</TableHead>
              <TableHead className="text-slate-600 font-medium">EN</TableHead>
              <TableHead className="text-slate-600 font-medium">HN</TableHead>
              <TableHead className="text-slate-600 font-medium">ผู้ป่วย</TableHead>
              <TableHead className="text-slate-600 font-medium">แผนก</TableHead>
              <TableHead className="text-slate-600 font-medium">วันที่เบิก</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  <span className="inline-block h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            ) : usages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  ไม่พบข้อมูล — กรุณากด ค้นหา หรือปรับวันที่/ชื่อรายการ
                </TableCell>
              </TableRow>
            ) : (
              usages.map((usage: Usage) => {
                const u = usage.data || usage;
                const isSelected = selectedUsageId === u.id;
                return (
                  <TableRow
                    key={u.id}
                    className={`cursor-pointer transition-colors border-b border-slate-100 ${isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50/50'
                      }`}
                    onClick={() => onSelectUsage(u.id)}
                  >
                    <TableCell className="text-center">
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mx-auto ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                          }`}
                      >
                        {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.en ?? '-'}</TableCell>
                    <TableCell className="text-sm">{u.patient_hn ?? '-'}</TableCell>
                    <TableCell className="text-sm">
                      {(u.first_name ?? '')} {(u.lastname ?? '')}
                    </TableCell>
                    <TableCell className="text-sm">{u.department_code ?? '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                      {u.created_at ? formatDate(u.created_at) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && usages.length > 0 && lastPage > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2">
          <p className="text-sm text-slate-500">
            แสดง <span className="font-medium text-slate-700">{(page - 1) * limit + 1}</span> – <span className="font-medium text-slate-700">{Math.min(page * limit, total)}</span> จาก <span className="font-medium text-slate-700">{total}</span> รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Button>
            <span className="text-sm text-slate-600 min-w-[70px] text-center">
              หน้า {page} / {lastPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= lastPage}
              className="rounded-lg gap-1"
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
