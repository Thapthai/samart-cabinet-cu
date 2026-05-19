import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, Plus, ArrowRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { SkeletonTable } from '@/components/Skeleton';
import Pagination from '@/components/Pagination';
import type { Item } from '@/types/item';

interface RecentItemsTableProps {
  loading: boolean;
  items: Item[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortBy?: string;
  sortOrder?: string;
  onSortChange?: (sortBy: string, sortOrder: string) => void;
}

export default function RecentItemsTable({
  loading,
  items,
  currentPage,
  totalPages,
  onPageChange,
  sortBy = 'CreateDate',
  sortOrder = 'desc',
  onSortChange,
}: RecentItemsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>รายการอุปกรณ์</CardTitle>
            <CardDescription>
              อุปกรณ์ล่าสุด {!loading && items.length > 0 && `(${items.length} รายการในหน้านี้)`}
            </CardDescription>
          </div>
          <Link href="/admin/items">
            <Button
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              ดูทั้งหมด
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="py-2">
            <SkeletonTable />
          </div>
        ) : items.length === 0 ? (
          <div className="py-2">
            <EmptyState />
          </div>
        ) : (
          <ItemsTable
            items={items}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
            currentPage={currentPage}
          />
        )}
      </CardContent>
      {/* Pagination */}
      {!loading && items.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          loading={loading}
        />
      )}
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-6">
      <Package className="mx-auto h-10 w-10 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่มีอุปกรณ์</h3>
      <p className="mt-1 text-sm text-gray-500">เริ่มต้นด้วยการเพิ่มอุปกรณ์แรกของคุณ</p>
      <div className="mt-6">
        <Link href="/admin/items">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all duration-200">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มอุปกรณ์ใหม่
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ItemsTable({
  items,
  sortBy,
  sortOrder,
  onSortChange,
  currentPage,
}: {
  items: Item[];
  sortBy?: string;
  sortOrder?: string;
  onSortChange?: (sortBy: string, sortOrder: string) => void;
  currentPage: number;
}) {
  const itemsPerPage = 10;

  // Helper function for stock status badge
  const getStockStatusBadge = (stockBalance: number, minimum: number, maximum: number) => {
    let stockStatus = 'ปกติ';
    let stockStatusColor = 'bg-green-100 text-green-800 border-green-200';
    
    if (stockBalance < minimum && minimum > 0) {
      stockStatus = 'ต่ำกว่าขั้นต่ำ';
      stockStatusColor = 'bg-red-100 text-red-800 border-red-200';
    } else if (stockBalance > maximum && maximum > 0) {
      stockStatus = 'เกินสูงสุด';
      stockStatusColor = 'bg-orange-100 text-orange-800 border-orange-200';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${stockStatusColor}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          stockStatus === 'ปกติ' ? 'bg-green-500' :
          stockStatus === 'ต่ำกว่าขั้นต่ำ' ? 'bg-red-500' :
          'bg-orange-500'
        }`}></span>
        {stockStatus}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ลำดับ</TableHead>
            {/* <TableHead>รหัสอุปกรณ์</TableHead> */}
            <TableHead>อุปกรณ์</TableHead>
            <TableHead className="text-center">Stock Balance</TableHead>
            <TableHead className="text-center">Min/Max</TableHead>
            <TableHead>สถานะ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const stockBalance = item.stock_balance ?? 0;
            const minimum = item.stock_min ?? 0;
            const maximum = item.stock_max ?? 0;
            
            return (
              <TableRow key={item.itemcode}>
                <TableCell className="font-medium">
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </TableCell>
                <TableCell>
                  {/* <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {item.itemcode}
                  </code> */}
                </TableCell>
                <TableCell className="font-medium">{item.itemname || '-'}</TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-gray-900">
                    {stockBalance.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-xs">
                    <span className="text-gray-600">{minimum}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">{maximum}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getStockStatusBadge(stockBalance, minimum, maximum)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

