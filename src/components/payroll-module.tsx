"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    const profile = existingProfile.data?.results?.[0];
    if (!selectedId) {
      setMonthlySalary("0");
      setDailyWage("");
      setOvertimeRate("0");
      return;
    }
    if (existingProfile.isFetching) return;
    if (profile) {
      setMonthlySalary(String(profile.monthly_salary ?? "0"));
      setDailyWage(String(profile.daily_wage ?? ""));
      setOvertimeRate(String(profile.overtime_rate ?? "0"));
    } else {
      setMonthlySalary("0");
      setDailyWage("");
      setOvertimeRate("0");
    }
  }, [selectedId, existingProfile.data, existingProfile.isFetching]);

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
  const [message, setMessage] = useState("");
  const { wageUsers, isSuperAdmin } = usePayrollEmployees();
  const advance = useMutation({
    mutationFn: (payload: Parameters<typeof api.createAdvance>[0]) => api.createAdvance(payload),
    onSuccess: () => setMessage("Advance payment recorded."),
    onError: (err) => setMessage(err instanceof Error ? err.message : "Advance creation failed."),
  });

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
  const [rangeScope, setRangeScope] = useState<"all" | "individual">("all");
  const [rangeLabourId, setRangeLabourId] = useState("");

  const weeks = useQuery<Paginated<PayrollWeekListItem>>({
    queryKey: ["payroll-weeks"],
    queryFn: api.payrollWeeks,
  });
  const siteSheets = useQuery<Paginated<PayrollSiteSheetListItem>>({
    queryKey: ["payroll-site-sheets"],
    queryFn: api.payrollSiteSheets,
  });

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
      if (rangeScope === "individual" && !labour) {
        throw new Error("Select an employee.");
      }
      return api.generateWeeklyPayroll({
        period_start: periodStart,
        period_end: periodEnd,
        labour,
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
            Automatic runs:{" "}
            {/* <code className="rounded bg-gray-100 px-1 text-xs">python manage.py generate_weekly_payroll</code> each */}
            Tuesday.
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
            Creates an All + site-wise salary sheet for a custom period — one person or everyone. Opens under All salary
            sheets below.
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
                onChange={(event) => setRangeScope(event.target.value as "all" | "individual")}
              >
                <option value="all">All employees</option>
                <option value="individual">Individual</option>
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
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-base font-semibold text-coal">All salary sheets</h2>
            <p className="text-xs text-gray-500">Company-wide weekly and date-range payroll</p>
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
                    <p className="text-xs text-gray-500">{formatShortRange(week.week_start, week.week_end)}</p>
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
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-base font-semibold text-coal">Site-wise payroll</h2>
            <p className="text-xs text-gray-500">Per project from attendance that week</p>
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
                      {sheet.supervisor_name ? ` · ${sheet.supervisor_name}` : ""}
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
              <p className="text-xs text-gray-500">{formatShortRange(week.week_start, week.week_end)}</p>
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

      {week && (
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
      )}
    </section>
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

  const hasAdvance = useMemo(
    () => (sheet?.lines ?? []).some((line) => Number(line.advances) > 0),
    [sheet],
  );

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
              <p className="text-xs text-gray-500">{formatShortRange(sheet.week_start, sheet.week_end)}</p>
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

      {sheet && (
        <div className="overflow-x-auto rounded-lg border border-gray-200/80 bg-white shadow-sm">
          <div className="space-y-1 border-b border-gray-100 px-4 py-4 text-center">
            <p className="text-base font-bold tracking-wide text-gray-900">HITESH CONSTRUCTION</p>
            <p className="text-sm font-semibold text-gray-800">Labour Attendance Wages</p>
            <p className="text-sm font-bold uppercase text-gray-900">{sheet.project_name}</p>
            {sheet.supervisor_name ? (
              <p className="text-sm font-semibold uppercase text-gray-800">{sheet.supervisor_name}</p>
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
      )}
    </section>
  );
}
