import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import type { FilterState } from '../../types';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: (keyword?: string) => void;
  onClear: () => void;
  onRefresh: () => void;
  itemTypes: Array<{ id: string; name: string }>;
  departments: Array<{ ID: number; DepName: string }>;
  loading: boolean;
  items?: unknown[];
  departmentDisabled?: boolean;
}

export function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  itemTypes: _itemTypes,
  departments,
  loading,
  items: _items = [],
  departmentDisabled = false,
}: FilterSectionProps) {
  const [searchInput, setSearchInput] = useState('');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);

  const submitSearch = () => {
    const keyword = searchInput.trim();
    onFilterChange('searchItemCode', keyword);
    if (keyword) {
      onSearch(keyword);
    } else {
      onSearch();
    }
  };

  const selectedDeptName = filters.departmentCode
    ? (departments.find((d) => String(d.ID) === filters.departmentCode)?.DepName ||
      `แผนก ${filters.departmentCode}`)
    : null;

  const filteredDepartments = departments.filter((d) => {
    if (!departmentSearch.trim()) return true;
    return d.DepName?.toLowerCase().includes(departmentSearch.toLowerCase());
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล</CardTitle>
        <CardDescription>ค้นหาและกรองรายการเปรียบเทียบ</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Search + Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>รหัส/ชื่อเวชภัณฑ์</Label>
            <Input
              placeholder="ค้นหารหัสหรือชื่อเวชภัณฑ์..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch();
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>แผนก</Label>
            <DropdownMenu open={departmentDisabled ? false : departmentDropdownOpen} onOpenChange={departmentDisabled ? undefined : setDepartmentDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                  type="button"
                  disabled={departmentDisabled}
                >
                  <span className="truncate">
                    {selectedDeptName ?? 'เลือกแผนก...'}
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
                      onFilterChange('departmentCode', '');
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
                        onFilterChange('departmentCode', String(dept.ID));
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
        </div>

        {/* Row 2: Single Date */}
        <div className="space-y-2">
          <Label>วันที่</Label>
          <ExpireDateInput
            value={filters.startDate}
            onChange={(ymd) => {
              const selectedDate = ymd;
              onFilterChange('startDate', selectedDate);
              onFilterChange('endDate', selectedDate);
            }}
          />
        </div>

        {/* Row 3: Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={submitSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            ค้นหา
          </Button>
          <Button
            onClick={() => {
              setSearchInput('');
              setDepartmentSearch('');
              onClear();
            }}
            variant="outline"
          >
            ล้าง
          </Button>
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
