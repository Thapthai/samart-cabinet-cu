"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import SearchableSelect from "@/app/admin/cabinet-departments/components/SearchableSelect";
import { cabinetApi, departmentApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
}

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
}

interface FilterSectionProps {
  onSearch: (filters: { cabinetId: string; departmentId: string; status: string }) => void;
  onBeforeSearch?: () => void;
}

export default function FilterSection({ onSearch, onBeforeSearch }: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const [formFilters, setFormFilters] = useState({
    cabinetId: "",
    departmentId: "",
    status: "ALL",
  });

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 50, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  /** รายการตู้จาก master เหมือนหน้า admin/management/cabinets (GET /cabinets) */
  const loadManagementCabinets = async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const params: { page: number; limit: number; keyword?: string } = {
        page: 1,
        limit: 500,
      };
      if (keyword?.trim()) params.keyword = keyword.trim();

      const response = (await cabinetApi.getAll(params)) as {
        success?: boolean;
        data?: Cabinet[];
      };

      if (response?.success !== false && Array.isArray(response?.data)) {
        setCabinets(response.data);
      } else {
        setCabinets([]);
      }
    } catch (error) {
      console.error("Failed to load cabinets:", error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  };

  useEffect(() => {
    loadManagementCabinets();
  }, []);

  const handleApply = () => {
    onBeforeSearch?.();
    onSearch(formFilters);
  };

  const handleReset = () => {
    const defaultFilters = { cabinetId: "", departmentId: "", status: "ALL" };
    setFormFilters(defaultFilters);
    onSearch(defaultFilters);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-1 shadow-sm shadow-slate-200/40",
        "ring-offset-background transition-shadow focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:ring-offset-2"
      )}
    >
      <div className="space-y-5 rounded-xl bg-white/90 px-3 py-4 sm:px-5 sm:py-5 backdrop-blur-sm">
        <div className="flex gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25"
            aria-hidden
          >
            <Filter className="h-[18px] w-[18px] opacity-95" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-slate-900">ค้นหาและกรอง</h2>
            <p className="text-[11px] text-slate-400 sm:text-xs">
              เลือกแผนก ตู้ และสถานะ แล้วกดค้นหา — การกรองใช้กับรายการด้านล่าง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SearchableSelect
            label="แผนก"
            placeholder="เลือกแผนก"
            value={formFilters.departmentId}
            onValueChange={(value) => {
              setFormFilters({ ...formFilters, departmentId: value, cabinetId: "" });
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
          />

          <SearchableSelect
            label="ตู้"
            placeholder="เลือกตู้หรือค้นหาชื่อ/รหัส"
            value={formFilters.cabinetId}
            onValueChange={(value) => setFormFilters({ ...formFilters, cabinetId: value })}
            options={[
              { value: "", label: "ทั้งหมด" },
              ...cabinets.map((cabinet) => ({
                value: cabinet.id.toString(),
                label: cabinet.cabinet_name || "",
                subLabel: cabinet.cabinet_code || "",
              })),
            ]}
            loading={loadingCabinets}
            onSearch={(searchKeyword) => loadManagementCabinets(searchKeyword)}
            searchPlaceholder="ค้นหารหัสหรือชื่อตู้ (เหมือนหน้าจัดการตู้)..."
          />

          <div className="space-y-2">
            <Label htmlFor="mapping-status-filter" className="text-slate-700">
              สถานะการเชื่อมโยง
            </Label>
            <Select
              value={formFilters.status}
              onValueChange={(value) => setFormFilters({ ...formFilters, status: value })}
            >
              <SelectTrigger
                id="mapping-status-filter"
                className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
              >
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="h-10 rounded-xl border-slate-200 hover:bg-slate-50 sm:min-w-[100px]"
          >
            รีเซ็ต
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="h-10 min-w-[120px] rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 font-medium text-white shadow-md shadow-blue-500/20 hover:from-blue-600 hover:to-indigo-700"
          >
            ค้นหา
          </Button>
        </div>
      </div>
    </div>
  );
}
