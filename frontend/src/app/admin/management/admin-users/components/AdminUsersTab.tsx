"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminJwtUserRow } from "@/types/auth";
import AdminUsersFilterSection, { type AdminUserListFilters } from "./AdminUsersFilterSection";
import AdminUsersTable from "./AdminUsersTable";
import CreateAdminUserDialog from "./CreateAdminUserDialog";

interface AdminUsersTabProps {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export default function AdminUsersTab({
  createOpen: createOpenProp,
  onCreateOpenChange,
}: AdminUsersTabProps = {}) {
  const [users, setUsers] = useState<AdminJwtUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpenInternal, setCreateOpenInternal] = useState(false);
  const showCreateDialog = onCreateOpenChange ? (createOpenProp ?? false) : createOpenInternal;
  const setShowCreateDialog = onCreateOpenChange ?? setCreateOpenInternal;
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
      <>
        <div className="flex items-center justify-center min-h-[280px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-600" />
            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
        <CreateAdminUserDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreated={() => loadData()}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
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
  );
}
