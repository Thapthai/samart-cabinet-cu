"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cabinetDepartmentApi } from "@/lib/api";
import { Loader2, Network } from "lucide-react";
import { toast } from "sonner";
import FilterSection from "./components/FilterSection";
import MappingTable from "./components/MappingTable";
import CreateMappingDialog from "./components/CreateMappingDialog";
import EditMappingDialog from "./components/EditMappingDialog";
import DeleteMappingDialog from "./components/DeleteMappingDialog";

interface ManagementCabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
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
  weighing_slot_count?: number;
  weighing_dispense_count?: number;
  weighing_refill_count?: number;
}

export default function ManagementCabinetDepartmentsPage() {
  const [mappings, setMappings] = useState<ManagementCabinetDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<ManagementCabinetDepartment | null>(null);
  const [filterVersion, setFilterVersion] = useState(0);
  const [searchVersion, setSearchVersion] = useState(0);

  const [activeFilters, setActiveFilters] = useState({
    cabinetId: "",
    departmentId: "",
    status: "ALL",
  });

  const [formData, setFormData] = useState({
    cabinet_id: "",
    department_id: "",
    status: "ACTIVE",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const mappingsRes = await cabinetDepartmentApi.getAll({});

      if (mappingsRes.success && mappingsRes.data) {
        setMappings(mappingsRes.data as ManagementCabinetDepartment[]);
      }
    } catch (error: any) {
      console.error("Load data error:", error);
      toast.error(error.message || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (filters: { cabinetId: string; departmentId: string; status: string }) => {
    setActiveFilters(filters);
  };

  const resetFilters = () => {
    setActiveFilters({
      cabinetId: "",
      departmentId: "",
      status: "ALL",
    });
    setFilterVersion((prev) => prev + 1);
    setSearchVersion((v) => v + 1);
  };

  const handleCreate = () => {
    setFormData({
      cabinet_id: "",
      department_id: "",
      status: "ACTIVE",
      description: "",
    });
    setShowCreateDialog(true);
  };

  const handleEdit = (mapping: ManagementCabinetDepartment) => {
    setSelectedMapping(mapping);
    setFormData({
      cabinet_id: mapping.cabinet_id.toString(),
      department_id: mapping.department_id.toString(),
      status: mapping.status,
      description: mapping.description || "",
    });
    setShowEditDialog(true);
  };

  const handleDelete = (mapping: ManagementCabinetDepartment) => {
    setSelectedMapping(mapping);
    setShowDeleteDialog(true);
  };

  const submitCreate = async () => {
    if (!formData.cabinet_id || !formData.department_id) {
      toast.error("กรุณาเลือกตู้และแผนก");
      return;
    }

    try {
      setSaving(true);
      const response = await cabinetDepartmentApi.create({
        cabinet_id: parseInt(formData.cabinet_id),
        department_id: parseInt(formData.department_id),
        status: formData.status,
        description: formData.description,
      });

      if (response.success) {
        toast.success("สร้างการเชื่อมโยงเรียบร้อยแล้ว");
        setShowCreateDialog(false);
        loadData();
      } else {
        toast.error(response.message || "ไม่สามารถสร้างการเชื่อมโยงได้");
      }
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedMapping) return;

    if (!formData.cabinet_id || !formData.department_id) {
      toast.error("กรุณาเลือกตู้และแผนก");
      return;
    }

    const status = formData.status?.trim() !== "" ? formData.status : "ACTIVE";

    try {
      setSaving(true);
      const response = await cabinetDepartmentApi.update(selectedMapping.id, {
        cabinet_id: parseInt(formData.cabinet_id),
        department_id: parseInt(formData.department_id),
        status,
        description: formData.description,
      });

      if (response.success) {
        toast.success("อัพเดทการเชื่อมโยงเรียบร้อยแล้ว");
        setShowEditDialog(false);
        resetFilters();
        loadData();
      } else {
        toast.error(response.message || "ไม่สามารถอัพเดทการเชื่อมโยงได้");
      }
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selectedMapping) return;

    try {
      setSaving(true);
      const response = await cabinetDepartmentApi.delete(selectedMapping.id);

      if (response.success) {
        toast.success("ลบการเชื่อมโยงเรียบร้อยแล้ว");
        setShowDeleteDialog(false);
        loadData();
      } else {
        toast.error(response.message || "ไม่สามารถลบการเชื่อมโยงได้");
      }
    } catch (error: any) {
      toast.error(error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const filteredMappings = mappings.filter((mapping) => {
    const matchesCabinet =
      activeFilters.cabinetId === "" || mapping.cabinet_id.toString() === activeFilters.cabinetId;
    const matchesDepartment =
      activeFilters.departmentId === "" ||
      mapping.department_id.toString() === activeFilters.departmentId;
    const matchesStatus =
      activeFilters.status === "ALL" || mapping.status === activeFilters.status;
    return matchesCabinet && matchesDepartment && matchesStatus;
  });

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
              <Network className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                จัดการตู้ - แผนก
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                จัดการตู้เพื่อเชื่อมโยงกับแผนก
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreate}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0"
          >
            <Network className="mr-2 h-5 w-5" />
            เพิ่มการเชื่อมโยง
          </Button>
        </div>

        <FilterSection
          onSearch={handleSearch}
          onBeforeSearch={() => setSearchVersion((v) => v + 1)}
          key={`filter-${filterVersion}`}
        />

        <MappingTable
          key={`table-${searchVersion}`}
          mappings={filteredMappings}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <CreateMappingDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          formData={formData}
          setFormData={setFormData}
          onSubmit={submitCreate}
          saving={saving}
        />

        <EditMappingDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          formData={formData}
          setFormData={setFormData}
          onSubmit={submitEdit}
          saving={saving}
          selectedMapping={selectedMapping}
        />

        <DeleteMappingDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={submitDelete}
          saving={saving}
        />
      </div>
    </>
  );
}
