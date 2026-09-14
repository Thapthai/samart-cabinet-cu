"use client";

import { useState, useEffect } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FilterState } from "../types.ts";
import SearchableSelect from "@/app/admin/items/components/SearchableSelect";
import { cabinetApi, departmentApi, cabinetDepartmentApi } from "@/lib/api";
import { staffCabinetApi, staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import { staffDepartmentApi } from "@/lib/staffApi/departmentApi";
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
  DepCode?: string;
}

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
  cabinetDepartments?: Array<{
    id: number;
    department_id: number;
    status: string;
  }>;
}

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    cabinet_status?: string;
  };
}

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  itemTypes: Array<{ id: string; name: string }>;
  loading: boolean;
  departmentDisabled?: boolean;
}

export default function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  loading,
  departmentDisabled,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await staffDepartmentApi.getAll({ limit: 50, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const loadCabinetsByDepartment = async (departmentId: string, keyword?: string) => {
    if (!departmentId || departmentId === "") {
      loadAllCabinets(keyword);
      return;
    }
    try {
      setLoadingCabinets(true);
      const response = await staffCabinetDepartmentApi.getAll({
        departmentId: parseInt(departmentId),
        keyword: keyword || undefined,
      });
      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();
        mappings
          .filter((mapping) => mapping.status === "ACTIVE")
          .forEach((mapping) => {
            if (mapping.cabinet && !uniqueCabinets.has(mapping.cabinet.id)) {
              uniqueCabinets.set(mapping.cabinet.id, {
                id: mapping.cabinet.id,
                cabinet_name: mapping.cabinet.cabinet_name,
                cabinet_code: mapping.cabinet.cabinet_code,
                cabinet_status: mapping.cabinet.cabinet_status,
              });
            }
          });
        setCabinets(Array.from(uniqueCabinets.values()));
      } else {
        setCabinets([]);
      }
    } catch (error) {
      console.error("Failed to load cabinets by department:", error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  };

  const loadAllCabinets = async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const response = await cabinetApi.getAll({ page: 1, limit: 50, keyword });
      if (response.success && response.data) {
        const allCabinets = response.data as Cabinet[];
        const filteredCabinets = allCabinets.filter((cabinet) => {
          if (cabinet.cabinetDepartments && cabinet.cabinetDepartments.length > 0) {
            return cabinet.cabinetDepartments.some((cd) => cd.status === "ACTIVE");
          }
          return cabinet.cabinet_status === "ACTIVE";
        });
        setCabinets(filteredCabinets);
      }
    } catch (error) {
      console.error("Failed to load cabinets:", error);
    } finally {
      setLoadingCabinets(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadCabinetsByDepartment(filters.departmentId);
  }, [filters.departmentId]);

  const handleSearch = () => {
    onSearch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล</CardTitle>
        <CardDescription>ค้นหาและกรองรายการเบิกอุปกรณ์จากตู้</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* รหัส/ชื่อเวชภัณฑ์ */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">รหัส/ชื่อเวชภัณฑ์</label>
          <Input
            placeholder="ค้นหา..."
            value={filters.searchItemCode}
            onChange={(e) => onFilterChange("searchItemCode", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full"
          />
        </div>

        {/* ช่วงวันที่ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
            <ExpireDateInput
              value={filters.startDate}
              onChange={(ymd) => onFilterChange("startDate", ymd)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
            <ExpireDateInput
              value={filters.endDate}
              onChange={(ymd) => onFilterChange("endDate", ymd)}
            />
          </div>
        </div>

        {/* แผนก & ตู้ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label="แผนก"
            placeholder="เลือกแผนก"
            value={filters.departmentId}
            onValueChange={(value) => {
              if (departmentDisabled) return;
              onFilterChange("departmentId", value);
              onFilterChange("cabinetId", "");
            }}
            options={[
              { value: "", label: "ทั้งหมด" },
              ...departments.map((dept) => ({
                value: dept.ID.toString(),
                label: dept.DepName || "",
                subLabel: dept.DepName2 || "",
              })),
            ]}
            loading={loadingDepartments}
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาชื่อแผนก..."
            disabled={departmentDisabled}
          />
          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={filters.departmentId ? "เลือกตู้ Cabinet" : "กรุณาเลือกแผนกก่อน"}
            value={filters.cabinetId}
            onValueChange={(value) => onFilterChange("cabinetId", value)}
            options={[
              { value: "", label: "ทั้งหมด" },
              ...cabinets.map((cabinet) => ({
                value: cabinet.id.toString(),
                label: cabinet.cabinet_name || "",
                subLabel: cabinet.cabinet_code || "",
              })),
            ]}
            loading={loadingCabinets}
            onSearch={(searchKeyword) => {
              if (filters.departmentId) {
                loadCabinetsByDepartment(filters.departmentId, searchKeyword);
              } else {
                loadAllCabinets(searchKeyword);
              }
            }}
            searchPlaceholder={filters.departmentId ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือกแผนกก่อน"}
            disabled={!filters.departmentId}
          />
        </div>

        {/* ปุ่ม */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button onClick={handleSearch} disabled={loading}>
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
