"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { api } from "@/lib/api";
import { useTablePage } from "@/lib/pagination";
import type {
  AuthUser,
  PayrollDayHeader,
  PayrollSiteSheetDetail,
  PayrollSiteSheetListItem,
  PayrollWeekDetail,
  PayrollWeekListItem,
} from "@/lib/types";
import {
  Field,
  TablePagination,
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
} from "@/components/ui";
import { useAppSelector } from "@/store/hooks";

type Paginated<T> = { results?: T[] };

function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

function formatGeneratedAt(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByGeneratedDesc<T extends { id: number; generated_at?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const ta = a.generated_at ? new Date(a.generated_at).getTime() : 0;
    const tb = b.generated_at ? new Date(b.generated_at).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return b.id - a.id;
  });
}

/** Most recent Tuesday on or before today (local). */
function mostRecentTuesdayISO(from = new Date()): string {
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // Sun=0 … Tue=2
  const diff = (day + 5) % 7; // days since Tuesday
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

function markCell(dayMarks: Record<string, string>, key: string) {
  const v = dayMarks?.[key];
  if (!v || v === "0") return "";
  return v;
}

function usePayrollEmployees() {
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const users = useQuery<Paginated<AuthUser>>({
    queryKey: ["users"],
    queryFn: api.users,
    retry: false,
    enabled: isSuperAdmin,
  });
  const wageUsers = (users.data?.results ?? []).filter(
    (item) => item.role === "LABOUR" || item.role === "SUPERVISOR",
  );
  const labourList = (users.data?.results ?? []).filter((item) => item.role === "LABOUR");
  return { wageUsers, labourList, isSuperAdmin };
}

function roleLabel(item: AuthUser) {
  if (item.role === "SUPERVISOR") return "Supervisor";
  return "Employee";
}

export function UpdateWagesPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("0");
  const [dailyWage, setDailyWage] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("0");
  const { wageUsers, isSuperAdmin } = usePayrollEmployees();

  const existingProfile = useQuery({
    queryKey: ["salary-profile", selectedId],
    queryFn: () => api.salaryProfiles(Number(selectedId)),
    enabled: Boolean(selectedId),
  });

  const wageFormKey = !selectedId
    ? "none"
    : existingProfile.isFetching
      ? `${selectedId}:loading`
      : `${selectedId}:ready:${existingProfile.dataUpdatedAt}`;
  const [seenWageFormKey, setSeenWageFormKey] = useState(wageFormKey);
  if (seenWageFormKey !== wageFormKey) {
    setSeenWageFormKey(wageFormKey);
    if (!selectedId) {
      setMonthlySalary("0");
      setDailyWage("");
      setOvertimeRate("0");
    } else if (!existingProfile.isFetching) {
      const profile = existingProfile.data?.results?.[0];
      setMonthlySalary(String(profile?.monthly_salary ?? "0"));
      setDailyWage(String(profile?.daily_wage ?? ""));
      setOvertimeRate(String(profile?.overtime_rate ?? "0"));
    } else {
      setMonthlySalary("0");
      setDailyWage("");
      setOvertimeRate("0");
    }
  }

  const salaryProfile = useMutation({
    mutationFn: (payload: Parameters<typeof api.createSalaryProfile>[0]) => api.createSalaryProfile(payload),
    onSuccess: () => {
      setMessage("Wages updated.");
      existingProfile.refetch();
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Could not update wages."),
  });

  if (!isSuperAdmin) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Only Super Admin can update wages.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-coal">Update Wages</h2>
        <p className="mt-1 text-sm text-gray-500">
          Set or change monthly salary, daily wage, and overtime rate for supervisors, labour, and drivers.
        </p>
        {message && <p className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
        <form
          className="mt-6 grid max-w-2xl gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedId) return;
            salaryProfile.mutate({
              labour: Number(selectedId),
              monthly_salary: monthlySalary || "0",
              daily_wage: dailyWage,
              overtime_rate: overtimeRate || "0",
            });
          }}
        >
          <Field label="Person">
            <select
              className={inputClass}
              name="labour"
              required
              value={selectedId}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setMessage("");
              }}
            >
              <option value="">Select person</option>
              {wageUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name || item.username} ({roleLabel(item)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Monthly salary">
            <input
              className={inputClass}
              name="monthly_salary"
              min="0"
              step="0.01"
              type="number"
              value={monthlySalary}
              onChange={(event) => setMonthlySalary(event.target.value)}
            />
          </Field>
          <Field label="Daily wage">
            <input
              className={inputClass}
              name="daily_wage"
              min="0"
              step="0.01"
              type="number"
              required
              value={dailyWage}
              onChange={(event) => setDailyWage(event.target.value)}
            />
          </Field>
          <Field label="Overtime rate">
            <input
              className={inputClass}
              name="overtime_rate"
              min="0"
              step="0.01"
              type="number"
              value={overtimeRate}
              onChange={(event) => setOvertimeRate(event.target.value)}
            />
          </Field>
          <button className={btnPrimaryClass} disabled={salaryProfile.isPending || !selectedId}>
            {salaryProfile.isPending ? "Saving..." : "Save wages"}
          </button>
        </form>
      </div>
    </section>
  );
}

export function RecordAdvancePage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo = today.toISOString().slice(0, 10);
  const [historyFrom, setHistoryFrom] = useState(defaultFrom);
  const [historyTo, setHistoryTo] = useState(defaultTo);
  const { wageUsers, isSuperAdmin } = usePayrollEmployees();

  const recentAdvances = useQuery({
    queryKey: ["advances", "recent"],
    queryFn: () => api.advances({ page_size: 8, ordering: "-date" }),
    enabled: isSuperAdmin,
  });

  const historyAdvances = useQuery({
    queryKey: ["advances", "history", historyFrom, historyTo],
    queryFn: () =>
      api.advances({
        date_from: historyFrom || undefined,
        date_to: historyTo || undefined,
        page_size: 200,
        ordering: "-date",
      }),
    enabled: isSuperAdmin,
  });

  const advance = useMutation({
    mutationFn: (payload: Parameters<typeof api.createAdvance>[0]) => api.createAdvance(payload),
    onSuccess: () => {
      setMessage("Advance payment recorded.");
      queryClient.invalidateQueries({ queryKey: ["advances"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Advance creation failed."),
  });

  const recentRows = recentAdvances.data?.results ?? [];
  const historyRows = historyAdvances.data?.results ?? [];
  const historyPage = useTablePage(historyRows, { pageSize: 10, resetKey: `${historyFrom}-${historyTo}` });
  const historyTotal = historyRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  async function downloadHistory() {
    setExporting(true);
    try {
      const fromPart = historyFrom || "all";
      const toPart = historyTo || "all";
      await api.exportAdvances({
        date_from: historyFrom || undefined,
        date_to: historyTo || undefined,
        filename: `advances_${fromPart}_${toPart}.xlsx`,
      });
      setMessage("Advance history downloaded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setExporting(false);
    }
  }

  if (!isSuperAdmin) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Only Super Admin can record advances.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-coal">Record Advance</h2>
        <p className="mt-1 text-sm text-gray-500">
          Record an advance payment. It adjusts on the next weekly salary sheet (Wed–Tue).
        </p>
        {message && <p className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
        <form
          className="mt-6 grid max-w-2xl gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            advance.mutate({
              labour: Number(form.get("labour")),
              amount: String(form.get("amount") ?? ""),
              date: String(form.get("date") ?? ""),
              reason: String(form.get("reason") ?? ""),
            });
            event.currentTarget.reset();
          }}
        >
          <Field label="Person">
            <select className={inputClass} name="labour" required>
              <option value="">Select person</option>
              {wageUsers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name || item.username} ({roleLabel(item)})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input className={inputClass} name="amount" min="0" step="0.01" type="number" required />
          </Field>
          <Field label="Date">
            <input className={inputClass} name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Reason">
            <input className={inputClass} name="reason" />
          </Field>
          <button className={btnPrimaryClass} disabled={advance.isPending}>
            {advance.isPending ? "Saving..." : "Save advance"}
          </button>
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-coal">Recent advances</h3>
            <p className="text-xs text-gray-500">Latest advance payments recorded</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Person</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Reason</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((row, i) => (
                  <tr key={row.id} className={i % 2 ? "bg-gray-50/60" : "bg-white"}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">
                      {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900">{row.labour_name || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.reason || "—"}</td>
                  </tr>
                ))}
                {!recentAdvances.isLoading && !recentRows.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      No advances recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-coal">Advance history</h3>
              <p className="text-xs text-gray-500">
                {historyRows.length} record{historyRows.length === 1 ? "" : "s"} · Total {formatCurrency(historyTotal)}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">From</span>
                <input
                  className={`${inputClass} mt-1 py-1.5 text-sm`}
                  type="date"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">To</span>
                <input
                  className={`${inputClass} mt-1 py-1.5 text-sm`}
                  type="date"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={`${btnSecondaryClass} py-1.5 text-xs`}
                disabled={exporting || !historyRows.length}
                onClick={downloadHistory}
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Downloading..." : "Download XLSX"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Person</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Reason</th>
                  <th className="px-4 py-2.5">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {historyPage.pageRows.map((row, i) => (
                  <tr key={row.id} className={i % 2 ? "bg-gray-50/60" : "bg-white"}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">
                      {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900">{row.labour_name || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{row.reason || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{row.created_by_name || "—"}</td>
                  </tr>
                ))}
                {!historyAdvances.isLoading && !historyRows.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      No advances in this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={historyPage.page}
            totalPages={historyPage.totalPages}
            total={historyPage.total}
            pageSize={historyPage.pageSize}
            from={historyPage.from}
            to={historyPage.to}
            onPageChange={historyPage.setPage}
          />
        </div>
      </div>
    </section>
  );
}

export function PayrollManager() {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isSupervisor = user?.role === "SUPERVISOR";
  const { wageUsers } = usePayrollEmployees();
  const [message, setMessage] = useState("");
  const [rangeMessage, setRangeMessage] = useState("");
  const [weekEnd, setWeekEnd] = useState(mostRecentTuesdayISO());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [rangeScope, setRangeScope] = useState<"all" | "individual" | "site">("all");
  const [rangeLabourId, setRangeLabourId] = useState("");
  const [rangeProjectId, setRangeProjectId] = useState("");

  const weeks = useQuery<Paginated<PayrollWeekListItem>>({
    queryKey: ["payroll-weeks"],
    queryFn: api.payrollWeeks,
  });
  const siteSheets = useQuery<Paginated<PayrollSiteSheetListItem>>({
    queryKey: ["payroll-site-sheets"],
    queryFn: api.payrollSiteSheets,
  });
  const projects = useQuery({
    queryKey: ["projects", "payroll-range"],
    queryFn: api.projects,
    enabled: isSuperAdmin,
  });
  const projectList = projects.data?.results ?? [];

  const generate = useMutation({
    mutationFn: () => api.generateWeeklyPayroll({ week_end: weekEnd }),
    onSuccess: (result) => {
      const skip =
        result.skipped_count > 0
          ? ` Skipped ${result.skipped_count}: ${result.skipped.map((s) => s.user_name).join(", ")}.`
          : "";
      setMessage(
        `Generated ${result.label} with ${result.lines?.length ?? 0} workers and ${result.site_sheet_count} site sheets.${skip}`,
      );
      queryClient.invalidateQueries({ queryKey: ["payroll-weeks"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-site-sheets"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Weekly payroll generation failed."),
  });

  const generateRange = useMutation({
    mutationFn: async () => {
      if (!periodStart || !periodEnd) {
        throw new Error("Select both from and to dates.");
      }
      if (periodStart > periodEnd) {
        throw new Error("To date must be on or after from date.");
      }
      const labour = rangeScope === "individual" ? Number(rangeLabourId) : undefined;
      const allSites = rangeScope === "site" && rangeProjectId === "all";
      const project =
        rangeScope === "site" && rangeProjectId && rangeProjectId !== "all"
          ? Number(rangeProjectId)
          : undefined;
      if (rangeScope === "individual" && !labour) {
        throw new Error("Select an employee.");
      }
      if (rangeScope === "site" && !allSites && !project) {
        throw new Error("Select a site / project.");
      }
      return api.generateWeeklyPayroll({
        period_start: periodStart,
        period_end: periodEnd,
        labour,
        project,
        all_sites: allSites || undefined,
      });
    },
    onSuccess: (result) => {
      const skip =
        result.skipped_count > 0
          ? ` Skipped ${result.skipped_count}: ${result.skipped.map((s) => s.user_name).join(", ")}.`
          : "";
      setRangeMessage(
        `Generated ${result.label} with ${result.lines?.length ?? 0} workers and ${result.site_sheet_count} site sheets.${skip}`,
      );
      queryClient.invalidateQueries({ queryKey: ["payroll-weeks"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-site-sheets"] });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setRangeMessage(err instanceof Error ? err.message : "Date-range salary generation failed."),
  });

  const weekRows = weeks.data?.results ?? [];
  const siteRows = siteSheets.data?.results ?? [];

  return (
    <section className="space-y-4">
      {isSuperAdmin && (
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-coal">Generate weekly salary sheets</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pay week is Wednesday–Tuesday. Generates company-wide (All) and site-wise sheets from approved attendance.
            You can generate again for the same week anytime — each run adds a new sheet.
          </p>
          {message && <p className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              generate.mutate();
            }}
          >
            <Field label="Week ending Tuesday">
              <input
                className={inputClass}
                type="date"
                value={weekEnd}
                onChange={(event) => setWeekEnd(event.target.value)}
                required
              />
            </Field>
            <button className={btnPrimaryClass} disabled={generate.isPending}>
              {generate.isPending ? "Generating..." : "Generate week"}
            </button>
          </form>
        </div>
      )}

      {isSuperAdmin && (
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-coal">Generate salary by date range</h2>
          <p className="mt-1 text-sm text-gray-500">
            Creates salary sheets for a custom period — everyone, one person, one site, or all sites. Individual creates
            only that person’s sheet; site scope creates site sheet(s). You can generate again for the same dates anytime
            — each run adds a new sheet.
          </p>
          {rangeMessage && (
            <p className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{rangeMessage}</p>
          )}
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              generateRange.mutate();
            }}
          >
            <Field label="From">
              <input
                className={inputClass}
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                required
              />
            </Field>
            <Field label="To">
              <input
                className={inputClass}
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                required
              />
            </Field>
            <Field label="Scope">
              <select
                className={inputClass}
                value={rangeScope}
                onChange={(event) => setRangeScope(event.target.value as "all" | "individual" | "site")}
              >
                <option value="all">All employees</option>
                <option value="individual">Individual</option>
                <option value="site">Site / project</option>
              </select>
            </Field>
            {rangeScope === "individual" && (
              <Field label="Person">
                <select
                  className={inputClass}
                  value={rangeLabourId}
                  onChange={(event) => setRangeLabourId(event.target.value)}
                  required
                >
                  <option value="">Select person</option>
                  {wageUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name || item.username} ({item.role === "SUPERVISOR" ? "Supervisor" : "Employee"})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {rangeScope === "site" && (
              <Field label="Site">
                <select
                  className={inputClass}
                  value={rangeProjectId}
                  onChange={(event) => setRangeProjectId(event.target.value)}
                  required
                >
                  <option value="">Select site</option>
                  <option value="all">All sites</option>
                  {projectList.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} · {project.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <button className={btnPrimaryClass} disabled={generateRange.isPending}>
              {generateRange.isPending ? "Generating..." : "Generate salary"}
            </button>
          </form>
        </div>
      )}

      {!isSuperAdmin && (
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-coal">Payroll</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isSupervisor
              ? "Review weekly salary sheets and mark workers as paid once disbursed."
              : "View weekly salary sheets."}
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-coal">All salary sheets</h2>
              <p className="text-xs text-gray-500">Company-wide weekly and date-range payroll</p>
            </div>
            <Link href="/payroll/sheets/browse" className="shrink-0 text-sm font-medium text-violet-700 hover:text-violet-900">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {weekRows.map((week) => (
              <li key={week.id}>
                <Link
                  href={`/payroll/sheets/${week.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-violet-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{week.label}</p>
                    <p className="text-xs text-gray-500">
                      {formatShortRange(week.week_start, week.week_end)}
                      {week.generated_at ? ` · ${formatGeneratedAt(week.generated_at)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-gray-500">
                    <p>{week.line_count} workers</p>
                    <p className="font-medium text-gray-800">{formatCurrency(week.total_net)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {!weeks.isLoading && !weekRows.length && (
            <p className="px-4 py-8 text-center text-sm text-amber-700">No weekly sheets generated yet.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-coal">Site-wise payroll</h2>
              <p className="text-xs text-gray-500">Per project from attendance that week</p>
            </div>
            <Link href="/payroll/site-sheets/browse" className="shrink-0 text-sm font-medium text-violet-700 hover:text-violet-900">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {siteRows.map((sheet) => (
              <li key={sheet.id}>
                <Link
                  href={`/payroll/site-sheets/${sheet.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-violet-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{sheet.label}</p>
                    <p className="text-xs text-gray-500">
                      {formatShortRange(sheet.week_start, sheet.week_end)}
                      {sheet.generated_at ? ` · ${formatGeneratedAt(sheet.generated_at)}` : ""}
                      {sheet.supervisor_name ? (
                        <>
                          {" · "}
                          {sheet.supervisor_name}{" "}
                          <span className="font-normal text-gray-400">(Supervisor)</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-gray-500">
                    <p>{sheet.line_count} workers</p>
                    <p className="font-medium text-gray-800">{formatCurrency(sheet.total_amount)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {!siteSheets.isLoading && !siteRows.length && (
            <p className="px-4 py-8 text-center text-sm text-amber-700">No site-wise sheets yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function DayHeaders({ headers }: { headers: PayrollDayHeader[] }) {
  return (
    <>
      {headers.map((h) => (
        <th key={h.key} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          <span className="block">{h.label}</span>
          <span className="block font-normal normal-case text-gray-400">{h.date_label}</span>
        </th>
      ))}
    </>
  );
}

export function PayrollWeekDetailPage() {
  const params = useParams();
  const id = Number(params?.weekId);
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const detail = useQuery({
    queryKey: ["payroll-week", id],
    queryFn: () => api.payrollWeek(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const week = detail.data as PayrollWeekDetail | undefined;
  const headers = week?.day_headers ?? [];

  async function download() {
    if (!week) return;
    setExporting(true);
    try {
      await api.exportPayrollWeek(week.id, `${week.label}.xlsx`);
      setMessage("Downloaded Excel.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/payroll" className={`${btnSecondaryClass} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-coal">{week?.label ?? "Salary sheet"}</h2>
            {week && (
              <p className="text-xs text-gray-500">
                {formatShortRange(week.week_start, week.week_end)}
                {week.generated_at ? ` · ${formatGeneratedAt(week.generated_at)}` : ""}
              </p>
            )}
          </div>
        </div>
        {isSuperAdmin && week && (
          <button type="button" className={`${btnSecondaryClass} inline-flex items-center gap-1.5`} disabled={exporting} onClick={download}>
            <Download className="h-4 w-4" />
            {exporting ? "Downloading..." : "Download Excel"}
          </button>
        )}
      </div>

      {message && <p className="rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
      {detail.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {detail.isError && <p className="text-sm text-red-600">Could not load sheet.</p>}

      {week && <PayrollWeekSheetTable week={week} headers={headers} />}
    </section>
  );
}

function PayrollWeekSheetTable({
  week,
  headers,
}: {
  week: PayrollWeekDetail;
  headers: PayrollDayHeader[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3 text-center">
        <p className="text-sm font-bold tracking-wide text-gray-900">HITESH CONSTRUCTION</p>
        <p className="text-xs font-semibold text-gray-700">Labour Attendance Wages</p>
        <p className="mt-1 text-xs text-gray-500">{week.label}</p>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">SR</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Name</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Rate</th>
            <DayHeaders headers={headers} />
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Total</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Advance</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {week.lines.map((line, index) => (
            <tr key={line.id} className={index % 2 ? "bg-gray-50/60" : ""}>
              <td className="px-3 py-2 text-center text-gray-500">{index + 1}</td>
              <td className="px-3 py-2 font-medium uppercase text-gray-900">{line.user_name}</td>
              <td className="px-3 py-2">{Number(line.rate).toFixed(2)}</td>
              {headers.map((h) => (
                <td key={h.key} className="px-2 py-2 text-center">
                  {markCell(line.day_marks, h.key)}
                </td>
              ))}
              <td className="px-3 py-2 text-center">{line.total_days}</td>
              <td className="px-3 py-2">{Number(line.advances) > 0 ? Number(line.advances).toFixed(2) : ""}</td>
              <td className="px-3 py-2 font-medium">{formatCurrency(line.net)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
            <td className="px-3 py-3" colSpan={3 + headers.length + 2}>
              Total Amount
            </td>
            <td className="px-3 py-3">{formatCurrency(week.total_net)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PayrollSiteSheetDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const detail = useQuery({
    queryKey: ["payroll-site-sheet", id],
    queryFn: () => api.payrollSiteSheet(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  const sheet = detail.data as PayrollSiteSheetDetail | undefined;
  const headers = sheet?.day_headers ?? [];

  async function download() {
    if (!sheet) return;
    setExporting(true);
    try {
      await api.exportPayrollSiteSheet(sheet.id, `${sheet.week_label}_${sheet.project_name}.xlsx`);
      setMessage("Downloaded Excel.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/payroll" className={`${btnSecondaryClass} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-coal">{sheet?.label ?? "Site salary sheet"}</h2>
            {sheet && (
              <p className="text-xs text-gray-500">
                {formatShortRange(sheet.week_start, sheet.week_end)}
                {sheet.generated_at ? ` · ${formatGeneratedAt(sheet.generated_at)}` : ""}
              </p>
            )}
          </div>
        </div>
        {isSuperAdmin && sheet && (
          <button type="button" className={`${btnSecondaryClass} inline-flex items-center gap-1.5`} disabled={exporting} onClick={download}>
            <Download className="h-4 w-4" />
            {exporting ? "Downloading..." : "Download Excel"}
          </button>
        )}
      </div>

      {message && <p className="rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
      {detail.isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {detail.isError && <p className="text-sm text-red-600">Could not load site sheet.</p>}

      {sheet && <PayrollSiteSheetTable sheet={sheet} headers={headers} />}
    </section>
  );
}

function PayrollSiteSheetTable({
  sheet,
  headers,
}: {
  sheet: PayrollSiteSheetDetail;
  headers: PayrollDayHeader[];
}) {
  const hasAdvance = (sheet.lines ?? []).some((line) => Number(line.advances) > 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200/80 bg-white shadow-sm">
      <div className="space-y-1 border-b border-gray-100 px-4 py-4 text-center">
        <p className="text-base font-bold tracking-wide text-gray-900">HITESH CONSTRUCTION</p>
        <p className="text-sm font-semibold text-gray-800">Labour Attendance Wages</p>
        <p className="text-sm font-bold uppercase text-gray-900">{sheet.project_name}</p>
        {sheet.supervisor_name ? (
          <p className="text-sm font-semibold uppercase text-gray-800">
            {sheet.supervisor_name}{" "}
            <span className="text-xs font-normal normal-case text-gray-500">(Supervisor)</span>
          </p>
        ) : null}
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">SR NO</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Name</th>
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Rate</th>
            <DayHeaders headers={headers} />
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Total Days</th>
            {hasAdvance && <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Advance</th>}
            <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sheet.lines.map((line, index) => (
            <tr key={line.id} className={index % 2 ? "bg-gray-50/60" : ""}>
              <td className="px-3 py-2 text-center text-gray-500">{index + 1}</td>
              <td className="px-3 py-2 font-medium uppercase text-gray-900">{line.user_name}</td>
              <td className="px-3 py-2">{Number(line.rate).toFixed(2)}</td>
              {headers.map((h) => (
                <td key={h.key} className="px-2 py-2 text-center">
                  {markCell(line.day_marks, h.key)}
                </td>
              ))}
              <td className="px-3 py-2 text-center">{line.total_days}</td>
              {hasAdvance && (
                <td className="px-3 py-2">
                  {Number(line.advances) > 0 ? Number(line.advances).toFixed(2) : ""}
                </td>
              )}
              <td className="px-3 py-2 font-medium">{formatCurrency(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
            <td className="px-3 py-3" colSpan={3 + headers.length + (hasAdvance ? 1 : 0) + 1}>
              Total Amount
            </td>
            <td className="px-3 py-3">{formatCurrency(sheet.total_amount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function PayrollWeeksBrowsePage() {
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [index, setIndex] = useState(0);

  const list = useQuery<Paginated<PayrollWeekListItem>>({
    queryKey: ["payroll-weeks"],
    queryFn: api.payrollWeeks,
  });

  const ordered = useMemo(
    () => sortByGeneratedDesc(list.data?.results ?? []),
    [list.data?.results],
  );

  const safeIndex = ordered.length ? Math.min(Math.max(index, 0), ordered.length - 1) : 0;
  const currentMeta = ordered[safeIndex];
  const id = currentMeta?.id ?? 0;

  const detail = useQuery({
    queryKey: ["payroll-week", id],
    queryFn: () => api.payrollWeek(id),
    enabled: id > 0,
  });

  const week = detail.data as PayrollWeekDetail | undefined;
  const headers = week?.day_headers ?? [];
  const older = safeIndex < ordered.length - 1 ? ordered[safeIndex + 1] : null;
  const newer = safeIndex > 0 ? ordered[safeIndex - 1] : null;

  async function download() {
    if (!week) return;
    setExporting(true);
    try {
      await api.exportPayrollWeek(week.id, `${week.label}.xlsx`);
      setMessage("Downloaded Excel.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/payroll" className={`${btnSecondaryClass} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-coal">{week?.label ?? "All salary sheets"}</h2>
            {week && (
              <p className="text-xs text-gray-500">
                {formatShortRange(week.week_start, week.week_end)}
                {week.generated_at ? ` · ${formatGeneratedAt(week.generated_at)}` : ""}
                {ordered.length ? ` · ${safeIndex + 1} of ${ordered.length}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${btnSecondaryClass} inline-flex items-center gap-1 px-3 py-1.5 text-sm`}
            disabled={!older}
            onClick={() => setIndex(safeIndex + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            className={`${btnSecondaryClass} inline-flex items-center gap-1 px-3 py-1.5 text-sm`}
            disabled={!newer}
            onClick={() => setIndex(safeIndex - 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
          {isSuperAdmin && week && (
            <button type="button" className={`${btnSecondaryClass} inline-flex items-center gap-1.5`} disabled={exporting} onClick={download}>
              <Download className="h-4 w-4" />
              {exporting ? "Downloading..." : "Download Excel"}
            </button>
          )}
        </div>
      </div>

      {message && <p className="rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
      {(list.isLoading || detail.isLoading) && <p className="text-sm text-gray-500">Loading…</p>}
      {!list.isLoading && !ordered.length && (
        <p className="text-sm text-amber-700">No salary sheets generated yet.</p>
      )}
      {detail.isError && <p className="text-sm text-red-600">Could not load sheet.</p>}
      {week && <PayrollWeekSheetTable week={week} headers={headers} />}
    </section>
  );
}

export function PayrollSiteSheetsBrowsePage() {
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [index, setIndex] = useState(0);

  const list = useQuery<Paginated<PayrollSiteSheetListItem>>({
    queryKey: ["payroll-site-sheets"],
    queryFn: api.payrollSiteSheets,
  });

  const ordered = useMemo(
    () => sortByGeneratedDesc(list.data?.results ?? []),
    [list.data?.results],
  );

  const safeIndex = ordered.length ? Math.min(Math.max(index, 0), ordered.length - 1) : 0;
  const currentMeta = ordered[safeIndex];
  const id = currentMeta?.id ?? 0;

  const detail = useQuery({
    queryKey: ["payroll-site-sheet", id],
    queryFn: () => api.payrollSiteSheet(id),
    enabled: id > 0,
  });

  const sheet = detail.data as PayrollSiteSheetDetail | undefined;
  const headers = sheet?.day_headers ?? [];
  const older = safeIndex < ordered.length - 1 ? ordered[safeIndex + 1] : null;
  const newer = safeIndex > 0 ? ordered[safeIndex - 1] : null;

  async function download() {
    if (!sheet) return;
    setExporting(true);
    try {
      await api.exportPayrollSiteSheet(sheet.id, `${sheet.week_label}_${sheet.project_name}.xlsx`);
      setMessage("Downloaded Excel.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/payroll" className={`${btnSecondaryClass} inline-flex items-center gap-1.5 px-3 py-1.5 text-sm`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-coal">{sheet?.label ?? "Site-wise payroll"}</h2>
            {sheet && (
              <p className="text-xs text-gray-500">
                {formatShortRange(sheet.week_start, sheet.week_end)}
                {sheet.generated_at ? ` · ${formatGeneratedAt(sheet.generated_at)}` : ""}
                {ordered.length ? ` · ${safeIndex + 1} of ${ordered.length}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`${btnSecondaryClass} inline-flex items-center gap-1 px-3 py-1.5 text-sm`}
            disabled={!older}
            onClick={() => setIndex(safeIndex + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            className={`${btnSecondaryClass} inline-flex items-center gap-1 px-3 py-1.5 text-sm`}
            disabled={!newer}
            onClick={() => setIndex(safeIndex - 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
          {isSuperAdmin && sheet && (
            <button type="button" className={`${btnSecondaryClass} inline-flex items-center gap-1.5`} disabled={exporting} onClick={download}>
              <Download className="h-4 w-4" />
              {exporting ? "Downloading..." : "Download Excel"}
            </button>
          )}
        </div>
      </div>

      {message && <p className="rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
      {(list.isLoading || detail.isLoading) && <p className="text-sm text-gray-500">Loading…</p>}
      {!list.isLoading && !ordered.length && (
        <p className="text-sm text-amber-700">No site-wise sheets yet.</p>
      )}
      {detail.isError && <p className="text-sm text-red-600">Could not load site sheet.</p>}
      {sheet && <PayrollSiteSheetTable sheet={sheet} headers={headers} />}
    </section>
  );
}
