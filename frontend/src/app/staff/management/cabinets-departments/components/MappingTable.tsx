"use client";

import { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronDown, ChevronRight, Loader2, Package } from "lucide-react";
import { cabinetDepartmentApi } from "@/lib/api";
import { toast } from "sonner";

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

/** แถวจาก GET /cabinet-departments?cabinet_id= */
interface CabinetDepartmentLink {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string | null;
  weighing_slot_count?: number;
  weighing_dispense_count?: number;
  weighing_refill_count?: number;
  department?: { ID: number; DepName?: string; DepName2?: string };
  cabinet?: {
    id: number;
    cabinet_name?: string | null;
    cabinet_code?: string | null;
    stock_id?: number | null;
    cabinet_status?: string | null;
  };
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
  /** แคชรายการเชื่อมโยง cabinet_departments ต่อ cabinet_id — undefined = ยังไม่โหลด */
  const [linksByCabinetId, setLinksByCabinetId] = useState<{
    [cabinetId: number]: CabinetDepartmentLink[] | null | undefined;
  }>({});
  const [loadingCabinetId, setLoadingCabinetId] = useState<number | null>(null);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(mappings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMappings = mappings.slice(startIndex, endIndex);

  const handleDropdownToggle = async (e: React.MouseEvent, mapping: CabinetDepartment) => {
    e.stopPropagation();
    const cabinetId = mapping.cabinet_id;

    if (expandedDropdown === mapping.id) {
      setExpandedDropdown(null);
      return;
    }

    setExpandedDropdown(mapping.id);

    if (linksByCabinetId[cabinetId] !== undefined) {
      return;
    }

    try {
      setLoadingCabinetId(cabinetId);
      const res = await cabinetDepartmentApi.getAll({ cabinetId });

      if (res?.success && Array.isArray(res.data)) {
        setLinksByCabinetId((prev) => ({
          ...prev,
          [cabinetId]: res.data as CabinetDepartmentLink[],
        }));
      } else {
        setLinksByCabinetId((prev) => ({ ...prev, [cabinetId]: null }));
      }
    } catch (error: unknown) {
      console.error("Error loading cabinet-departments:", error);
      const msg = error instanceof Error ? error.message : "โหลดการเชื่อมโยงไม่สำเร็จ";
      toast.error(msg);
      setLinksByCabinetId((prev) => ({ ...prev, [cabinetId]: null }));
    } finally {
      setLoadingCabinetId(null);
    }
  };

  const handleRowClick = (mapping: CabinetDepartment) => {
    setSelectedRow(mapping);
  };

  const renderCabinetDepartmentLinks = (cabinetId: number, highlightMappingId: number) => {
    const links = linksByCabinetId[cabinetId];
    if (!links || links.length === 0) return null;

    const firstCab = links[0]?.cabinet;

    return (
      <div>
        <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
          <Package className="h-4 w-4" />
          การเชื่อมโยงตู้–แผนกของตู้นี้ — {links.length} รายการ
        </h4>
        {(firstCab?.cabinet_name || firstCab?.cabinet_code) && (
          <p className="text-sm text-muted-foreground mb-3">
            ตู้:{" "}
            <span className="font-medium text-foreground">
              {firstCab?.cabinet_name || "—"}{" "}
              {firstCab?.cabinet_code ? `(${firstCab.cabinet_code})` : ""}
            </span>
            {firstCab?.stock_id != null && (
              <span className="ml-2 tabular-nums">· Stock ID {firstCab.stock_id}</span>
            )}
          </p>
        )}
        <div className="space-y-2">
          {links.map((row) => (
            <div
              key={row.id}
              className={`rounded-lg border p-3 text-sm bg-white ${
                row.id === highlightMappingId
                  ? "border-blue-300 ring-1 ring-blue-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-gray-500">แผนก</span>
                  <p className="font-medium">{row.department?.DepName || "—"}</p>
                  {row.department?.DepName2 && (
                    <p className="text-xs text-muted-foreground">{row.department.DepName2}</p>
                  )}
                </div>
                <Badge
                  variant={row.status === "ACTIVE" ? "default" : "secondary"}
                  className={
                    row.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200 shrink-0"
                      : "shrink-0"
                  }
                >
                  {row.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-500">ช่องสต๊อกในตู้</span>
                  <p className="font-medium tabular-nums">{row.weighing_slot_count ?? 0}</p>
                </div>
                <div>
                  <span className="text-gray-500">เบิก / เติม (รายการ)</span>
                  <p className="font-medium tabular-nums">
                    {row.weighing_dispense_count ?? 0} / {row.weighing_refill_count ?? 0}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <span className="text-gray-500">หมายเหตุ</span>
                  <p className="font-medium">{row.description?.trim() || "—"}</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">
                mapping id #{row.id} · แผนก ID {row.department_id}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="shadow-sm border-gray-200/80 overflow-hidden rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            รายการเชื่อมโยงตู้–แผนกทั้งหมด ({mappings.length})
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
                  <TableHead className="text-center text-slate-600 font-semibold">ช่องสต๊อก / เบิก·เติม</TableHead>
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
                        <TableCell className="text-center text-sm">
                          <span className="font-medium text-slate-700 tabular-nums block">
                            ช่อง {mapping.weighing_slot_count ?? 0}
                          </span>
                          <span className="text-muted-foreground tabular-nums text-xs">
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
                            {loadingCabinetId === mapping.cabinet_id ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                <span className="ml-2 text-gray-600">กำลังโหลด cabinet_departments...</span>
                              </div>
                            ) : linksByCabinetId[mapping.cabinet_id]?.length ? (
                              renderCabinetDepartmentLinks(mapping.cabinet_id, mapping.id)
                            ) : linksByCabinetId[mapping.cabinet_id] !== undefined ? (
                              <div className="text-center py-4 text-gray-500">
                                ไม่พบการเชื่อมโยงเพิ่มเติมสำหรับตู้นี้
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
