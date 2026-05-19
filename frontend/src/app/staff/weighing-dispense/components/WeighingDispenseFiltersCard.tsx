import { Search, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WeighingDispenseFiltersCardProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearchTermEnter: () => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  loading: boolean;
  hasActiveFilters: boolean;
  onSearch: () => void;
  onClear: () => void;
}

export default function WeighingDispenseFiltersCard({
  searchTerm,
  onSearchTermChange,
  onSearchTermEnter,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  loading,
  hasActiveFilters,
  onSearch,
  onClear,
}: WeighingDispenseFiltersCardProps) {
  return (
    <Card className="border-purple-100/80 bg-gradient-to-br from-slate-50 to-purple-50/40 shadow-sm overflow-hidden">
      <CardContent className="pt-6 pb-6">
        <p className="text-xs text-muted-foreground mb-3">
          เลือกตู้จากแท็บด้านบน (สอดคล้องหน้าสต๊อกตามตู้) — ตู้ชั่งแสดงรายการเบิก Weighing ตู้ RFID แสดงรายการเบิก RFID
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">ชื่ออุปกรณ์</label>
            <Input
              placeholder="พิมพ์ชื่ออุปกรณ์..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchTermEnter()}
              className="w-full bg-white border-gray-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="w-full bg-white border-gray-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="w-full bg-white border-gray-200"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={onSearch} disabled={loading} className="shadow-sm">
            <Search className="h-4 w-4 mr-2" />
            ค้นหา
          </Button>
          <Button variant="outline" onClick={onClear} className="border-gray-300" disabled={!hasActiveFilters}>
            <X className="h-4 w-4 mr-2" />
            ล้าง
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
