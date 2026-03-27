"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ASSETS } from "@/lib/assets";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { adminMenuItems, type AdminMenuSubItem } from "@/app/admin/menus";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function isSubmenuActive(pathname: string, sub: AdminMenuSubItem): boolean {
  if (isPathActive(pathname, sub.href)) return true;
  const nested = (sub as AdminMenuSubItem & { submenu?: AdminMenuSubItem[] }).submenu;
  return (nested ?? []).some((s) => isSubmenuActive(pathname, s));
}

function SubNavLinks({
  pathname,
  items,
  depth = 0,
  onNavigate,
}: {
  pathname: string;
  items: AdminMenuSubItem[];
  depth?: number;
  onNavigate: () => void;
}) {
  return (
    <div
      className={cn(
        "mt-1 space-y-0.5 border-l-2 border-sky-200 pl-3",
        depth > 0 && "ml-2 mt-1 border-sky-200/90"
      )}
    >
      {items.map((sub) => {
        const SubIcon = sub.icon;
        const nested = (sub as AdminMenuSubItem & { submenu?: AdminMenuSubItem[] }).submenu;
        const hasNested = (nested?.length ?? 0) > 0;
        const subActive = isSubmenuActive(pathname, sub);

        if (hasNested && nested) {
          return (
            <div key={sub.href}>
              <Link
                href={sub.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                  subActive
                    ? "border border-sky-300 bg-sky-50/90 font-medium text-slate-800"
                    : "text-slate-600 hover:bg-sky-100/50 hover:text-slate-900"
                )}
              >
                {SubIcon ? (
                  <SubIcon className="mr-2 h-4 w-4 flex-shrink-0 text-slate-500" />
                ) : (
                  <span className="mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                )}
                <span className="truncate">{sub.name}</span>
              </Link>
              <SubNavLinks pathname={pathname} items={nested} depth={depth + 1} onNavigate={onNavigate} />
            </div>
          );
        }

        return (
          <Link
            key={sub.href}
            href={sub.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
              subActive
                ? "border border-sky-300 bg-sky-50/90 font-medium text-slate-800"
                : "text-slate-600 hover:bg-sky-100/50 hover:text-slate-900"
            )}
          >
            {SubIcon ? (
              <SubIcon className={cn("mr-2 h-4 w-4 flex-shrink-0", subActive ? "text-sky-600" : "text-slate-500")} />
            ) : (
              <span className="mr-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
            )}
            <span className="truncate">{sub.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      <div className="fixed left-4 top-4 z-[60] lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-sky-200 bg-white shadow-lg transition-colors hover:bg-sky-50"
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen overflow-x-hidden border-r border-sky-200/80 bg-gradient-to-b from-sky-50 via-slate-50 to-sky-50/90 text-slate-800 shadow-lg",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCollapsed ? "lg:w-16" : "w-64 lg:w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              "flex items-center justify-between border-b border-sky-200/90 transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] p-4",
              isCollapsed && "lg:p-2"
            )}
          >
            {!isCollapsed && (
              <Link href="/admin/dashboard" className="flex min-w-0 flex-1 items-center gap-3" onClick={closeMobile}>
                <div className="flex h-14 w-[4.5rem] flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm">
                  <img src={ASSETS.LOGO} alt="POSE Logo" className="h-auto max-h-full w-auto max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900">Admin Portal</div>
                  <div className="truncate text-xs text-slate-500">Smart Cabinet</div>
                </div>
              </Link>
            )}
            {isCollapsed && (
              <Link
                href="/admin/dashboard"
                className="mx-auto flex h-14 w-full max-w-[3.5rem] items-center justify-center overflow-hidden rounded-md bg-white p-1 shadow-sm lg:mx-auto"
                onClick={closeMobile}
              >
                <img src={ASSETS.LOGO} alt="POSE" className="h-auto max-h-full w-auto max-w-full object-contain" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => (isMobileOpen ? setIsMobileOpen(false) : setIsCollapsed(!isCollapsed))}
              className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-sky-100/80 hover:text-slate-800 lg:flex"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronLeft className="h-4 w-4 transition-transform duration-200" />
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const sectionActive = !!(hasSubmenu && item.submenu!.some((s) => isSubmenuActive(pathname, s)));
              const linkActive = !hasSubmenu && isPathActive(pathname, item.href);

              if (hasSubmenu && item.noHref) {
                return (
                  <div key={item.href} className="space-y-0">
                    <div
                      className={cn(
                        "flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        sectionActive
                          ? "bg-sky-500 text-white shadow-sm"
                          : "text-slate-800",
                        isCollapsed && "lg:justify-center lg:px-2"
                      )}
                    >
                      {Icon ? (
                        <Icon
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            sectionActive ? "text-white" : "text-slate-600",
                            !isCollapsed ? "mr-3" : "lg:mr-0",
                            isCollapsed && "lg:mx-auto"
                          )}
                        />
                      ) : null}
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate transition-opacity duration-200",
                          isCollapsed && "lg:hidden lg:w-0 lg:min-w-0 lg:overflow-hidden lg:opacity-0"
                        )}
                      >
                        {item.name}
                      </span>
                    </div>
                    {!isCollapsed && (
                      <SubNavLinks pathname={pathname} items={item.submenu!} onNavigate={closeMobile} />
                    )}
                  </div>
                );
              }

              if (!Icon) return null;

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeMobile}
                    className={cn(
                      "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      linkActive
                        ? "bg-sky-500 text-white shadow-sm"
                        : "text-slate-700 hover:bg-sky-100/70 hover:text-slate-900",
                      isCollapsed && "lg:justify-center lg:px-2"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        linkActive ? "text-white" : "text-slate-600",
                        !isCollapsed ? "mr-3" : "lg:mr-0",
                        isCollapsed && "lg:mx-auto"
                      )}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate transition-opacity duration-200",
                        isCollapsed && "lg:hidden lg:w-0 lg:min-w-0 lg:overflow-hidden lg:opacity-0"
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                  {hasSubmenu && !isCollapsed && (
                    <SubNavLinks pathname={pathname} items={item.submenu!} onNavigate={closeMobile} />
                  )}
                </div>
              );
            })}
          </nav>

          <div
            className={cn(
              "border-t border-sky-200/90 p-4 transition-all duration-300",
              isCollapsed && "lg:px-2"
            )}
          >
            <div className={cn("flex items-center gap-2 overflow-hidden text-slate-500", isCollapsed && "lg:justify-center")}>
              <img src={ASSETS.LOGO} alt="POSE" width={20} height={20} className="flex-shrink-0 object-contain opacity-90" />
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium transition-opacity duration-200",
                  isCollapsed && "lg:hidden lg:w-0 lg:min-w-0 lg:overflow-hidden lg:opacity-0"
                )}
              >
                © 2026 POSE Intelligence
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
