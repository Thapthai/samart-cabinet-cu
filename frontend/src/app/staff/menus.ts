import type { ComponentType } from 'react';
import {
    LayoutDashboard,
    Box,
    Package,
    History,
    FileBarChart,
    Settings,
    Users,
    Shield,
    Network,
    RotateCcw,
    ClipboardList,
} from 'lucide-react';

export interface StaffMenuSubItem {
    name: string;
    href: string;
    description?: string;
    icon?: ComponentType<{ className?: string }>;
    roles?: string[];
}

export interface StaffMenuItem {
    name: string;
    href: string;
    icon?: ComponentType<{ className?: string }>;
    description?: string;
    submenu?: StaffMenuSubItem[];
    roles?: string[];
    noHref?: boolean;
}

export function filterMenuByPermissions(
    menuItems: StaffMenuItem[],
    permissions: Record<string, boolean>,
): StaffMenuItem[] {
    return menuItems
        .filter((item) => permissions[item.href] !== false)
        .map((item) => {
            if (item.submenu) {
                const filteredSubmenu = item.submenu.filter((sub) => permissions[sub.href] !== false);
                return { ...item, submenu: filteredSubmenu };
            }
            return item;
        })
        .filter((item) => !item.submenu || item.submenu.length > 0);
}

/** โครงสร้างเมนูสอดคล้องกับ admin/menus.ts (path เป็น /staff) */
export const staffMenuItems: StaffMenuItem[] = [
    {
        name: 'Dashboard',
        href: '/staff/dashboard',
        icon: LayoutDashboard,
        description: 'ภาพรวมระบบ',
    },
    {
        name: 'อุปกรณ์',
        href: '/staff/items',
        icon: Box,
        description: 'จัดการอุปกรณ์และสต๊อก',
        noHref: true,
        submenu: [

            {
                name: 'สต็อกอุปกรณ์ในตู้ ',
                href: '/staff/items-stock',
                description: 'เมนูสต๊อกอุปกรณ์ที่มีในตู้',
                icon: Package,
            },
            {
                name: 'เบิกอุปกรณ์จากตู้',
                href: '/staff/weighing-dispense',
                description: 'การเบิกอุปกรณ์จากตู้ Weighing',
                icon: FileBarChart,
            },
            {
                name: 'เติมอุปกรณ์เข้าตู้',
                href: '/staff/weighing-refill',
                description: 'การเติมอุปกรณ์เข้าตู้ Weighing',
                icon: FileBarChart,
            },
        ],
    },
    {
        name: 'การจัดการ',
        href: '/staff/management',
        icon: Settings,
        description: 'จัดการระบบ',
        noHref: true,
        submenu: [
            {
                name: 'จัดการประเภทตู้',
                href: '/staff/management/cabinet_type',
                icon: Package,
                description: 'กำหนดพฤติกรรมประเภทตู้ (Weighing / RFID ฯลฯ)',
            },
            {
                name: 'จัดการตู้',
                href: '/staff/management/cabinets',
                icon: Package,
                description: 'จัดการตู้ Cabinet',
            },
            {
                name: 'จัดการตู้ - แผนก',
                href: '/staff/management/cabinets-departments',
                icon: Network,
                description: 'จัดการตู้ Cabinet และเชื่อมโยงกับแผนก',
            },
            {
                name: 'จัดการผู้ใช้ระบบ',
                href: '/staff/management/admin-users',
                icon: Users,
                description: 'จัดการผู้ใช้ระบบ',
            },
            {
                name: 'Role กับแผนก',
                href: '/staff/management/staff-role-permission-department',
                icon: Shield,
                description: 'กำหนด Staff Role เข้าถึงแผนก (Division)',
                roles: ['it1'],
            },
        ],
    },
    // {
    //     name: 'ประวัติการใช้งาน',
    //     href: '/staff/logs-history',
    //     icon: ClipboardList,
    //     description: 'ประวัติการใช้งานระบบ',
    // },
];
