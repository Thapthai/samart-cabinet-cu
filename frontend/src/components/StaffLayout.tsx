'use client';

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import StaffSidebar from './StaffSidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, ChevronDown, ZoomIn, ZoomOut } from 'lucide-react';
import { isAdminUser } from '@/lib/auth/roles';

interface StaffLayoutProps {
  children: ReactNode;
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: adminUser, isAuthenticated: isAdminAuth, loading: adminLoading } = useAuth();
  const [staffUser, setStaffUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const hasUserInteracted = useRef(false);

  // Load zoom level from localStorage on mount (per user)
  useEffect(() => {
    if (!staffUser) {
      // No user yet, initialize to 100%
      document.documentElement.style.setProperty('--staff-zoom', '1');
      setZoomLevel(100);
      return;
    }
    
    const userKey = staffUser.id 
      ? `staff_zoom_level_${staffUser.id}` 
      : staffUser.email 
        ? `staff_zoom_level_${staffUser.email}`
        : staffUser.client_id
          ? `staff_zoom_level_${staffUser.client_id}`
          : null;
    
    if (!userKey) {
      document.documentElement.style.setProperty('--staff-zoom', '1');
      setZoomLevel(100);
      return;
    }
    
    const savedZoom = localStorage.getItem(userKey);
    
    if (savedZoom) {
      const zoom = parseInt(savedZoom, 10);
      setZoomLevel(zoom);
      document.documentElement.style.setProperty('--staff-zoom', `${zoom / 100}`);
    } else {
      // No saved value, initialize to 100%
      document.documentElement.style.setProperty('--staff-zoom', '1');
      setZoomLevel(100);
    }
  }, [staffUser]);

  // Apply zoom when zoomLevel changes
  useEffect(() => {
    // Always update CSS variable for zoom to work
    document.documentElement.style.setProperty('--staff-zoom', `${zoomLevel / 100}`);
    
    // Only save to localStorage if user has interacted and staffUser exists
    if (!hasUserInteracted.current || !staffUser) {
      return;
    }
    
    const userKey = staffUser.id 
      ? `staff_zoom_level_${staffUser.id}` 
      : staffUser.email 
        ? `staff_zoom_level_${staffUser.email}`
        : staffUser.client_id
          ? `staff_zoom_level_${staffUser.client_id}`
          : null;
    
    if (userKey) {
      localStorage.setItem(userKey, zoomLevel.toString());
    }
  }, [zoomLevel, staffUser]);

  const handleZoomIn = () => {
    hasUserInteracted.current = true;
    const newZoom = Math.min(zoomLevel + 10, 200); // Max 200%
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    hasUserInteracted.current = true;
    const newZoom = Math.max(zoomLevel - 10, 50); // Min 50%
    setZoomLevel(newZoom);
  };

  const handleResetZoom = () => {
    hasUserInteracted.current = true;
    setZoomLevel(100);
  };

  // Get page title from pathname
  const getPageTitle = () => {
    // Next.js automatically strips basePath from pathname, so we can use it directly
    const pathMap: Record<string, string> = {
      '/staff/dashboard': 'Dashboard',
      '/staff/equipment': 'จัดการอุปกรณ์',
      '/staff/equipment/stock': 'สต๊อกอุปกรณ์',
      '/staff/equipment/dispense': 'เบิกอุปกรณ์',
      '/staff/equipment/return': 'คืนอุปกรณ์',
      '/staff/usage': 'บันทึกการใช้งาน',
      '/staff/reports': 'รายงาน',
      '/staff/reports/dispense': 'รายงานเบิกอุปกรณ์',
      '/staff/reports/return': 'รายงานคืนอุปกรณ์',
      '/staff/reports/usage': 'รายงานการใช้งาน',
      '/staff/comparison': 'เปรียบเทียบข้อมูล',
      '/staff/settings': 'ตั้งค่า',
      '/staff/permissions/users': 'จัดการสิทธิ์',
      '/staff/permissions/roles': 'กำหนดสิทธิ์',
    };
    return pathMap[pathname] || 'Staff Portal';
  };

  useEffect(() => {
    // Wait for admin auth check to complete
    if (adminLoading) {
      setLoading(true);
      return;
    }

    // Check if admin is logged in (next-auth session)
    if (isAdminAuth && adminUser && isAdminUser(adminUser)) {
      setIsAdmin(true);
      setStaffUser(adminUser);
      setLoading(false);
      return;
    }

    if (isAdminAuth && adminUser && !isAdminUser(adminUser)) {
      setIsAdmin(false);
      setStaffUser(adminUser);
      setLoading(false);
      return;
    }

    // Check if staff is logged in (localStorage)
    const token = localStorage.getItem('staff_token');
    const user = localStorage.getItem('staff_user');

    if (!token || !user) {
      // Next.js automatically handles basePath, so we don't need to include it
      router.push('/auth/login');
      return;
    }

    try {
      setIsAdmin(false);
      setStaffUser(JSON.parse(user));
    } catch (error) {
      console.error('Error parsing staff user:', error);
      // Next.js automatically handles basePath, so we don't need to include it
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  }, [router, isAdminAuth, adminUser, adminLoading]);

  const handleLogout = () => {
    if (isAdmin) {
      // Admin logout - redirect to admin login
      router.push('/auth/logout');
    } else {
      // Staff logout
      localStorage.removeItem('staff_token');
      localStorage.removeItem('staff_user');
      router.push('/auth/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50/50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!staffUser) {
    return null;
  }

  return (
    <div className="flex h-screen bg-rose-50/30 overflow-hidden">
      <StaffSidebar staffUser={staffUser} onLogout={handleLogout} isAdmin={isAdmin} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="h-14 flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center flex-1 min-w-0">
              <div className="lg:hidden w-14 flex-shrink-0"></div>
              <h1 className="text-lg font-semibold text-gray-900">
                {getPageTitle()}
              </h1>
            </div>
            
            {/* Zoom Control */}
            <div className="flex items-center gap-1 border rounded-md p-1 bg-white mr-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs min-w-[50px]"
                onClick={handleResetZoom}
                title={`Reset Zoom: ${zoomLevel}%`}
              >
                {zoomLevel}%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* User Menu */}
            {staffUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 h-9 px-2 sm:px-3 hover:bg-pink-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs shadow-md ring-2 ring-white flex-shrink-0">
                      {isAdmin 
                        ? (staffUser.name?.charAt(0) || staffUser.email?.charAt(0) || 'A').toUpperCase()
                        : staffUser.fname?.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {isAdmin 
                          ? staffUser.name || staffUser.email
                          : `${staffUser.fname} ${staffUser.lname}`
                        }
                        {isAdmin && <span className="ml-2 text-xs text-blue-600 font-bold">(Admin)</span>}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]">
                        {staffUser.email}
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {isAdmin 
                          ? staffUser.name || staffUser.email
                          : `${staffUser.fname} ${staffUser.lname}`
                        }
                        {isAdmin && <span className="ml-2 text-xs text-blue-600 font-bold">(Admin)</span>}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {staffUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <button
                      onClick={() => {
                        // Next.js automatically handles basePath, so we don't need to include it
                        router.push('/staff/settings');
                      }}
                      className="w-full flex items-center cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>ตั้งค่าบัญชี</span>
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    variant="destructive"
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        
        {/* Main Content Area - เต็มความกว้างเหมือน admin */}
        <main className="flex-1 overflow-y-auto bg-rose-50/30" style={{ zoom: zoomLevel / 100 }}>
          <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
