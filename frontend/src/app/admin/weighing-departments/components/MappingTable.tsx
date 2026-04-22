"use client";

import { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronDown, ChevronRight, Loader2, Package } from "lucide-react";
import { weighingApi } from "@/lib/api";
import { toast } from "sonner";
import { WeighingSlotPill } from "../../items-stock/components/WeighingSlotPill";

interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  weighing_slot_count?: number;
  weighing_dispense_count?: number;
  weighing_refill_count?: number;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    stock_id?: number | null;
  };
  department?: {
    ID: number;
    DepName?: string;
  };
}

interface WeighingSlot {
  id: number;
  itemcode: string;
  StockID: number;
  SlotNo: number;
  Sensor: number;
  Qty: number;
  item?: { itemname?: string | null; Alternatename?: string | null } | null;
}

interface MappingTableProps {
  mappings: CabinetDepartment[];
  onEdit: (mapping: CabinetDepartment) => void;
  onDelete: (mapping: CabinetDepartment) => void;
}

export default function MappingTable({ mappings, onEdit, onDelete }: MappingTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<CabinetDepartment | null>(null);
  const [expandedDropdown, setExpandedDropdown] = useState<number | null>(null);
  const [weighingSlots, setWeighingSlots] = useState<{ [key: number]: WeighingSlot[] }>({});
  const [loadingSlots, setLoadingSlots] = useState<number | null>(null);
  const [dropdownPage, setDropdownPage] = useState<{ [key: number]: number }>({});
  const itemsPerPage = 5;
  const itemsPerDropdown = 10;

  const totalPages = Math.ceil(mappings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMappings = mappings.slice(startIndex, endIndex);

  const handleDropdownToggle = async (e: React.MouseEvent, mapping: CabinetDepartment) => {
    e.stopPropagation();
    const cabinetId = mapping.cabinet_id;
    const stockId = mapping.cabinet?.stock_id;

    if (expandedDropdown === mapping.id) {
      setExpandedDropdown(null);
      return;
    }

    setExpandedDropdown(mapping.id);

    if (weighingSlots[cabinetId] || !stockId) {
      if (!stockId) {
        setWeighingSlots((prev) => ({ ...prev, [cabinetId]: [] }));
      }
      return;
    }

    try {
      setLoadingSlots(cabinetId);
      const res = await weighingApi.getAll({
        stockId,
        page: 1,
        limit: 1000,
      });

      if (res?.success && Array.isArray(res.data)) {
        setWeighingSlots((prev) => ({ ...prev, [cabinetId]: res.data }));
        setDropdownPage((prev) => ({ ...prev, [cabinetId]: 1 }));
      } else {
        setWeighingSlots((prev) => ({ ...prev, [cabinetId]: [] }));
      }
    } catch (error: any) {
      console.error("Error loading weighing slots:", error);
      toast.error(error.message || "โหลดสต๊อก Weighing ไม่สำเร็จ");
      setWeighingSlots((prev) => ({ ...prev, [cabinetId]: [] }));
    } finally {
      setLoadingSlots(null);
    }
  };

  const handleRowClick = (mapping: CabinetDepartment) => {
    setSelectedRow(mapping);
  };

  const handleLoadMore = (cabinetId: number) => {
    setDropdownPage((prev) => ({
      ...prev,
      [cabinetId]: (prev[cabinetId] || 1) + 1,
    }));
  };

  const renderWeighingSlots = (cabinetId: number, mappingId: number) => {
    const slots = weighingSlots[cabinetId];
    if (!slots || slots.length === 0) return null;

    const page = dropdownPage[cabinetId] || 1;
    const displayed = slots.slice(0, page * itemsPerDropdown);

    return (
      <div>
        <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
          <Package className="h-4 w-4" />
          สต๊อกในตู้ Weighing ({slots.length} รายการ)
        </h4>
        <div className="space-y-2">
          {displayed.map((row, idx) => (
            <div
              key={`mapping-${mappingId}-slot-${row.id}-${idx}`}
              className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
            >
              <div className="grid grid-cols-2 md:grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-2 md:gap-4 text-sm">
                <div className="w-fit md:min-w-[60px]">
                  <span className="text-gray-500">ลำดับ:</span>
                  <span className="ml-1 font-medium">{idx + 1}</span>
                </div>
                <div className="w-fit md:min-w-[120px]">
                  <span className="text-gray-500">รหัส:</span>
                  <span className="ml-2 font-medium font-mono">{row.itemcode}</span>
                </div>
                <div className="w-fit md:min-w-[500px]">
                  <span className="text-gray-500">ชื่อสินค้า:</span>
                  <span className="ml-2 font-medium">
                    {row.item?.itemname || row.item?.Alternatename || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">ช่อง:</span>
                  <span className="ml-2 font-medium">{row.SlotNo}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-gray-500">สล็อต:</span>
                  <WeighingSlotPill sensor={row.Sensor} />
                </div>
                <div>
                  <span className="text-gray-500">จำนวน:</span>
                  <span className="ml-2 font-medium tabular-nums">{row.Qty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {slots.length > page * itemsPerDropdown && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={() => handleLoadMore(cabinetId)}>
              ดูเพิ่มเติม ({slots.length - page * itemsPerDropdown} รายการ)
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="shadow-sm border-gray-200/80 overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            รายการเชื่อมโยง ({mappings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 border-b border-slate-200">
                  <TableHead className="w-12 text-slate-600 font-semibold"></TableHead>
                  <TableHead className="text-slate-600 font-semibold">ลำดับ</TableHead>
                  <TableHead className="text-slate-600 font-semibold">ชื่อตู้</TableHead>
                  <TableHead className="text-slate-600 font-semibold">แผนก</TableHead>
                  <TableHead className="text-center text-slate-600 font-semibold">จำนวนสต๊อก Weighing</TableHead>
                  <TableHead className="text-slate-600 font-semibold">สถานะ</TableHead>
                  <TableHead className="text-slate-600 font-semibold">หมายเหตุ</TableHead>
                  <TableHead className="text-right text-slate-600 font-semibold">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMappings.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  currentMappings.map((mapping, index) => (
                    <Fragment key={mapping.id}>
                      <TableRow
                        className={`cursor-pointer transition-colors ${selectedRow?.id === mapping.id ? "bg-blue-50/80" : "hover:bg-slate-50/80"
                          }`}
                        onClick={() => handleRowClick(mapping)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDropdownToggle(e, mapping)}
                            className="hover:bg-gray-200 p-1 rounded"
                          >
                            {expandedDropdown === mapping.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">{startIndex + index + 1}</TableCell>
                        <TableCell className="font-medium">{mapping.cabinet?.cabinet_name || "-"}</TableCell>
                        <TableCell className="text-gray-700">{mapping.department?.DepName || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-slate-700">
                            เบิก {mapping.weighing_dispense_count ?? 0} / เติม {mapping.weighing_refill_count ?? 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={mapping.status === "ACTIVE" ? "default" : "secondary"}
                            className={
                              mapping.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : ""
                            }
                          >
                            {mapping.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {mapping.description || "-"}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEdit(mapping)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(mapping)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {expandedDropdown === mapping.id && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-gray-50 p-4">
                            {loadingSlots === mapping.cabinet_id ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                <span className="ml-2 text-gray-600">กำลังโหลดสต๊อก Weighing...</span>
                              </div>
                            ) : weighingSlots[mapping.cabinet_id]?.length > 0 ? (
                              renderWeighingSlots(mapping.cabinet_id, mapping.id)
                            ) : weighingSlots[mapping.cabinet_id] && weighingSlots[mapping.cabinet_id].length === 0 ? (
                              <div className="text-center py-4 text-gray-500">
                                ไม่พบสต๊อก Weighing ในตู้นี้
                              </div>
                            ) : !mapping.cabinet?.stock_id ? (
                              <div className="text-center py-4 text-gray-500">
                                ตู้นี้ไม่มี stock_id
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-4 pb-4 gap-4 flex-wrap">
              <div className="text-sm text-muted-foreground">
                แสดง {startIndex + 1}-{Math.min(endIndex, mappings.length)} จาก {mappings.length} รายการ
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="shadow-sm"
                >
                  ก่อนหน้า
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="shadow-sm"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
