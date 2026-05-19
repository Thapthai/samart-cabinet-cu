'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirect ไปหน้า login รวม (แท็บ Staff) */
export default function StaffLoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
    router.replace(`${base}/auth/login`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
      กำลังเปลี่ยนเส้นทาง...
    </div>
  );
}
