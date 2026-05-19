"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirect ไปหน้ารวมผู้ใช้ (แท็บ Staff) */
export default function StaffUsersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/management/admin-users?tab=staff");
  }, [router]);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-slate-500 text-sm">
      กำลังเปลี่ยนเส้นทาง...
    </div>
  );
}
