"use client";

import {
  Banknote,
  BarChart3,
  Building2,
  ClipboardList,
  Factory,
  HardHat,
  LogOut,
  Package,
  ReceiptText,
  Timer,
  Truck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { pageBg } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearSession } from "@/store/auth-slice";

type NavItem = { href: string; label: string; icon: LucideIcon; match?: (path: string) => boolean };
type NavGroup = { title: string; items: NavItem[] };

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/materials": "Materials",
  "/vendors": "Vendors",
  "/expenses": "Expenses",
  "/machinery": "Machinery",
  "/attendance": "Attendance",
  "/payroll": "Payroll",
  "/reports": "Reports",
  "/workers": "Labour",
  "/people": "People",
  "/labour": "My Labour App",
  "/supervisor/attendance": "My Attendance",
};

function pageTitle(pathname: string) {
  if (pathname.startsWith("/projects/")) return "Project Detail";
  if (pathname === "/attendance/history") return "Attendance Records";
  if (pathname.startsWith("/attendance/")) return "Attendance Detail";
  if (pathname.startsWith("/workers/") && pathname.endsWith("/history")) return "Attendance History";
  if (pathname.startsWith("/workers/") && pathname !== "/workers/bulk-attendance") return "Labour Profile";
  if (pathname.startsWith("/machinery/") && pathname !== "/machinery") return "Machinery Detail";
  if (pathname.startsWith("/supervisors/")) return "Supervisor Profile";
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
              { href: "/projects", label: "Projects", icon: Building2, match: (p: string) => p.startsWith("/projects") },
              { href: "/workers", label: "Labour", icon: Users, match: (p: string) => p.startsWith("/workers") },
              { href: "/attendance", label: "Attendance", icon: Timer, match: (p: string) => p.startsWith("/attendance") },
              { href: "/payroll", label: "Payroll", icon: Banknote },
            ],
          },
          {
            title: "Operations",
            items: [
              { href: "/materials", label: "Materials", icon: Package },
              { href: "/vendors", label: "Vendors", icon: Factory },
              { href: "/expenses", label: "Expenses", icon: ReceiptText },
              { href: "/machinery", label: "Machinery", icon: Truck },
              { href: "/reports", label: "Reports", icon: ClipboardList },
            ],
          },
        ]
      : []),
    ...(user.role === "SUPER_ADMIN"
      ? [{ title: "Admin", items: [{ href: "/people", label: "People", icon: Users }] }]
      : []),
    ...(user.role === "SUPERVISOR"
      ? [{ title: "Self", items: [{ href: "/supervisor/attendance", label: "My Attendance", icon: Timer }] }]
      : []),
    ...(user.role === "LABOUR"
      ? [{ title: "Self", items: [{ href: "/labour", label: "My Labour App", icon: HardHat }] }]
      : []),
  ];

  function isActive(item: NavItem) {
    if (item.match) return item.match(pathname);
    return pathname === item.href;
  }

  function handleSignOut() {
    dispatch(clearSession());
    router.replace("/login");
  }

  const title = pageTitle(pathname);

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
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                          active
                            ? "bg-violet-100/80 font-medium text-violet-800"
                            : "text-gray-600 hover:bg-white hover:text-gray-900"
                        }`}
                      >
                        {active && <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet-600" />}
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
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
              {user.full_name || user.username} · {user.role.replace("_", " ")}
            </p>
          </header>
          <section className="flex-1 px-6 py-5">{children}</section>
        </div>
      </div>
    </main>
  );
}
