"use client";

import { useState, Fragment } from "react";
import { Package, RefreshCw, Gauge, ChevronDown, ChevronRight, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/item";

/** itemcode -> max_available_qty (แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน / รอแจ้ง) จาก will-return */
interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onUpdateMinMax: (item: Item) => void;
  onPageChange: (page: number) => void;
  headerActions?: React.ReactNode;
}

const COLUMN_COUNT = 12;
const NEAR_EXPIRY_DAYS = 30;

function isExpired(expireStr: string | null | undefined): boolean {
  if (!expireStr) return false;
  const d = new Date(expireStr);
  return d.getTime() < Date.now();
}

function isNearExpiry(expireStr: string | null | undefined): boolean {
  if (!expireStr) return false;
  const d = new Date(expireStr);
  const now = Date.now();
  const end = new Date(now);
  end.setDate(end.getDate() + NEAR_EXPIRY_DAYS);
  return d.getTime() >= now && d.getTime() <= end.getTime();
}

function getItemDepartmentDisplay(item: Item): string {
  if (item.department?.DepName || item.department?.DepName2) {
    return item.department.DepName || item.department.DepName2 || "-";
  }
  const itemStocks = item.itemStocks ?? [];
  const names = new Set<string>();
  itemStocks.forEach((stock) => {
    stock.cabinet?.cabinetDepartments?.forEach((cd) => {
      const name = cd.department?.DepName || cd.department?.DepName2;
      if (name) names.add(name);
    });
  });
  return names.size > 0 ? [...names].join(", ") : "-";
}

export default function ItemsTable({
  items,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onUpdateMinMax,
  onPageChange,
  headerActions,
}: ItemsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const getStatusBadge = (status: number | undefined) => {
    if (status === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-green-100 text-green-800 border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          ใช้งาน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        ไม่ใช้งาน
      </span>
    );
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };
console.log(items);
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 pb-2">
        <div className="space-y-1.5">
          <CardTitle>รายการอุปกรณ์</CardTitle>
          <CardDescription>
            แสดง {items.length} รายการ จากทั้งหมด {totalItems} อุปกรณ์
          </CardDescription>
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">ไม่พบข้อมูลอุปกรณ์</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead className="w-[100px]">ลำดับ</TableHead>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead>อุปกรณ์</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead className="text-center">จำนวนในตู้</TableHead>
                    <TableHead className="text-center">จำนวนอุปกรณ์ที่ถูกใช้งานในปัจจุบัน</TableHead>
                    <TableHead className="text-center">Min/Max</TableHead>
                    <TableHead className="text-center">ชำรุด</TableHead>
                    <TableHead className="text-center">จำนวนที่ต้องเติม</TableHead>
                    <TableHead>สถานะ</TableHead>

                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const countItemStock = (item as Item & { count_itemstock?: number }).count_itemstock ?? item.itemStocks?.length ?? 0;
                    const stockMin = item.stock_min ?? 0;
                    const isLowStock = stockMin > 0 && countItemStock < stockMin;
                    const itemStocks = (item.itemStocks ?? []).filter(
                      (s) => s.IsStock === true || (s as { IsStock?: boolean | number }).IsStock === 1
                    );
                    const isExpanded = expandedRow === item.itemcode;
                    const hasExpired = itemStocks.some((s) => isExpired(s.ExpireDate));
                    const hasNearExpiry = !hasExpired && itemStocks.some((s) => isNearExpiry(s.ExpireDate));

                    return (
                      <Fragment key={item.itemcode}>
                        <TableRow
                          className={cn(
                            "transition-colors",
                            hasExpired && "bg-orange-100 hover:bg-orange-200",
                            !hasExpired && hasNearExpiry && "bg-amber-100 hover:bg-amber-200",
                            !hasExpired && !hasNearExpiry && isLowStock && "bg-red-50 hover:bg-red-100",
                            !hasExpired && !hasNearExpiry && !isLowStock && "hover:bg-slate-50/80"
                          )}
                        >
                          <TableCell className="w-12">
                            {itemStocks.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setExpandedRow(isExpanded ? null : item.itemcode)}
                                className="hover:bg-gray-200 p-1 rounded"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 inline-block" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {item.itemcode}
                            </code>
                          </TableCell>
                          <TableCell className={cn("font-medium", hasExpired && "text-red-600 font-semibold")}>
                            {item.itemname || "-"}
                            {hasExpired && (
                              <span className="ml-2 text-xs font-medium text-red-600">(มีอุปกรณ์หมดอายุ)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{getItemDepartmentDisplay(item)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Archive className="h-4 w-4 text-blue-600" />
                              <span className={`font-semibold ${isLowStock ? "text-red-600" : "text-blue-600"}`}>
                                {countItemStock.toLocaleString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-slate-700">{item.qty_in_use ?? 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-gray-600">{item.stock_min ?? 0}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-gray-600">{item.stock_max ?? 0}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "font-medium",
                              (Number(item.damaged_qty) || 0) > 0 && "text-amber-700"
                            )}>
                              {Number(item.damaged_qty) || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-slate-700">
                              {(item as Item & { refill_qty?: number }).refill_qty ?? 0}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.item_status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onUpdateMinMax(item)}
                              title="ตั้งค่า Min/Max"
                              className="text-purple-600 hover:text-purple-700 hover:border-purple-600"
                            >
                              <Gauge className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && itemStocks.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <div>
                                <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  รายการสต็อกอุปกรณ์ในตู้ ({itemStocks.length} รายการ)
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">ลำดับ</TableHead>
                                        <TableHead>ตู้ (Cabinet)</TableHead>
                                        <TableHead>แผนก</TableHead>
                                        <TableHead>สถานะสต็อก</TableHead>
                                        <TableHead>หมดอายุ</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {itemStocks.map((stock, idx) => {
                                        const expireStr = stock.ExpireDate;
                                        const expireDate = expireStr ? new Date(expireStr) : null;
                                        const expired = isExpired(expireStr);
                                        const nearExpiry = !expired && isNearExpiry(expireStr);
                                        const expireDisplay = expireStr
                                          ? expireDate?.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) ?? expireStr
                                          : "-";
                                        return (
                                          <TableRow
                                            key={stock.RowID ?? idx}
                                            className={expired ? "bg-red-100 hover:bg-red-100" : nearExpiry ? "bg-amber-50 hover:bg-amber-50" : ""}
                                          >
                                            <TableCell className="font-medium">{idx + 1}</TableCell>
                                            <TableCell>
                                              {stock.cabinet?.cabinet_name || stock.cabinet?.cabinet_code || "-"}
                                            </TableCell>
                                            <TableCell>
                                              {stock.cabinet?.cabinetDepartments?.map((cd) => cd.department?.DepName || cd.department?.DepName2 || "-").join(", ") || "-"}
                                            </TableCell>
                                            <TableCell>
                                              {stock.IsStock === true || (stock as { IsStock?: boolean | number }).IsStock === 1 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200">
                                                  อยู่ในตู้
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                  ถูกเบิก
                                                </span>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {expireDisplay}
                                              {expired && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200">
                                                  หมดอายุ
                                                </span>
                                              )}
                                              {nearExpiry && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                  ใกล้หมดอายุ
                                                </span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-500">
                  หน้า {currentPage} จาก {totalPages} ({totalItems} อุปกรณ์)
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
                    แรกสุด
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                    ก่อนหน้า
                  </Button>
                  {generatePageNumbers().map((page, idx) =>
                    page === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page as number)}
                      >
                        {page}
                      </Button>
                    )
                  )}
                  <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    ถัดไป
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
                    สุดท้าย
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
