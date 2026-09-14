'use client';

import { Search, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface ReturnHistoryFilterProps {
  dateFrom: string;
  dateTo: string;
  reason: string;
  departmentCode: string;
  departments: Array<{ ID: number; DepName: string }>;
  departmentDisabled?: boolean;
  loading: boolean;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
  onDepartmentChange: (code: string) => void;
  onSearch: () => void;
}

export default function ReturnHistoryFilter({
  dateFrom,
  dateTo,
  reason,
  departmentCode,
  departments,
  departmentDisabled = false,
  loading,
  onDateFromChange,
  onDateToChange,
  onReasonChange,
  onDepartmentChange,
  onSearch,
}: ReturnHistoryFilterProps) {
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);

  const selectedDeptName = departmentCode
    ? (departments.find((d) => String(d.ID) === departmentCode)?.DepName ?? `แผนก ${departmentCode}`)
    : null;

  const filteredDepartments = departments.filter((d) => {
    if (!departmentSearch.trim()) return true;
    return d.DepName?.toLowerCase().includes(departmentSearch.toLowerCase());
  });

  return (
    <Card className="border-0 shadow-sm bg-white rounded-xl overflow-hidden">
      <CardHeader className="border-b bg-slate-50/50 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-100">
            <Filter className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800">ประวัติอุปกรณ์ที่ไม่ถูกใช้งาน</CardTitle>
            <CardDescription className="text-slate-500 mt-0.5">
              กำหนดช่วงวันที่ แผนก และสาเหตุ แล้วกดค้นหา
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="history-date-from" className="text-slate-600 font-medium">
              วันที่เริ่มต้น
            </Label>
            <ExpireDateInput
              id="history-date-from"
              value={dateFrom}
              onChange={(ymd) => onDateFromChange(ymd)}
              className="rounded-lg border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="history-date-to" className="text-slate-600 font-medium">
              วันที่สิ้นสุด
            </Label>
            <ExpireDateInput
              id="history-date-to"
              value={dateTo}
              onChange={(ymd) => onDateToChange(ymd)}
              className="rounded-lg border-slate-200"
            />
          </div>

          {/* Department searchable dropdown */}
          <div className="space-y-2">
            <Label className="text-slate-600 font-medium">แผนก</Label>
            <DropdownMenu
              open={departmentDisabled ? false : departmentDropdownOpen}
              onOpenChange={departmentDisabled ? undefined : setDepartmentDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal rounded-lg border-slate-200"
                  type="button"
                  disabled={departmentDisabled}
                >
                  <span className="truncate">
                    {selectedDeptName ?? 'ทุกแผนก'}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem] p-1"
              >
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
                      onDepartmentChange('');
                      setDepartmentDropdownOpen(false);
                      setDepartmentSearch('');
                    }}
                  >
                    -- ทุกแผนก --
                  </button>
                  {filteredDepartments.map((dept) => (
                    <button
                      key={dept.ID}
                      type="button"
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onDepartmentChange(String(dept.ID));
                        setDepartmentDropdownOpen(false);
                        setDepartmentSearch('');
                      }}
                    >
                      {dept.DepName}
                    </button>
                  ))}
                  {filteredDepartments.length === 0 && (
                    <p className="px-2 py-2 text-sm text-gray-400">ไม่พบแผนก</p>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <Label htmlFor="history-reason" className="text-slate-600 font-medium">
              สาเหตุ
            </Label>
            <Select value={reason || 'ALL'} onValueChange={onReasonChange}>
              <SelectTrigger id="history-reason" className="rounded-lg border-slate-200 w-full">
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="UNWRAPPED_UNUSED">ยังไม่ได้แกะซอง / อยู่ในสภาพเดิม</SelectItem>
                <SelectItem value="EXPIRED">อุปกรณ์หมดอายุ</SelectItem>
                <SelectItem value="CONTAMINATED">อุปกรณ์มีการปนเปื้อน</SelectItem>
                <SelectItem value="DAMAGED">อุปกรณ์ชำรุด</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={onSearch} disabled={loading}>
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  กำลังโหลด...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  ค้นหา
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSearch}
              disabled={loading}
              className="gap-2 rounded-lg border-slate-200"
              title="โหลดประวัติการคืนใหม่"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
