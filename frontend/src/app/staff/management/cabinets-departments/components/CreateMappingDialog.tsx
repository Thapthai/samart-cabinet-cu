"use client";

import { useState, useEffect, useRef } from "react";
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

interface FormData {
  cabinet_id: string;
  department_id: string;
  status: string;
  description: string;
}

interface CreateMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
  onSubmit: () => void;
  saving: boolean;
}

export default function CreateMappingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving,
}: CreateMappingDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const dropdownSlotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setFormData({ ...formData, status: "ACTIVE" });
      loadCabinets();
    }
  }, [open]);

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 10, keyword });
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <div ref={dropdownSlotRef} className="relative flex flex-col flex-1 min-h-0">
          <DialogHeader className="shrink-0">
            <DialogTitle>เพิ่มการเชื่อมโยงใหม่</DialogTitle>
            <DialogDescription>เชื่อมโยงตู้กับแผนก (ทุกตู้ในระบบ)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-1">
            <SearchableSelect
              label="ตู้"
              portalTargetRef={dropdownSlotRef}
              placeholder="เลือกตู้"
              value={formData.cabinet_id}
              onValueChange={(value) => setFormData({ ...formData, cabinet_id: value })}
              options={cabinets
                .filter((c) => (c as Cabinet & { cabinet_status?: string }).cabinet_status !== "USED")
                .map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || "",
                  subLabel: cabinet.cabinet_code || "",
                }))}
              loading={loadingCabinets}
              required
              onSearch={loadCabinets}
              searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
            />

            <SearchableSelect
              label="แผนก"
              portalTargetRef={dropdownSlotRef}
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
            />

            <div>
              <Label>หมายเหตุ</Label>
              <Input
                placeholder="หมายเหตุ..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t pt-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
