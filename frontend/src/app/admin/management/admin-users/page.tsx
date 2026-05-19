"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserCog, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminUsersTab from "./components/AdminUsersTab";
import StaffUsersTab from "./components/StaffUsersTab";

type UserTab = "admin" | "staff";

function AdminUsersManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: UserTab = tabParam === "staff" ? "staff" : "admin";
  const [activeTab, setActiveTab] = useState<UserTab>(initialTab);
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);

  useEffect(() => {
    setActiveTab(tabParam === "staff" ? "staff" : "admin");
  }, [tabParam]);

  const onTabChange = useCallback(
    (value: string) => {
      const next = value === "staff" ? "staff" : "admin";
      setActiveTab(next);
      const url =
        next === "staff"
          ? "/admin/management/admin-users?tab=staff"
          : "/admin/management/admin-users";
      router.replace(url, { scroll: false });
    },
    [router],
  );

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 rounded-xl shadow-sm">
          <UserCog className="h-7 w-7 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">จัดการผู้ใช้ระบบ</h1>
          <p className="mt-0.5 text-sm text-gray-500">บัญชี Admin และ Staff </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-11 w-full sm:w-auto p-1 bg-slate-100/80">
            <TabsTrigger
              value="admin"
              className={cn(
                "gap-2 px-5 data-[state=active]:bg-amber-600 data-[state=active]:text-white",
              )}
            >
              <UserCog className="h-4 w-4" />
              Admin
            </TabsTrigger>
            <TabsTrigger
              value="staff"
              className={cn(
                "gap-2 px-5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white",
              )}
            >
              <Users className="h-4 w-4" />
              Staff
            </TabsTrigger>
          </TabsList>

          {activeTab === "admin" && (
            <Button
              onClick={() => setAdminCreateOpen(true)}
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm shrink-0 w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              เพิ่มผู้ใช้ Admin
            </Button>
          )}
          {activeTab === "staff" && (
            <Button
              onClick={() => setStaffCreateOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm shrink-0 w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              เพิ่ม Staff User
            </Button>
          )}
        </div>

        <TabsContent value="admin" className="mt-6 focus-visible:outline-none">
          <AdminUsersTab createOpen={adminCreateOpen} onCreateOpenChange={setAdminCreateOpen} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6 focus-visible:outline-none">
          {activeTab === "staff" ? (
            <StaffUsersTab createOpen={staffCreateOpen} onCreateOpenChange={setStaffCreateOpen} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminUsersManagementPage() {
  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <Suspense
          fallback={
            <div className="flex min-h-[320px] items-center justify-center text-slate-500">
              กำลังโหลด...
            </div>
          }
        >
          <AdminUsersManagementContent />
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}
