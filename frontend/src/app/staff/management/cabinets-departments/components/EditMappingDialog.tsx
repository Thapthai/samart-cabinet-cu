"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import SearchableSelect from "@/app/admin/cabinet-departments/components/SearchableSelect";
import { cabinetApi, departmentApi } from "@/lib/api";

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
}

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
}

interface MappingFormData {
  cabinet_id: string;
  department_id: string;
  status: string;
  description: string;
}

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  cabinet?: { id: number; cabinet_name?: string; cabinet_code?: string };
  department?: { ID: number; DepName?: string; DepName2?: string };
}

interface EditMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: MappingFormData;
  setFormData: (data: MappingFormData) => void;
  onSubmit: () => void;
  saving: boolean;
  selectedMapping?: CabinetDepartmentMapping | null;
}

export default function EditMappingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving,
  selectedMapping,
}: EditMappingDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    await Promise.all([loadCabinets(""), loadDepartments("")]);
  };

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

  const loadCabinets = async (keyword?: string) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        key={selectedMapping ? `edit-mapping-${selectedMapping.id}` : "edit-mapping-new"}
      >
        <DialogHeader>
          <DialogTitle>แก้ไขการเชื่อมโยง</DialogTitle>
          <DialogDescription>แก้ไขการเชื่อมโยงตู้กับแผนก</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <SearchableSelect
            label="ตู้"
            placeholder="เลือกตู้"
            value={formData.cabinet_id}
            onValueChange={(value) => setFormData({ ...formData, cabinet_id: value })}
            options={cabinets
              .filter(
                (cabinet) =>
                  (cabinet as Cabinet & { cabinet_status?: string }).cabinet_status !== "USED" ||
                  cabinet.id.toString() === selectedMapping?.cabinet_id?.toString()
              )
              .map((cabinet) => ({
                value: cabinet.id.toString(),
                label: cabinet.cabinet_name || "",
                subLabel: cabinet.cabinet_code || "",
              }))}
            loading={loadingCabinets}
            required
            onSearch={loadCabinets}
            searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
            initialDisplay={
              selectedMapping?.cabinet
                ? {
                    label: selectedMapping.cabinet.cabinet_name || "",
                    subLabel: selectedMapping.cabinet.cabinet_code || "",
                  }
                : undefined
            }
          />

          <SearchableSelect
            label="แผนก"
            placeholder="เลือกแผนก"
            value={formData.department_id}
            onValueChange={(value) => setFormData({ ...formData, department_id: value })}
            options={departments.map((dept) => ({
              value: dept.ID.toString(),
              label: dept.DepName || "",
              subLabel: dept.DepName2 || "",
            }))}
            loading={loadingDepartments}
            required
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาชื่อแผนก..."
            initialDisplay={
              selectedMapping?.department
                ? {
                    label: selectedMapping.department.DepName || "",
                    subLabel: selectedMapping.department.DepName2 || "",
                  }
                : undefined
            }
          />

          <div>
            <Label>สถานะ</Label>
            <Select
              value={formData.status || "ACTIVE"}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>หมายเหตุ</Label>
            <Input
              placeholder="หมายเหตุ..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึก"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
