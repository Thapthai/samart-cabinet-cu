'use client';

import Link from 'next/link';
import { Package, Users, Shield, Layers, UserCog } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const managementMenus = [
  {
    name: 'จัดการประเภทตู้',
    href: '/admin/management/cabinet_type',
    icon: Layers,
    description: 'ประเภท Weighing / RFID — วันหมดอายุ และการแสดง RFID',
    color: 'from-violet-500 to-fuchsia-600',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
  },
  {
    name: 'จัดการตู้ Cabinet',
    href: '/admin/management/cabinets',
    icon: Package,
    description: 'จัดการตู้ Cabinet ตั้งค่าและเชื่อมโยงกับแผนก',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    name: 'เพิ่มผู้ใช้ Admin',
    href: '/admin/management/admin-users',
    icon: UserCog,
    description: 'ลงทะเบียนบัญชีผู้ดูแลระบบ (JWT) ผ่าน /auth/register',
    color: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    name: 'Staff Users',
    href: '/admin/management/staff-users',
    icon: Users,
    description: 'จัดการ Staff Users และ Client Credentials',
    color: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    name: 'Staff Permission Role',
    href: '/admin/management/permission-role',
    icon: Shield,
    description: 'จัดการ Staff Permission Role และสิทธิ์การใช้งาน',
    color: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
];

export default function ManagementPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">การจัดการ</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                จัดการระบบ ตู้ Cabinet ผู้ใช้ Staff และสิทธิ์
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {managementMenus.map((menu) => {
              const Icon = menu.icon;
              return (
                <Link key={menu.href} href={menu.href} className="group block h-full">
                  <Card
                    className={`h-full overflow-hidden border-2 ${menu.borderColor} ${menu.bgLight} transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:border-opacity-80`}
                  >
                    <CardHeader className="pb-2">
                      <div
                        className={`inline-flex p-3 rounded-xl ${menu.iconBg} ${menu.iconColor} mb-2 w-fit transition-transform group-hover:scale-110`}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                      <CardTitle className="text-lg text-slate-800 group-hover:text-slate-900">
                        {menu.name}
                      </CardTitle>
                      <CardDescription className="text-slate-600 leading-relaxed">
                        {menu.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <span
                        className={`inline-flex items-center text-sm font-medium bg-gradient-to-r ${menu.color} bg-clip-text text-transparent`}
                      >
                        ไปที่เมนู →
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
