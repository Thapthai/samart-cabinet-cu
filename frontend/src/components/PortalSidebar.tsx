'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Menu, X, LogOut, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PortalMenuSubItem {
  name: string;
  href: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  roles?: string[];
}

export interface PortalMenuItem {
  name: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  description?: string;
  submenu?: PortalMenuSubItem[];
  roles?: string[];
  noHref?: boolean;
}

interface PortalSidebarProps {
  menuItems: PortalMenuItem[];
  portalTitle: string;
  portalSubtitle?: string;
  dashboardHref: string;
  logoSrc?: string;
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
  showStaffPortalLink?: boolean;
  staffPortalHref?: string;
  showAdminPortalLink?: boolean;
  adminPortalHref?: string;
}

function isPathActive(path: string, href: string) {
  return path === href || path.startsWith(href + '/');
}

function filterByRole(
  items: PortalMenuItem[],
  roleCode: string | undefined,
  isAdmin: boolean,
): PortalMenuItem[] {
  if (isAdmin || !roleCode) return items;
  return items
    .map((item) => {
      if (item.roles && !item.roles.includes(roleCode)) return null;
      if (item.submenu) {
        const submenu = item.submenu.filter(
          (sub) => !sub.roles || sub.roles.includes(roleCode),
        );
        if (submenu.length === 0 && item.noHref) return null;
        return { ...item, submenu };
      }
      return item;
    })
    .filter((item): item is PortalMenuItem => item != null);
}

export default function PortalSidebar({
  menuItems,
  portalTitle,
  portalSubtitle,
  dashboardHref,
  logoSrc,
  onLogout,
  staffUser,
  isAdmin = false,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const roleCode =
    staffUser?.role_code ??
    (typeof staffUser?.role === 'string' ? staffUser.role : (staffUser?.role as { code?: string } | undefined)?.code);

  const visibleMenu = filterByRole(menuItems, roleCode, isAdmin);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-[60]">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-lg hover:bg-pink-50 border-pink-200 h-9 w-9"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-gradient-to-b from-pink-100 via-pink-50 to-rose-100 text-gray-800 shadow-2xl border-r border-pink-200/60 transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center p-4 border-b border-pink-200/80">
            <Link
              href={dashboardHref}
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center space-x-3 flex-1 min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg flex-shrink-0 overflow-hidden p-1">
                {logoSrc ? (
                  <img src={logoSrc} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <LayoutDashboard className="h-6 w-6 text-pink-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate text-gray-800">{portalTitle}</h2>
                {portalSubtitle && (
                  <p className="text-xs text-gray-500 truncate">{portalSubtitle}</p>
                )}
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto scrollbar-thin">
            {visibleMenu.map((item) => {
              const Icon = item.icon;
              if (!Icon) return null;

              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isActive =
                isPathActive(pathname, item.href) ||
                (hasSubmenu && item.submenu!.some((s) => isPathActive(pathname, s.href)));

              return (
                <div key={item.href}>
                  <div
                    className={cn(
                      'relative flex items-center w-full rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg shadow-pink-500/30'
                        : 'text-gray-700',
                    )}
                  >
                    {item.noHref && hasSubmenu ? (
                      <div
                        className={cn(
                          'flex flex-1 min-w-0 items-center px-3 py-3 text-sm font-medium rounded-xl',
                          isActive && 'text-white',
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-pink-500 rounded-r-full" />
                        )}
                        <Icon className="h-5 w-5 flex-shrink-0 mr-3" />
                        <span className="flex-1 truncate text-left">{item.name}</span>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          'flex flex-1 min-w-0 items-center px-3 py-3 text-sm font-medium rounded-xl text-inherit',
                          isActive && 'text-white',
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-pink-500 rounded-r-full" />
                        )}
                        <Icon className="h-5 w-5 flex-shrink-0 mr-3" />
                        <span className="flex-1 truncate text-left">{item.name}</span>
                      </Link>
                    )}
                  </div>

                  {hasSubmenu && (
                    <div className="ml-4 mt-2 space-y-1 border-l-2 border-pink-300/70 pl-4">
                      {item.submenu!.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = isPathActive(pathname, subItem.href);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200',
                              isSubActive
                                ? 'bg-pink-200/70 text-gray-900 border-l-2 border-pink-500 font-medium'
                                : 'text-gray-600 hover:bg-pink-200/50 hover:text-gray-900',
                            )}
                          >
                            {SubIcon ? (
                              <SubIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 mr-2" />
                            )}
                            <span>{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-pink-200/80">
            {onLogout ? (
              <Button
                variant="ghost"
                onClick={() => {
                  onLogout();
                  setIsMobileOpen(false);
                }}
                className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-red-100/70"
              >
                <LogOut className="h-5 w-5 mr-3" />
                <span>ออกจากระบบ</span>
              </Button>
            ) : (
              <p className="text-[10px] text-center text-gray-500 font-medium">© 2026 POSE Intelligence</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
