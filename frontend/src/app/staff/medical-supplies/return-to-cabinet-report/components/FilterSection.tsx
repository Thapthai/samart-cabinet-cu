import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FilterState } from '../../dispense-from-cabinet/types';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export default function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  loading,
}: FilterSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล</CardTitle>
        <CardDescription>ค้นหาและกรองรายการเบิกอุปกรณ์จากตู้</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Row 1: Search and Item Type */}
          <div className="grid grid-cols-1 md:grid-cols-1 ">
            {/* Search by Item Code */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">รหัส/ชื่อเวชภัณฑ์</label>
              <Input
                placeholder="ค้นหา..."
                value={filters.searchItemCode}
                onChange={(e) => onFilterChange('searchItemCode', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className="w-full"
              />
            </div>

          </div>

          {/* Row 2: Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
              <ExpireDateInput
                value={filters.startDate}
                onChange={(ymd) => onFilterChange('startDate', ymd)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <ExpireDateInput
                value={filters.endDate}
                onChange={(ymd) => onFilterChange('endDate', ymd)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={onSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            ค้นหา
          </Button>
          <Button onClick={onClear} variant="outline">
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
