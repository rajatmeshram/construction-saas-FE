"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  History,
  IndianRupee,
  Timer,
  Upload,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { AttendanceRecord, LabourProfile, MonthlyAttendance, Salary } from "@/lib/types";
import { useAppSelector } from "@/store/hooks";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableRow,
  FormRow,
  Modal,
  SearchInput,
  TabBar,
  Toolbar,
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
} from "@/components/ui";

function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function approvalTone(status: AttendanceRecord["approval_status"]): "green" | "amber" | "red" {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "amber";
}

function formatPeriod(start?: string, end?: string) {
  if (!start || !end) return "—";
  const from = new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const to = new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${from} – ${to}`;
}

function markTone(mark?: AttendanceRecord["attendance_mark"]): "green" | "red" | "amber" {
  if (mark === "ABSENT") return "red";
  if (mark === "HALF_DAY") return "amber";
  return "green";
}

function salaryStatusTone(status: Salary["payment_status"]): "green" | "amber" {
  return status === "PAID" ? "green" : "amber";
}

function calendarDayStyle(mark?: "PRESENT" | "ABSENT" | "HALF_DAY", hasEntry?: boolean) {
  if (!hasEntry) return "bg-cement text-gray-400";
  if (mark === "ABSENT") return "bg-red-500 text-white";
  if (mark === "HALF_DAY") return "bg-amber-400 text-white";
  return "bg-green-500 text-white";
}

function calendarDayLabel(day: number, mark?: "PRESENT" | "ABSENT" | "HALF_DAY", hasEntry?: boolean) {
  if (!hasEntry) return String(day);
  if (mark === "ABSENT") return "A";
  if (mark === "HALF_DAY") return "H";
  return "P";
}

function CompactCalendar({
  data,
  month,
  year,
  onPrev,
  onNext,
}: {
  data?: MonthlyAttendance;
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = data?.days_in_month ?? new Date(year, month, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="max-w-xs">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onPrev} className="rounded-lg bg-cement px-2 py-0.5 text-xs font-bold text-coal">
          ←
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-coal">{monthLabel}</p>
          <p className="text-[10px] text-gray-500">
            {data?.present_days ?? 0} present · {data?.total_hours ?? 0}h
          </p>
        </div>
        <button type="button" onClick={onNext} className="rounded-lg bg-cement px-2 py-0.5 text-xs font-bold text-coal">
          →
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold text-gray-500">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((day, index) => {
          if (!day) return <div key={`e-${index}`} className="h-7 w-7" />;
          const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = data?.days[key];
          const mark = dayData?.attendance_mark ?? (dayData?.present ? "PRESENT" : undefined);
          return (
            <div
              key={key}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black ${calendarDayStyle(mark, Boolean(dayData))}`}
              title={
                dayData
                  ? `${mark ?? "PRESENT"} · ${dayData.working_hours}h${dayData.project_name ? ` · ${dayData.project_name}` : ""}`
                  : "No attendance"
              }
            >
              {calendarDayLabel(day, mark, Boolean(dayData))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkersListPage() {
  const queryClient = useQueryClient();
  const [nameSearch, setNameSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const workers = useQuery({
    queryKey: ["labour-workers", nameSearch, mobileSearch],
    queryFn: () => api.labourWorkers({ name: nameSearch || undefined, mobile: mobileSearch || undefined, ordering: "user__first_name" }),
  });

  const createWorker = useMutation({
    mutationFn: api.createLabourWorker,
    onSuccess: () => {
      setMessage("Labour created.");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Create failed."),
  });

  const importWorkers = useMutation({
    mutationFn: api.importLabourWorkers,
    onSuccess: (result) => {
      setMessage(`Imported ${result.created_count} workers. Skipped ${result.skipped_count}.`);
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Import failed."),
  });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createWorker.mutate({
      full_name: String(form.get("full_name") ?? ""),
      mobile_number: String(form.get("mobile_number") ?? ""),
      salary: String(form.get("salary") ?? "0"),
      employee_id: String(form.get("employee_id") ?? ""),
      status: String(form.get("status") ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
      joining_date: String(form.get("joining_date") ?? "") || undefined,
    });
    event.currentTarget.reset();
  }

  const allRows = workers.data?.results ?? [];
  const rows = statusFilter === "ALL" ? allRows : allRows.filter((w) => w.status === statusFilter);
  const activeCount = allRows.filter((w) => w.status === "ACTIVE").length;
  const inactiveCount = allRows.filter((w) => w.status === "INACTIVE").length;

  return (
    <section className="space-y-4">
      {message && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <TabBar
          active={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { id: "ALL", label: "All", count: allRows.length },
            { id: "ACTIVE", label: "Active", count: activeCount },
            { id: "INACTIVE", label: "Inactive", count: inactiveCount },
          ]}
        />
        <Toolbar>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={nameSearch} onChange={setNameSearch} placeholder="Search by name" />
            <SearchInput value={mobileSearch} onChange={setMobileSearch} placeholder="Search by mobile" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className={`${btnSecondaryClass} cursor-pointer`}>
              <Upload className="h-4 w-4" />
              Import CSV/Excel
              <input
                className="hidden"
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importWorkers.mutate(file);
                }}
              />
            </label>
            <Link href="/workers/bulk-attendance" className={btnSecondaryClass}>
              Bulk Attendance
            </Link>
            <button type="button" className={btnPrimaryClass} onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add Labour
            </button>
          </div>
        </Toolbar>

        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Mobile</th>
              <th className="px-4 py-2.5">Employee ID</th>
              <th className="px-4 py-2.5">Salary</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((worker, i) => (
              <DataTableRow key={worker.id} zebra={i % 2 === 1}>
                <DataTableCell className="font-medium text-gray-900">{worker.full_name}</DataTableCell>
                <DataTableCell>{worker.mobile_number}</DataTableCell>
                <DataTableCell>{worker.employee_id || "—"}</DataTableCell>
                <DataTableCell>{formatCurrency(worker.salary)}</DataTableCell>
                <DataTableCell>
                  <Badge tone={worker.status === "ACTIVE" ? "green" : "gray"}>{worker.status}</Badge>
                </DataTableCell>
                <DataTableCell>
                  <Link href={`/workers/${worker.id}`} className="text-sm font-medium text-violet-700 hover:underline">
                    View
                  </Link>
                </DataTableCell>
              </DataTableRow>
            ))}
            {!rows.length && !workers.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  No labour records found.
                </td>
              </tr>
            )}
          </DataTableBody>
        </DataTable>
      </div>

      <Modal
        open={createOpen}
        title="Add Labour"
        subtitle="Create a new worker record"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className={btnSecondaryClass} onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="create-labour-form" className={btnPrimaryClass} disabled={createWorker.isPending}>
              {createWorker.isPending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form id="create-labour-form" onSubmit={submitCreate}>
          <FormRow label="Full name"><input className={inputClass} name="full_name" required /></FormRow>
          <FormRow label="Mobile"><input className={inputClass} name="mobile_number" required /></FormRow>
          <FormRow label="Salary"><input className={inputClass} name="salary" type="number" required /></FormRow>
          <FormRow label="Employee ID"><input className={inputClass} name="employee_id" /></FormRow>
          <FormRow label="Joining date"><input className={inputClass} name="joining_date" type="date" /></FormRow>
          <FormRow label="Status">
            <select className={inputClass} name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </FormRow>
        </form>
      </Modal>
    </section>
  );
}

export function WorkerProfilePage({ workerId }: { workerId: number }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [salaryResult, setSalaryResult] = useState<{ working_days: string; gross_pay: string; net_pay: string } | null>(null);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [salaryMonth, setSalaryMonth] = useState<number | "all">("all");
  const [salaryYear, setSalaryYear] = useState(now.getFullYear());

  const summary = useQuery({
    queryKey: ["labour-summary", workerId],
    queryFn: () => api.labourWorkerSummary(workerId),
  });

  const monthly = useQuery({
    queryKey: ["monthly-attendance", summary.data?.profile.user_id, calendarMonth, calendarYear],
    queryFn: () => api.monthlyAttendance(calendarMonth, calendarYear, summary.data!.profile.user_id),
    enabled: Boolean(summary.data?.profile.user_id),
  });

  const workerSalaries = useQuery({
    queryKey: ["worker-salaries", workerId, salaryMonth, salaryYear],
    queryFn: () =>
      api.labourWorkerSalaries(workerId, {
        year: salaryYear,
        ...(salaryMonth !== "all" ? { month: salaryMonth } : {}),
      }),
    enabled: Boolean(summary.data?.profile.user_id),
  });

  const manual = useMutation({
    mutationFn: api.manualAttendance,
    onSuccess: () => {
      setMessage("Attendance marked.");
      queryClient.invalidateQueries({ queryKey: ["labour-summary", workerId] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Failed to mark attendance."),
  });

  const generateSalary = useMutation({
    mutationFn: api.generateSalary,
    onSuccess: (salary) => {
      setSalaryResult({
        working_days: salary.working_days,
        gross_pay: salary.gross_pay,
        net_pay: salary.net_pay,
      });
      setMessage(`Salary generated for ${now.toLocaleString("en-IN", { month: "long" })} till ${now.toLocaleDateString("en-IN")}.`);
      queryClient.invalidateQueries({ queryKey: ["labour-summary", workerId] });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["worker-salaries"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Salary generation failed."),
  });

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary.data) return;
    const assigned = summary.data.profile.assigned_projects ?? [];
    if (!assigned.length) {
      setMessage("This worker is not assigned to any project. Assign them on the project team first.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const projectField = form.get("project");
    const project =
      assigned.length === 1
        ? assigned[0].id
        : projectField
          ? Number(projectField)
          : undefined;
    if (!project) {
      setMessage("Select a project for this worker.");
      return;
    }
    manual.mutate({
      labour: summary.data.profile.user_id,
      project,
      date: String(form.get("date")),
      punch_in_time: String(form.get("punch_in_time") || "") || undefined,
      punch_out_time: String(form.get("punch_out_time") || "") || undefined,
      attendance_mark: String(form.get("attendance_mark")) as "PRESENT" | "ABSENT" | "HALF_DAY",
      extra_hours: Number(form.get("extra_hours") || 0) || undefined,
      notes: String(form.get("notes") || ""),
    });
    event.currentTarget.reset();
  }

  if (summary.isLoading) return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading profile...</p>;
  if (!summary.data) return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Worker not found.</p>;

  const profile = summary.data.profile;
  const stats = summary.data.attendance_stats;
  const assignedProjects = profile.assigned_projects ?? [];
  const todayIso = now.toISOString().slice(0, 10);
  const canMarkAttendance = assignedProjects.length > 0;
  const salaryRows = workerSalaries.data ?? [];
  const paidSalaries = salaryRows.filter((row) => row.payment_status === "PAID");
  const pendingSalaries = salaryRows.filter((row) => row.payment_status === "PENDING");
  const totalNetPaid = paidSalaries.reduce((sum, row) => sum + Number(row.net_pay), 0);
  const salaryProfile = summary.data.salary_profile;
  const yearSet = new Set<number>([now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]);
  salaryRows.forEach((row) => yearSet.add(row.year));
  const yearOptions = Array.from(yearSet).sort((a, b) => b - a);
  const monthPresentDays = monthly.data?.present_days ?? 0;
  const monthAbsentDays = monthly.data?.absent_days ?? 0;
  const formatDayCount = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/workers" className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-coal shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to labour list
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/workers/${workerId}/history`} className={btnSecondaryClass}>
            <History className="h-4 w-4" />
            View Attendance History
          </Link>
          <button
            type="button"
            className={btnPrimaryClass}
            disabled={generateSalary.isPending}
            onClick={() =>
              generateSalary.mutate({
                labour: profile.user_id,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                till_date: todayIso,
                deductions: "0",
              })
            }
          >
            <IndianRupee className="h-4 w-4" />
            {generateSalary.isPending ? "Generating..." : "Generate Salary Till Today"}
          </button>
        </div>
      </div>

      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      {salaryResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Latest salary (present days till today)</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <p>Working days: <span className="font-bold">{salaryResult.working_days}</span></p>
            <p>Gross pay: <span className="font-bold">{formatCurrency(salaryResult.gross_pay)}</span></p>
            <p>Net pay: <span className="font-bold">{formatCurrency(salaryResult.net_pay)}</span></p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-coal">Salary Payments</h3>
              <p className="text-xs text-gray-500">
                {paidSalaries.length} paid · {pendingSalaries.length} pending
                {paidSalaries.length > 0 ? ` · Total paid ${formatCurrency(totalNetPaid)}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Month</span>
                <select
                  className={`${inputClass} mt-1 min-w-[9rem]`}
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
                >
                  <option value="all">All months</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1, 1).toLocaleString("en-IN", { month: "long" })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Year</span>
                <select
                  className={`${inputClass} mt-1 min-w-[6rem]`}
                  value={salaryYear}
                  onChange={(e) => setSalaryYear(Number(e.target.value))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {workerSalaries.isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading salary records...</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <th className="px-4 py-2.5">Period</th>
                <th className="px-4 py-2.5">Days</th>
                <th className="px-4 py-2.5">Extra Hrs</th>
                <th className="px-4 py-2.5">Gross</th>
                <th className="px-4 py-2.5">Advances</th>
                <th className="px-4 py-2.5">Net Pay</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {salaryRows.map((row, i) => (
                <DataTableRow key={row.id} zebra={i % 2 === 1} onClick={() => setSelectedSalary(row)}>
                  <DataTableCell className="font-medium text-gray-900">{formatPeriod(row.period_start, row.period_end)}</DataTableCell>
                  <DataTableCell>{row.working_days}</DataTableCell>
                  <DataTableCell>{row.overtime_hours}h</DataTableCell>
                  <DataTableCell>{formatCurrency(row.gross_pay)}</DataTableCell>
                  <DataTableCell>{formatCurrency(row.advances)}</DataTableCell>
                  <DataTableCell className="font-medium text-gray-900">{formatCurrency(row.net_pay)}</DataTableCell>
                  <DataTableCell>
                    <Badge tone={salaryStatusTone(row.payment_status)}>{row.payment_status}</Badge>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
        {!workerSalaries.isLoading && !salaryRows.length && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No salary records for this period.</p>
        )}
      </div>

      <Modal
        open={Boolean(selectedSalary)}
        title="Salary Payment Details"
        subtitle={selectedSalary ? formatPeriod(selectedSalary.period_start, selectedSalary.period_end) : undefined}
        onClose={() => setSelectedSalary(null)}
        footer={
          <button type="button" className={btnSecondaryClass} onClick={() => setSelectedSalary(null)}>
            Close
          </button>
        }
      >
        {selectedSalary && salaryProfile && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-bold uppercase text-gray-500">Pay period</p>
                <p className="mt-1 font-medium text-coal">{formatPeriod(selectedSalary.period_start, selectedSalary.period_end)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-bold uppercase text-gray-500">Status</p>
                <p className="mt-1">
                  <Badge tone={salaryStatusTone(selectedSalary.payment_status)}>{selectedSalary.payment_status}</Badge>
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 p-4">
              <p className="font-semibold text-coal">Calculation</p>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Present days</dt>
                  <dd className="font-medium">{selectedSalary.working_days}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Daily wage</dt>
                  <dd className="font-medium">{formatCurrency(salaryProfile.daily_wage)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Regular pay</dt>
                  <dd className="font-medium">
                    {formatCurrency(Number(selectedSalary.working_days) * Number(salaryProfile.daily_wage))}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Extra hours</dt>
                  <dd className="font-medium">{selectedSalary.overtime_hours}h × {formatCurrency(salaryProfile.overtime_rate)}/hr</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Overtime pay</dt>
                  <dd className="font-medium">
                    {formatCurrency(Number(selectedSalary.overtime_hours) * Number(salaryProfile.overtime_rate))}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-gray-100 pt-2">
                  <dt className="font-medium text-coal">Gross pay</dt>
                  <dd className="font-semibold">{formatCurrency(selectedSalary.gross_pay)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Advances deducted</dt>
                  <dd className="font-medium text-red-700">− {formatCurrency(selectedSalary.advances)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Other deductions</dt>
                  <dd className="font-medium text-red-700">− {formatCurrency(selectedSalary.deductions)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-gray-100 pt-2">
                  <dt className="font-semibold text-coal">Net pay</dt>
                  <dd className="text-base font-bold text-emerald-700">{formatCurrency(selectedSalary.net_pay)}</dd>
                </div>
              </dl>
            </div>

            {selectedSalary.payment_status === "PAID" && selectedSalary.paid_at && (
              <div className="rounded-lg bg-emerald-50 p-3 text-emerald-900">
                <p className="text-[10px] font-bold uppercase">Payment</p>
                <p className="mt-1">
                  Paid on {new Date(selectedSalary.paid_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  {selectedSalary.paid_by_name ? ` by ${selectedSalary.paid_by_name}` : ""}
                </p>
              </div>
            )}
          </div>
        )}
        {selectedSalary && !salaryProfile && (
          <p className="text-sm text-gray-500">Salary profile not configured for this worker.</p>
        )}
      </Modal>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Labour Profile</p>
          <h2 className="mt-1 text-base font-semibold text-coal">{profile.full_name}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Mobile</p><p className="font-bold">{profile.mobile_number}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Employee ID</p><p className="font-bold">{profile.employee_id || "—"}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Salary</p><p className="font-bold">{formatCurrency(profile.salary)}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Status</p><p className="font-bold">{profile.status}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Joining Date</p><p className="font-bold">{profile.joining_date || "—"}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Working Hours</p><p className="font-bold">{stats.total_working_hours}h</p></div>
          </div>
          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Assigned Projects</p>
            {assignedProjects.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {assignedProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="rounded-md border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
                  >
                    {project.code} · {project.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-700">
                No project assigned yet. Add this worker from the project team page.
              </p>
            )}
          </div>
          {summary.data.salary_profile && (
            <div className="mt-4 rounded-2xl border border-gray-100 p-4">
              <p className="text-sm font-bold text-coal">Payroll</p>
              <p className="text-sm text-gray-600">Monthly: {formatCurrency(summary.data.salary_profile.monthly_salary)}</p>
              <p className="text-sm text-gray-600">Daily wage: {formatCurrency(summary.data.salary_profile.daily_wage)}</p>
              <p className="text-sm text-gray-600">Overtime rate: {formatCurrency(summary.data.salary_profile.overtime_rate)}/hr</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-safety" />
            <h3 className="text-sm font-black text-coal">Attendance Calendar</h3>
          </div>
          <div className="mt-3">
            <CompactCalendar
              data={monthly.data}
              month={calendarMonth}
              year={calendarYear}
              onPrev={() => {
                const d = new Date(calendarYear, calendarMonth - 2, 1);
                setCalendarMonth(d.getMonth() + 1);
                setCalendarYear(d.getFullYear());
              }}
              onNext={() => {
                const d = new Date(calendarYear, calendarMonth, 1);
                setCalendarMonth(d.getMonth() + 1);
                setCalendarYear(d.getFullYear());
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-xl bg-green-50 p-2"><p className="text-[10px] uppercase text-green-800">Present</p><p className="font-black text-green-900">{formatDayCount(monthPresentDays)}</p></div>
            <div className="rounded-xl bg-red-50 p-2"><p className="text-[10px] uppercase text-red-800">Absent</p><p className="font-black text-red-900">{monthAbsentDays}</p></div>
          </div>
        </div>
      </div>

      <form onSubmit={submitManual} className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-coal">Mark Attendance</h3>
        {!canMarkAttendance && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Assign this worker to a project before marking attendance.
          </p>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {assignedProjects.length > 1 ? (
            <select className={inputClass} name="project" required defaultValue="">
              <option value="" disabled>
                Select project
              </option>
              {assignedProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          ) : assignedProjects.length === 1 ? (
            <div className={`${inputClass} bg-gray-50 text-sm text-gray-700`}>
              Project: {assignedProjects[0].code} - {assignedProjects[0].name}
            </div>
          ) : null}
          <input className={inputClass} name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          <input className={inputClass} name="punch_in_time" type="time" />
          <input className={inputClass} name="punch_out_time" type="time" />
          <select className={inputClass} name="attendance_mark" defaultValue="PRESENT">
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half Day</option>
          </select>
          <input className={inputClass} name="extra_hours" type="number" min="0" step="0.5" placeholder="Extra hours (optional)" />
          <input className={inputClass} name="notes" placeholder="Notes (optional)" />
        </div>
        <button className={`${btnPrimaryClass} mt-3`} disabled={manual.isPending || !canMarkAttendance}>
          {manual.isPending ? "Saving..." : "Save Attendance"}
        </button>
      </form>
    </section>
  );
}

export function WorkerAttendanceHistoryPage({ workerId }: { workerId: number }) {
  const summary = useQuery({
    queryKey: ["labour-summary", workerId],
    queryFn: () => api.labourWorkerSummary(workerId),
  });

  const attendance = useQuery({
    queryKey: ["attendance", "labour", summary.data?.profile.user_id],
    queryFn: () => api.attendance(undefined, undefined, summary.data!.profile.user_id),
    enabled: Boolean(summary.data?.profile.user_id),
  });

  if (summary.isLoading || attendance.isLoading) {
    return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading attendance history...</p>;
  }
  if (!summary.data) {
    return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Worker not found.</p>;
  }

  const profile = summary.data.profile;
  const records = attendance.data?.results ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/workers/${workerId}`} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-coal shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
        <p className="text-sm text-gray-600">{profile.full_name} · {records.length} records</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-coal">Attendance History</h2>
          <p className="text-xs text-gray-500">All punch records with status and approval</p>
        </div>
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Punch In</th>
              <th className="px-4 py-2.5">Punch Out</th>
              <th className="px-4 py-2.5">Mark</th>
              <th className="px-4 py-2.5">Hours</th>
              <th className="px-4 py-2.5">Extra Hrs</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Approval</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {records.map((record, i) => (
              <DataTableRow key={record.id} zebra={i % 2 === 1}>
                <DataTableCell className="font-medium text-gray-900">{formatDate(record.punch_in_at)}</DataTableCell>
                <DataTableCell>{record.punch_in_at ? new Date(record.punch_in_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : "—"}</DataTableCell>
                <DataTableCell>{record.punch_out_at ? new Date(record.punch_out_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : "—"}</DataTableCell>
                <DataTableCell>
                  <Badge tone={markTone(record.attendance_mark)}>{record.attendance_mark || "PRESENT"}</Badge>
                </DataTableCell>
                <DataTableCell>{record.working_hours}h</DataTableCell>
                <DataTableCell>{record.extra_hours ? `${record.extra_hours}h` : "—"}</DataTableCell>
                <DataTableCell>{record.project_name || "—"}</DataTableCell>
                <DataTableCell>
                  <Badge tone={approvalTone(record.approval_status)}>{record.approval_status}</Badge>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        {!records.length && <p className="px-4 py-8 text-center text-sm text-gray-500">No attendance records yet.</p>}
      </div>
    </section>
  );
}

export function BulkAttendancePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");

  const workers = useQuery({
    queryKey: ["labour-workers"],
    queryFn: () => api.labourWorkers({ ordering: "user__first_name" }),
  });

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects,
  });

  const bulk = useMutation({
    mutationFn: api.bulkAttendance,
    onSuccess: (result) => {
      if (result.skipped_count > 0 && result.skipped?.length) {
        const reasons = result.skipped
          .map((item) => {
            const worker = rows.find((w) => w.user_id === item.labour_id);
            const name = worker?.full_name || `Worker #${item.labour_id}`;
            return `${name}: ${item.error}`;
          })
          .join("; ");
        setMessage(
          result.created_count > 0
            ? `Marked attendance for ${result.created_count} workers. Skipped ${result.skipped_count}: ${reasons}`
            : `Could not mark attendance. Skipped ${result.skipped_count}: ${reasons}`,
        );
      } else {
        setMessage(`Marked attendance for ${result.created_count} workers.`);
      }
      setSelected([]);
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Bulk attendance failed."),
  });

  const rows = workers.data?.results ?? [];
  const allUserIds = useMemo(() => rows.map((w) => w.user_id), [rows]);
  const projectList = projects.data?.results ?? [];
  const selectedWorkers = rows.filter((worker) => selected.includes(worker.user_id));
  const needsProjectPick = selectedWorkers.some((worker) => (worker.assigned_projects?.length ?? 0) > 1);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) {
      setMessage("Select at least one worker.");
      return;
    }
    const unassigned = selectedWorkers.filter((worker) => !(worker.assigned_projects?.length ?? 0));
    if (unassigned.length) {
      setMessage(
        `${unassigned.map((worker) => worker.full_name).join(", ")} ${unassigned.length === 1 ? "is" : "are"} not assigned to any project.`,
      );
      return;
    }
    const form = new FormData(event.currentTarget);
    const projectValue = form.get("project");
    if (needsProjectPick && !projectValue) {
      setMessage("Select a project because at least one selected worker is on multiple projects.");
      return;
    }
    bulk.mutate({
      labour_ids: selected,
      project: projectValue ? Number(projectValue) : undefined,
      date: String(form.get("date")),
      punch_in_time: String(form.get("punch_in_time") || "") || undefined,
      punch_out_time: String(form.get("punch_out_time") || "") || undefined,
      attendance_mark: String(form.get("attendance_mark")) as "PRESENT" | "ABSENT" | "HALF_DAY",
      extra_hours: Number(form.get("extra_hours") || 0) || undefined,
      notes: String(form.get("notes") || ""),
    });
  }

  return (
    <section className="space-y-4">
      <Link href="/workers" className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-coal shadow-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to labour list
      </Link>

      <div>
        <p className="text-xs text-gray-500">Select workers and apply the same attendance in one action.</p>
      </div>

      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-coal">Select Labour ({selected.length})</h3>
            <button
              type="button"
              className="text-sm font-bold text-orange-600"
              onClick={() => setSelected(selected.length === allUserIds.length ? [] : allUserIds)}
            >
              {selected.length === allUserIds.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {rows.map((worker) => (
              <label key={worker.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-cement p-3">
                <input type="checkbox" checked={selected.includes(worker.user_id)} onChange={() => toggle(worker.user_id)} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-coal">{worker.full_name}</p>
                  <p className="text-xs text-gray-500">{worker.mobile_number}</p>
                  {worker.assigned_projects?.length ? (
                    <p className="mt-1 text-xs text-violet-700">
                      {worker.assigned_projects.map((project) => `${project.code} · ${project.name}`).join(" | ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">No project assigned</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <h3 className="font-black text-coal">Attendance Details</h3>
          <div className="mt-4 grid gap-4">
            {needsProjectPick && (
              <select className={inputClass} name="project" required defaultValue="">
                <option value="" disabled>
                  Select project
                </option>
                {projectList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            )}
            <input className={inputClass} name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            <input className={inputClass} name="punch_in_time" type="time" defaultValue="09:00" />
            <input className={inputClass} name="punch_out_time" type="time" defaultValue="18:00" />
            <select className={inputClass} name="attendance_mark" defaultValue="PRESENT">
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
            <input className={inputClass} name="extra_hours" type="number" min="0" step="0.5" placeholder="Extra hours (optional)" />
            <input className={inputClass} name="notes" placeholder="Notes (optional)" />
          </div>
          <button className={`${btnPrimaryClass} mt-4 w-full`} disabled={bulk.isPending}>
            {bulk.isPending ? "Saving..." : "Apply to Selected Workers"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function SupervisorProfilePage({ supervisorId }: { supervisorId: number }) {
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const summary = useQuery({
    queryKey: ["supervisor-profile", supervisorId],
    queryFn: () => api.supervisorProfile(supervisorId),
  });

  const monthly = useQuery({
    queryKey: ["monthly-attendance", supervisorId, calendarMonth, calendarYear],
    queryFn: () => api.monthlyAttendance(calendarMonth, calendarYear, supervisorId),
  });

  const attendance = useQuery({
    queryKey: ["attendance", "supervisor", supervisorId],
    queryFn: () => api.attendance(undefined, undefined, supervisorId),
  });

  if (summary.isLoading) return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading...</p>;
  if (!summary.data) return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supervisor not found.</p>;

  const profile = summary.data.profile;
  const stats = summary.data.attendance_stats;
  const records = attendance.data?.results ?? [];

  return (
    <section className="space-y-4">
      <Link href="/people" className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-coal shadow-sm">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Supervisor Profile</p>
          <h2 className="mt-1 text-base font-semibold text-coal">{profile.full_name}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Mobile</p><p className="font-bold">{profile.mobile_number}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Username</p><p className="font-bold">{profile.username}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Working Days</p><p className="font-bold">{stats.total_present_days}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Working Hours</p><p className="font-bold">{stats.total_working_hours}h</p></div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <CompactCalendar
            data={monthly.data}
            month={calendarMonth}
            year={calendarYear}
            onPrev={() => {
              const d = new Date(calendarYear, calendarMonth - 2, 1);
              setCalendarMonth(d.getMonth() + 1);
              setCalendarYear(d.getFullYear());
            }}
            onNext={() => {
              const d = new Date(calendarYear, calendarMonth, 1);
              setCalendarMonth(d.getMonth() + 1);
              setCalendarYear(d.getFullYear());
            }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-coal">Attendance History</h3>
        <div className="mt-4 space-y-2">
          {records.map((record) => (
            <div key={record.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-gray-50 p-3 text-sm">
              <p className="font-bold">{formatDateTime(record.punch_in_at)}</p>
              <p>{record.working_hours}h · {record.approval_status}</p>
            </div>
          ))}
          {!records.length && <p className="text-gray-500">No attendance records.</p>}
        </div>
      </div>
    </section>
  );
}

export function SupervisorAttendancePage() {
  const user = useAppSelector((state) => state.auth.user);
  const [message, setMessage] = useState("");
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const current = useQuery({ queryKey: ["current-attendance"], queryFn: api.currentAttendance, refetchInterval: 15000 });

  const punchIn = useMutation({
    mutationFn: () => {
      if (!selectedProject) throw new Error("Select a project.");
      return api.supervisorPunchIn({ project: selectedProject });
    },
    onSuccess: () => setMessage("Punched in. Awaiting Super Admin approval after punch out."),
    onError: (err) => setMessage(err instanceof Error ? err.message : "Punch in failed."),
  });

  const punchOut = useMutation({
    mutationFn: () => api.supervisorPunchOut({}),
    onSuccess: () => setMessage("Punched out. Awaiting Super Admin approval."),
    onError: (err) => setMessage(err instanceof Error ? err.message : "Punch out failed."),
  });

  const projectList = projects.data?.results ?? [];
  const active = current.data?.active;

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Timer className="h-6 w-6 text-safety" />
          <div>
            <h2 className="text-base font-semibold text-coal">Supervisor Attendance</h2>
            <p className="text-sm text-gray-500">Punch in/out requires Super Admin approval.</p>
          </div>
        </div>
        {message && <p className="mt-4 rounded-2xl bg-safety/15 px-4 py-3 text-sm font-semibold text-coal">{message}</p>}

        {!active ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <select className={inputClass} value={selectedProject ?? ""} onChange={(e) => setSelectedProject(Number(e.target.value))}>
              <option value="">Select project</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => punchIn.mutate()} className="rounded-2xl bg-green-600 px-5 py-3 font-bold text-white" disabled={punchIn.isPending}>
              Punch In
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-gray-600">
              On site since {formatDateTime(current.data?.attendance?.punch_in_at)} · {current.data?.attendance?.project_name}
            </p>
            <button type="button" onClick={() => punchOut.mutate()} className="mt-4 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white" disabled={punchOut.isPending}>
              Punch Out
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
