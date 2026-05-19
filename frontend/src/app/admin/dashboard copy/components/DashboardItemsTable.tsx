"use client";

import { Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Item } from "@/types/item";

interface DashboardItemsTableProps {
  items: Item[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onUpdateMinMax: (item: Item) => void;
  onPageChange: (page: number) => void;
}

const COLUMN_COUNT = 7;

export default function DashboardItemsTable({
  items,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}: DashboardItemsTableProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const getStatusBadge = (status: number | undefined) => {
    if (status === 0) {
      return <Badge variant="default">ใช้งาน</Badge>;
    }
    return <Badge variant="secondary">ไม่ใช้งาน</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการอุปกรณ์ ({totalItems})</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-sm text-gray-600">กำลังโหลด...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ลำดับ</TableHead>
                    {/* <TableHead>รหัสอุปกรณ์</TableHead> */}
                    <TableHead>อุปกรณ์</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead className="text-center">จำนวนในตู้</TableHead>
                    <TableHead className="text-center">Min/Max</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLUMN_COUNT} className="text-center text-gray-500">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => {
                      const countItemStock = (item as any).count_itemstock ?? 0;
                      const stockMin = item.stock_min ?? 0;
                      const isLowStock = stockMin > 0 && countItemStock < stockMin;

                      return (
                        <TableRow
                          key={item.itemcode}
                          className={`cursor-pointer hover:bg-gray-50 ${
                            isLowStock ? "bg-red-50 hover:bg-red-100" : ""
                          }`}
                        >
                          <TableCell>{startIndex + index + 1}</TableCell>
                          {/* <TableCell>{item.itemcode}</TableCell> */}
                          <TableCell>{item.itemname || "-"}</TableCell>
                          <TableCell>{item.department?.DepName || item.department?.DepName2 || (item.DepartmentID != null ? String(item.DepartmentID) : "-")}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Package className="h-4 w-4 text-blue-600" />
                              <span className={`font-semibold ${isLowStock ? "text-red-600" : "text-blue-600"}`}>
                                {countItemStock.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-gray-600">{item.stock_min ?? 0}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-gray-600">{item.stock_max ?? 0}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.item_status)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination - แบบเดียวกับรายการเชื่อมโยง (MappingTable) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  แสดง {startIndex + 1}-{Math.min(endIndex, totalItems)} จาก {totalItems} รายการ
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ก่อนหน้า
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
