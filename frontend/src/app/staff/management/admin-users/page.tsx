"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserCog, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { isAdminUser } from "@/lib/auth/roles";
import AdminUsersTab from "./components/AdminUsersTab";
import StaffUsersTab from "./components/StaffUsersTab";

type UserTab = "admin" | "staff";

const BASE_PATH = "/staff/management/admin-users";

function StaffUsersManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canManageAdmin = isAdminUser(user);

  const tabParam = searchParams.get("tab");
  const initialTab: UserTab =
    tabParam === "admin" && canManageAdmin ? "admin" : "staff";

  const [activeTab, setActiveTab] = useState<UserTab>(initialTab);
  const [adminCreateOpen, setAdminCreateOpen] = useState(false);
  const [staffCreateOpen, setStaffCreateOpen] = useState(false);

  useEffect(() => {
    if (tabParam === "admin" && !canManageAdmin) {
      router.replace(BASE_PATH, { scroll: false });
      setActiveTab("staff");
      return;
    }
    setActiveTab(tabParam === "admin" && canManageAdmin ? "admin" : "staff");
  }, [tabParam, canManageAdmin, router]);

  const onTabChange = useCallback(
    (value: string) => {
      const next = value === "admin" ? "admin" : "staff";
      if (next === "admin" && !canManageAdmin) return;
      setActiveTab(next);
      const url = next === "admin" ? `${BASE_PATH}?tab=admin` : BASE_PATH;
      router.replace(url, { scroll: false });
    },
    [router, canManageAdmin],
  );

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/staff/management"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-gray-500 hover:text-pink-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับเมนูการจัดการ
        </Link>

        <div className="flex items-center gap-4">
          <div className="p-3 bg-pink-100 rounded-xl shadow-sm">
            <Users className="h-7 w-7 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">จัดการผู้ใช้ระบบ</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {canManageAdmin
                ? "บัญชี Admin และ Staff (Staff Portal)"
                : "จัดการบัญชีพนักงาน Staff"}
            </p>
          </div>
        </div>
      </div>

      {canManageAdmin ? (
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="h-11 w-full sm:w-auto p-1 bg-pink-50/80 border border-pink-100">
              <TabsTrigger
                value="staff"
                className={cn(
                  "gap-2 px-5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white",
                )}
              >
                <Users className="h-4 w-4" />
                Staff
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className={cn(
                  "gap-2 px-5 data-[state=active]:bg-amber-600 data-[state=active]:text-white",
                )}
              >
                <UserCog className="h-4 w-4" />
                Admin
              </TabsTrigger>
            </TabsList>

            {activeTab === "staff" && (
              <Button
                onClick={() => setStaffCreateOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-sm shrink-0 w-full sm:w-auto"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                เพิ่ม Staff User
              </Button>
            )}
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
          </div>

          <TabsContent value="staff" className="mt-6 focus-visible:outline-none">
            <StaffUsersTab createOpen={staffCreateOpen} onCreateOpenChange={setStaffCreateOpen} />
          </TabsContent>

          <TabsContent value="admin" className="mt-6 focus-visible:outline-none">
            {activeTab === "admin" ? (
              <AdminUsersTab createOpen={adminCreateOpen} onCreateOpenChange={setAdminCreateOpen} />
            ) : null}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setStaffCreateOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-sm w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              เพิ่ม Staff User
            </Button>
          </div>
          <StaffUsersTab createOpen={staffCreateOpen} onCreateOpenChange={setStaffCreateOpen} />
        </div>
      )}
    </div>
  );
}

export default function StaffUsersManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center text-gray-500">
          กำลังโหลด...
        </div>
      }
    >
      <StaffUsersManagementContent />
    </Suspense>
  );
}
