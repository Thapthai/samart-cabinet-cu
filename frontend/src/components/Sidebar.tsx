'use client';

import { ASSETS } from '@/lib/assets';
import { adminMenuItems } from '@/app/admin/menus';
import PortalSidebar from '@/components/PortalSidebar';

export default function Sidebar() {
  return (
    <PortalSidebar
      menuItems={adminMenuItems}
      portalTitle="Admin Portal"
      portalSubtitle="Smart Cabinet"
      dashboardHref="/admin/dashboard"
      logoSrc={ASSETS.LOGO}
      showStaffPortalLink
      staffPortalHref="/staff/dashboard"
    />
  );
}
