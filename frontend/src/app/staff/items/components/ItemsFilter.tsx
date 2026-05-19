import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';

interface ItemsFilterProps {
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export default function ItemsFilter({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: ItemsFilterProps) {
  const [inputValue, setInputValue] = useState(searchTerm);

  const handleSearch = () => {
    onSearchChange(inputValue);
  };

  const handleClear = () => {
    setInputValue('');
    onSearchChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-blue-600" />
          <CardTitle>ค้นหาและกรองอุปกรณ์</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาอุปกรณ์..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 focus:border-blue-500 focus:ring-blue-100 transition-all"
              />
              {inputValue && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-3 text-gray-400 hover:text-red-500 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button 
              onClick={handleSearch} 
              className="whitespace-nowrap bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Search className="h-4 w-4 mr-2" />
              ค้นหา
            </Button>
          </div>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px] border-gray-300 hover:border-blue-400 transition-colors focus:ring-blue-100">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer hover:bg-blue-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  <span>ทั้งหมด</span>
                </div>
              </SelectItem>
              <SelectItem value="active" className="cursor-pointer hover:bg-green-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>ใช้งาน</span>
                </div>
              </SelectItem>
              <SelectItem value="inactive" className="cursor-pointer hover:bg-red-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>ไม่ใช้งาน</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

