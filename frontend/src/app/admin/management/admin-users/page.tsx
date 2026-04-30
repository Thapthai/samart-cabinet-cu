"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api";
import { Loader2, UserCog, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { AdminJwtUserRow } from "@/types/auth";
import AdminUsersFilterSection, { type AdminUserListFilters } from "./components/AdminUsersFilterSection";
import AdminUsersTable from "./components/AdminUsersTable";
import CreateAdminUserDialog from "./components/CreateAdminUserDialog";

export default function AdminUsersManagementPage() {
  const [users, setUsers] = useState<AdminJwtUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchVersion, setSearchVersion] = useState(0);

  const [activeFilters, setActiveFilters] = useState<AdminUserListFilters>({
    search: "",
    status: "ALL",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authApi.listAdminUsers();
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
        if (res.message) toast.error(res.message);
      }
    } catch (error: unknown) {
      console.error("Load admin users error:", error);
      const msg = error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้";
      toast.error(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (filters: AdminUserListFilters) => {
    setActiveFilters(filters);
  };

  const filteredUsers = useMemo(() => {
    const q = activeFilters.search.trim().toLowerCase();
    return users.filter((row) => {
      const matchesSearch =
        q === "" ||
        row.email.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q);
      const matchesStatus =
        activeFilters.status === "ALL" ||
        (activeFilters.status === "ACTIVE" && row.is_active) ||
        (activeFilters.status === "INACTIVE" && !row.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [users, activeFilters]);

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout fullWidth>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-600" />
              <p className="mt-4 text-gray-600">กำลังโหลด...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl shadow-sm">
                <UserCog className="h-7 w-7 text-amber-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">ผู้ใช้ Admin (JWT)</h1>
                <p className="mt-0.5 text-sm text-gray-500">รายการบัญชีผู้ดูแลระบบ และเพิ่มผู้ใช้ใหม่</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm shrink-0"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              เพิ่มผู้ใช้ Admin
            </Button>
          </div>

          <AdminUsersFilterSection
            onSearch={handleSearch}
            onBeforeSearch={() => setSearchVersion((v) => v + 1)}
          />

          <AdminUsersTable key={`table-${searchVersion}`} users={filteredUsers} />

          <CreateAdminUserDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onCreated={() => loadData()}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
