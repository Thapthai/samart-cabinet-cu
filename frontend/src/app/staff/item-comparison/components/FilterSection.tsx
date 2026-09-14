import { Search, RefreshCw, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../types';
import type { ComparisonItem } from '../types';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  itemTypes: Array<{ id: string; name: string }>;
  loading: boolean;
  items?: ComparisonItem[];
}

export default function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  itemTypes,
  loading,
  items = [],
}: FilterSectionProps) {
  const [searchInput, setSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listDropdownRef = useRef<HTMLDivElement>(null);

  // Filter items based on search input (search by code and name)
  const filteredItems = items.filter(item =>
    (item.itemcode?.toLowerCase() || '').includes(searchInput.toLowerCase()) ||
    (item.itemname?.toLowerCase() || '').includes(searchInput.toLowerCase())
  );

  // Group items by type
  const groupedItems = items.reduce((acc: Map<string, ComparisonItem[]>, item) => {
    const typeKey = item.itemTypeName || 'ไม่มีประเภท';
    if (!acc.has(typeKey)) {
      acc.set(typeKey, []);
    }
    acc.get(typeKey)?.push(item);
    return acc;
  }, new Map());

  const handleSelectItem = (item: ComparisonItem) => {
    onFilterChange('searchItemCode', item.itemcode);
    setSearchInput('');
    setIsDropdownOpen(false);
  };

  const handleClearSelection = () => {
    onFilterChange('searchItemCode', '');
    setSearchInput('');
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (listDropdownRef.current && !listDropdownRef.current.contains(event.target as Node)) {
        setIsListDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล </CardTitle>
        <CardDescription>ค้นหาและกรองรายการเปรียบเทียบ</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          {/* Row 1: Date Range */}
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
          {/* Row 2: Search, Item Type, and All Items Dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search by Item Code with Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">รหัส/ชื่อเวชภัณฑ์</label>
              <div className="relative" ref={dropdownRef}>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="ค้นหา..."
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onSearch();
                          setIsDropdownOpen(false);
                        }
                      }}
                      className="w-full"
                    />
                    {/* Dropdown Menu */}
                    {isDropdownOpen && items.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                        {filteredItems.length > 0 ? (
                          filteredItems.slice(0, 10).map((item) => (
                            <button
                              key={item.itemcode}
                              onClick={() => handleSelectItem(item)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex flex-col"
                            >
                              <span className="font-medium text-sm text-gray-900">
                                {item.itemcode}
                              </span>
                              <span className="text-xs text-gray-600">
                                {item.itemname}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            ไม่พบรายการที่ตรงกัน
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {filters.searchItemCode && (
                    <button
                      onClick={handleClearSelection}
                      className="p-2 hover:bg-gray-100 rounded-md"
                      title="ล้างการเลือก"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  )}
                </div>
                {/* Display selected item info */}
                {filters.searchItemCode && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                    {items.find(item => item.itemcode === filters.searchItemCode) && (
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">
                          {items.find(item => item.itemcode === filters.searchItemCode)?.itemcode}
                        </p>
                        <p className="text-xs text-gray-600">
                          {items.find(item => item.itemcode === filters.searchItemCode)?.itemname}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Item Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">ประเภทเวชภัณฑ์</label>
              <Select value={filters.itemTypeFilter} onValueChange={(value) => onFilterChange('itemTypeFilter', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {itemTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* All Items Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">รายการเปรียบเทียบทั้งหมด</label>
              <div className="relative" ref={listDropdownRef}>
                <button
                  onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm">
                    {items.length > 0 ? `ดูทั้งหมด (${items.length})` : 'ไม่มีรายการ'}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isListDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Grouped Dropdown Menu */}
                {isListDropdownOpen && items.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    {Array.from(groupedItems.entries()).map(([typeName, typeItems]) => (
                      <div key={typeName} className="border-b border-gray-200 last:border-b-0">
                        {/* Type Header */}
                        <div className="px-3 py-2 bg-gray-100 font-semibold text-sm text-gray-700 sticky top-0">
                          {typeName}
                        </div>
                        {/* Type Items */}
                        {typeItems.map((item: ComparisonItem) => (
                          <button
                            key={item.itemcode}
                            onClick={() => {
                              handleSelectItem(item);
                              setIsListDropdownOpen(false);
                            }}
                            className="w-full text-left px-6 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex flex-col text-sm"
                          >
                            <span className="font-medium text-gray-900">
                              {item.itemcode}
                            </span>
                            <span className="text-xs text-gray-600">
                              {item.itemname}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
