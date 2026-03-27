import type { ComponentType } from 'react';
import {
    LayoutDashboard,
    Box,
    Package,
    FileBarChart,
    Settings,
    Network,
} from 'lucide-react';

export interface AdminMenuSubItem {
    name: string;
    href: string;
    description?: string;
    icon?: ComponentType<{ className?: string }>;
}

export interface AdminMenuItem {
    name: string;
    href: string;
    icon?: ComponentType<{ className?: string }>;
    description?: string;
    submenu?: AdminMenuSubItem[];
    roles?: string[];
    noHref?: boolean;
}

export function filterAdminMenuByPermissions(
    menuItems: AdminMenuItem[],
    permissions: Record<string, boolean>
): AdminMenuItem[] {
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

export const adminMenuItems: AdminMenuItem[] = [
    {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
        description: 'ภาพรวมระบบ',
    },
    {
        name: 'อุปกรณ์',
        href: '/admin/items',
        icon: Box,
        description: 'จัดการอุปกรณ์และสต๊อก',
        noHref: true,
        submenu: [
            {
                name: 'จัดการตู้ Weighing',
                href: '/admin/weighing-departments',
                icon: Network,
                description: 'จัดการตู้ Cabinet และเชื่อมโยงกับแผนก',
            },
            {
                name: 'สต็อกอุปกรณ์ในตู้ ',
                href: '/admin/weighing-stock',
                description: 'เมนูสต๊อกอุปกรณ์ที่มีในตู้ Weighing',
                icon: Package,
            },
            {
                name: 'เบิกอุปกรณ์จากตู้',
                href: '/admin/weighing-dispense',
                description: 'การเบิกอุปกรณ์จากตู้ Weighing',
                icon: FileBarChart,
            },
            {
                name: 'เติมอุปกรณ์เข้าตู้',
                href: '/admin/weighing-refill',
                description: 'การเติมอุปกรณ์เข้าตู้ Weighing',
                icon: FileBarChart,
            },
        ],
    },
    {
        name: 'การจัดการ',
        href: '/admin/management',
        icon: Settings,
        description: 'จัดการระบบ',
        noHref: true,
        submenu: [
            {
                name: 'จัดการตู้ Cabinet',
                href: '/admin/management/cabinets',
                icon: Package,
                description: 'จัดการตู้ Cabinet',
            },
        ],
    },
];
