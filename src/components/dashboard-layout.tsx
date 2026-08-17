"use client";

import {
  Banknote,
  BarChart3,
  Building2,
  ClipboardList,
  Factory,
  Fuel,
  HardHat,
  LogOut,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Timer,
  Truck,
  Users,
  Wallet,
  Wrench,
  IndianRupee,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { pageBg } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearSession } from "@/store/auth-slice";

type NavChild = { href: string; label: string; icon?: LucideIcon; match?: (path: string) => boolean };
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (path: string) => boolean;
  children?: NavChild[];
};
type NavGroup = { title: string; items: NavItem[] };

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Sites",
  "/materials": "Materials",
  "/vendors": "Vendors",
  "/expenses": "Expenses",
  "/machinery": "Machinery",
  "/machinery/fuel-logs": "Fuel Logs",
  "/machinery/usage": "Usage",
  "/machinery/maintenance": "Maintenance",
  "/attendance": "Attendance",
  "/attendance/bulk": "Bulk Attendance",
  "/attendance/history": "Attendance Records",
  "/payroll": "Payroll",
  "/payroll/wages": "Update Wages",
  "/payroll/advances": "Record Advance",
  "/reports": "Reports",
  "/workers": "Employee",
  "/labour": "My Employee App",
};

function pageTitle(pathname: string) {
  if (pathname.startsWith("/projects/")) return "Site Detail";
  if (pathname === "/attendance/bulk") return "Bulk Attendance";
  if (pathname === "/attendance/history") return "Attendance Records";
  if (pathname.startsWith("/attendance/")) return "Attendance Detail";
  if (pathname === "/payroll/sheets/browse") return "All Salary Sheets";
  if (pathname === "/payroll/site-sheets/browse") return "Site Salary Sheets";
  if (pathname.startsWith("/payroll/sheets/")) return "Salary Sheet";
  if (pathname.startsWith("/payroll/site-sheets/")) return "Site Salary Sheet";
  if (pathname.startsWith("/workers/") && pathname.endsWith("/history")) return "Attendance History";
  if (pathname.startsWith("/workers/")) return "Employee Profile";
  if (pathname === "/machinery/fuel-logs/history") return "Fuel Log History";
  if (pathname === "/machinery/fuel-logs") return "Fuel Logs";
  if (pathname === "/machinery/usage/history") return "Usage Detail History";
  if (pathname === "/machinery/usage") return "Usage";
  if (pathname === "/machinery/maintenance/history") return "Maintenance History";
  if (pathname === "/machinery/maintenance") return "Maintenance";
  if (pathname.startsWith("/machinery/") && pathname.endsWith("/fuel-logs")) return "Fuel Logs";
  if (pathname.startsWith("/machinery/") && pathname.endsWith("/usage")) return "Usage History";
  if (pathname.startsWith("/machinery/") && pathname.endsWith("/maintenance")) return "Maintenance History";
  if (pathname.startsWith("/machinery/") && pathname !== "/machinery") return "Machinery Detail";
  if (pathname.startsWith("/supervisors/")) return "Supervisor Profile";
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [href, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === href || pathname.startsWith(`${href}/`)) return title;
  }
  return "Dashboard";
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }
    if (user.role === "LABOUR" && !pathname.startsWith("/labour")) {
      router.replace("/labour");
    }
  }, [hydrated, accessToken, user, pathname, router]);

  if (!hydrated || !user || !accessToken) {
    return null;
  }

  const canManage = user.role === "SUPER_ADMIN" || user.role === "SUPERVISOR";
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  const groups: NavGroup[] = [
    {
      title: "Overview",
      items: [{ href: "/dashboard", label: "Dashboard", icon: BarChart3 }],
    },
    ...(canManage
      ? [
          {
            title: "Manage",
            items: [
              { href: "/projects", label: "Sites", icon: Building2, match: (p: string) => p.startsWith("/projects") },
              { href: "/workers", label: "Employee", icon: Users, match: (p: string) => p.startsWith("/workers") },
              { href: "/attendance", label: "Attendance", icon: Timer, match: (p: string) => p.startsWith("/attendance") },
              {
                href: "/payroll",
                label: "Payroll",
                icon: Banknote,
                match: (p: string) => p === "/payroll" || p.startsWith("/payroll/sheets") || p.startsWith("/payroll/site-sheets"),
                children: isSuperAdmin
                  ? [
                      { href: "/payroll/wages", label: "Update Wages", icon: IndianRupee, match: (p: string) => p.startsWith("/payroll/wages") },
                      { href: "/payroll/advances", label: "Record Advance", icon: Wallet, match: (p: string) => p.startsWith("/payroll/advances") },
                    ]
                  : undefined,
              },
            ],
          },
          {
            title: "Operations",
            items: [
              { href: "/materials", label: "Materials", icon: Package },
              { href: "/vendors", label: "Vendors", icon: Factory },
              { href: "/expenses", label: "Expenses", icon: ReceiptText },
              {
                href: "/machinery",
                label: "Machinery",
                icon: Truck,
                match: (p: string) =>
                  p === "/machinery" ||
                  (p.startsWith("/machinery/") &&
                    p !== "/machinery/fuel-logs" &&
                    p !== "/machinery/usage" &&
                    p !== "/machinery/maintenance"),
                children: [
                  { href: "/machinery", label: "Machines", icon: Truck, match: (p: string) => p === "/machinery" },
                  { href: "/machinery/fuel-logs", label: "Fuel Logs", icon: Fuel, match: (p: string) => p === "/machinery/fuel-logs" || p.startsWith("/machinery/fuel-logs/") },
                  { href: "/machinery/usage", label: "Usage", icon: Timer, match: (p: string) => p === "/machinery/usage" || p.startsWith("/machinery/usage/") },
                  { href: "/machinery/maintenance", label: "Maintenance", icon: Wrench, match: (p: string) => p === "/machinery/maintenance" || p.startsWith("/machinery/maintenance/") },
                ],
              },
              { href: "/reports", label: "Reports", icon: ClipboardList },
            ],
          },
        ]
      : []),
    ...(user.role === "LABOUR"
      ? [{ title: "Self", items: [{ href: "/labour", label: "My Employee App", icon: HardHat }] }]
      : []),
  ];

  function isActive(item: NavItem | NavChild) {
    if (item.match) return item.match(pathname);
    return pathname === item.href;
  }

  function handleSignOut() {
    dispatch(clearSession());
    router.replace("/login");
  }

  const title = pageTitle(pathname);

  function isMenuOpen(item: NavItem, childActive: boolean) {
    if (!item.children?.length) return false;
    if (openMenus[item.href] != null) return openMenus[item.href];
    return childActive;
  }

  function toggleMenu(href: string, currentlyOpen: boolean) {
    setOpenMenus((prev) => ({
      ...prev,
      [href]: !currentlyOpen,
    }));
  }

  return (
    <main className={`min-h-screen ${pageBg}`}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-[#fafaf9]">
          <div className="border-b border-gray-200 px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-violet-600 p-2 text-white">
                <HardHat className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">Hitesh Construction</p>
                <p className="truncate text-[11px] text-gray-500">Site Management</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {groups.map((group) => (
              <div key={group.title} className="mb-4">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    const childActive = Boolean(item.children?.some((child) => isActive(child)));
                    const menuOpen = isMenuOpen(item, childActive);
                    return (
                      <div key={item.href}>
                        <div
                          className={`relative flex items-center rounded-lg transition ${
                            active || childActive
                              ? "bg-violet-100/80 font-medium text-violet-800"
                              : "text-gray-600 hover:bg-white hover:text-gray-900"
                          }`}
                        >
                          {(active || childActive) && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet-600" />
                          )}
                          <Link
                            href={item.href}
                            className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-sm"
                            onClick={() => {
                              if (item.children?.length && openMenus[item.href] == null && !childActive) {
                                setOpenMenus((prev) => ({ ...prev, [item.href]: true }));
                              }
                            }}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                          {item.children?.length ? (
                            <button
                              type="button"
                              aria-label={menuOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                              className="mr-1.5 rounded-md p-1 text-gray-500 hover:bg-white/80 hover:text-gray-800"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleMenu(item.href, menuOpen);
                              }}
                            >
                              {menuOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            </button>
                          ) : null}
                        </div>
                        {item.children?.length && menuOpen ? (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2">
                            {item.children.map((child) => {
                              const childIsActive = isActive(child);
                              const ChildIcon = child.icon;
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                                    childIsActive
                                      ? "bg-violet-50 font-medium text-violet-800"
                                      : "text-gray-500 hover:bg-white hover:text-gray-800"
                                  }`}
                                >
                                  {ChildIcon ? <ChildIcon className="h-3.5 w-3.5 shrink-0" /> : null}
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-gray-200 p-3">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-600 hover:bg-white"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 px-6 py-3 backdrop-blur">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-500">
              {user.full_name || user.username} · {(user.role === "LABOUR" ? "EMPLOYEE" : user.role).replace("_", " ")}
            </p>
          </header>
          <section className="flex-1 px-6 py-5">{children}</section>
        </div>
      </div>
    </main>
  );
}
