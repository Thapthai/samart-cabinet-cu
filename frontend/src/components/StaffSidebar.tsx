'use client';

import { useEffect, useState } from 'react';
import { staffRolePermissionApi } from '@/lib/api';
import { staffMenuItems, filterMenuByPermissions } from '@/app/staff/menus';
import PortalSidebar from '@/components/PortalSidebar';
import { ASSETS } from '@/lib/assets';

interface StaffSidebarProps {
  staffUser?: {
    fname?: string;
    lname?: string;
    name?: string;
    email: string;
    role_id?: number | null;
    role?: string | number | { code?: string; name?: string };
    role_code?: string | null;
  };
  onLogout?: () => void;
  isAdmin?: boolean;
}

export default function StaffSidebar({ staffUser, onLogout, isAdmin = false }: StaffSidebarProps) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAdmin) {
      const allPermissions: Record<string, boolean> = {};
      staffMenuItems.forEach((item) => {
        allPermissions[item.href] = true;
        item.submenu?.forEach((sub) => {
          allPermissions[sub.href] = true;
        });
      });
      setPermissions(allPermissions);
      return;
    }

    if (!staffUser) return;

    const roleCode =
      staffUser.role_code ??
      (typeof staffUser.role === 'string' ? staffUser.role : undefined);
    if (!roleCode && staffUser.role_id == null) return;

    const loadPermissions = async () => {
      try {
        if (!roleCode) return;

        const response = await staffRolePermissionApi.getByRole(roleCode);
        if (response.success && response.data) {
          const permissionsMap: Record<string, boolean> = {};
          (response.data as Array<{ menu_href: string; can_access: boolean }>).forEach((perm) => {
            permissionsMap[perm.menu_href] = perm.can_access;
          });
          setPermissions(permissionsMap);
        }
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    };

    loadPermissions();
  }, [staffUser?.role, staffUser?.role_id, staffUser?.role_code, isAdmin]);

  const menuItems = filterMenuByPermissions(staffMenuItems, permissions);

  return (
    <PortalSidebar
      menuItems={menuItems}
      portalTitle="Staff Portal"
      portalSubtitle="Smart Cabinet"
      dashboardHref="/staff/dashboard"
      staffUser={staffUser}
      logoSrc={ASSETS.LOGO}
      onLogout={onLogout}
      isAdmin={isAdmin}
      showAdminPortalLink={isAdmin}
      adminPortalHref="/admin/dashboard"
    />
  );
}
