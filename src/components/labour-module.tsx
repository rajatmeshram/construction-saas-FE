"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  History,
  Timer,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import { useTablePage } from "@/lib/pagination";
import type {
  AssignedProject,
  AttendanceRecord,
  LabourProfile,
  MonthlyAttendance,
  Project,
  Salary,
  SiteAssignmentHistoryItem,
} from "@/lib/types";
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
  TabBar,
  TablePagination,
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

function formatAssignmentWhen(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SiteAssignmentHistoryPanel({ rows }: { rows?: SiteAssignmentHistoryItem[] }) {
  const history = rows ?? [];
  return (
    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
      <p className="text-[10px] font-bold uppercase text-gray-500">Site assignment history</p>
      <p className="mt-1 text-xs text-gray-500">
        Attendance is saved on this employee’s profile. Site history shows where they were assigned over time.
      </p>
      {history.length ? (
        <ul className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
          {history.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <Link href={`/projects/${row.project_id}`} className="font-medium text-violet-700 hover:underline">
                  {row.project_code} · {row.project_name}
                </Link>
                <p className="text-xs text-gray-500">
                  {formatAssignmentWhen(row.started_at)}
                  {" → "}
                  {row.is_current ? "Present" : formatAssignmentWhen(row.ended_at)}
                </p>
              </div>
              <Badge tone={row.is_current ? "green" : "gray"}>{row.is_current ? "Current" : "Past"}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-amber-700">No site assignment history yet.</p>
      )}
    </div>
  );
}

function formatPeriod(start?: string, end?: string) {
  if (!start || !end) return "—";
  const from = new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const to = new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return `${from} – ${to}`;
}

function markTone(mark?: AttendanceRecord["attendance_mark"], workday?: number): "green" | "red" | "amber" {
  if (mark === "ABSENT" || workday === 0) return "red";
  if (mark === "HALF_DAY" || workday === 0.5) return "amber";
  return "green";
}

function salaryStatusTone(status: Salary["payment_status"]): "green" | "amber" {
  return status === "PAID" ? "green" : "amber";
}

function resolveWorkdayValue(dayData?: MonthlyAttendance["days"][string]): number | undefined {
  if (!dayData) return undefined;
  if (dayData.workday_value != null) return Number(dayData.workday_value);
  if (dayData.attendance_mark === "ABSENT") return 0;
  if (dayData.attendance_mark === "HALF_DAY") return 0.5;
  if (dayData.present) return 1;
  return undefined;
}

function formatWorkdayValue(value?: number) {
  if (value == null) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function designationLabel(designation?: string) {
  if (!designation) return "—";
  if (designation === "LABOUR") return "Labour";
  if (designation === "DRIVER") return "Driver";
  if (designation === "OFFICE_STAFF") return "Office Staff";
  if (designation === "SUPERVISOR") return "Supervisor";
  return designation;
}

const BUILTIN_DESIGNATIONS = [
  { value: "LABOUR", label: "Labour" },
  { value: "DRIVER", label: "Driver" },
  { value: "OFFICE_STAFF", label: "Office Staff" },
] as const;

const CUSTOM_DESIGNATION_VALUE = "__custom__";

type DirectoryRow = {
  key: string;
  kind: "labour" | "supervisor";
  id: number;
  userId: number;
  full_name: string;
  mobile_number: string | null;
  email?: string | null;
  designation: string;
  designationCode: string;
  salary: string | null;
  daily_salary: string | null;
  resolved_daily_wage: string | null;
  status: "ACTIVE" | "INACTIVE";
  joining_date: string | null;
  assigned_projects: AssignedProject[];
  href: string;
  wageFromProfile?: boolean;
};

function resolveDesignationChoice(code: string): { choice: string; custom: string } {
  if (!code) return { choice: "LABOUR", custom: "" };
  return { choice: code, custom: "" };
}

function calendarDayStyle(workday?: number, hasEntry?: boolean) {
  if (!hasEntry || workday == null) return "bg-cement text-gray-400";
  if (workday === 0) return "bg-red-500 text-white";
  if (workday === 0.5) return "bg-amber-400 text-white";
  if (workday >= 2.5) return "bg-emerald-700 text-white";
  if (workday >= 2) return "bg-emerald-600 text-white";
  if (workday >= 1.5) return "bg-green-600 text-white";
  return "bg-green-500 text-white";
}

function calendarDayLabel(day: number, workday?: number, hasEntry?: boolean) {
  if (!hasEntry || workday == null) return String(day);
  if (workday === 0) return "A";
  return formatWorkdayValue(workday);
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
            {data?.present_days ?? 0} workdays · {data?.total_hours ?? 0}h
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
          const workday = resolveWorkdayValue(dayData);
          const monthShort = new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "short" }).toLowerCase();
          return (
            <div
              key={key}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black ${calendarDayStyle(workday, Boolean(dayData))}`}
              title={
                dayData && workday != null
                  ? `${day} ${monthShort} - ${formatWorkdayValue(workday)}day`
                  : "No attendance"
              }
            >
              {calendarDayLabel(day, workday, Boolean(dayData))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkersListPage() {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [nameSearch, setNameSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [designationChoice, setDesignationChoice] = useState("LABOUR");
  const [customDesignation, setCustomDesignation] = useState("");
  const [editTarget, setEditTarget] = useState<DirectoryRow | null>(null);
  const [editError, setEditError] = useState("");
  const [editDesignationChoice, setEditDesignationChoice] = useState("LABOUR");
  const [editCustomDesignation, setEditCustomDesignation] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [assigningKey, setAssigningKey] = useState<string | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const workers = useQuery({
    queryKey: ["labour-workers", nameSearch],
    queryFn: () => api.labourWorkers({ name: nameSearch || undefined, ordering: "user__first_name" }),
  });

  const supervisors = useQuery({
    queryKey: ["supervisors", "workers-directory"],
    queryFn: api.supervisors,
    enabled: isSuperAdmin,
  });

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects,
  });

  const wageProfiles = useQuery({
    queryKey: ["salary-profiles", "workers-directory"],
    queryFn: () => api.salaryProfiles(),
  });

  const wageByUserId = useMemo(() => {
    const map = new Map<number, { monthly: string; daily: string }>();
    for (const profile of wageProfiles.data?.results ?? []) {
      map.set(profile.labour, {
        monthly: profile.monthly_salary,
        daily: profile.daily_wage,
      });
    }
    return map;
  }, [wageProfiles.data?.results]);

  const createWorker = useMutation({
    mutationFn: api.createLabourWorker,
    onSuccess: () => {
      setMessage("Employee created.");
      setCreateError("");
      setCreateOpen(false);
      setDesignationChoice("LABOUR");
      setCustomDesignation("");
      createFormRef.current?.reset();
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Create failed."),
  });

  const createSupervisor = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      setMessage("Supervisor created.");
      setCreateError("");
      setCreateOpen(false);
      setDesignationChoice("LABOUR");
      setCustomDesignation("");
      createFormRef.current?.reset();
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => setCreateError(err instanceof Error ? err.message : "Create failed."),
  });

  const updateWorker = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof api.updateLabourWorker>[1] }) =>
      api.updateLabourWorker(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["labour-summary"] });
    },
    onError: (err) => setEditError(err instanceof Error ? err.message : "Update failed."),
  });

  const importWorkers = useMutation({
    mutationFn: api.importLabourWorkers,
    onSuccess: (result) => {
      setMessage(`Imported ${result.created_count} workers. Skipped ${result.skipped_count}.`);
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Import failed."),
  });

  const deleteWorker = useMutation({
    mutationFn: api.deleteLabourWorker,
    onSuccess: () => {
      setMessage("Employee removed.");
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Remove failed."),
  });

  const deleteSupervisor = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => {
      setMessage("Supervisor removed.");
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Remove failed."),
  });

  const bulkDeleteWorkers = useMutation({
    mutationFn: api.bulkDeleteLabourWorkers,
    onSuccess: (result) => {
      if (result.skipped_count > 0) {
        const reasons = result.skipped.map((item) => `#${item.id}: ${item.error}`).join("; ");
        setMessage(
          result.deleted_count > 0
            ? `Removed ${result.deleted_count} workers. Skipped ${result.skipped_count}: ${reasons}`
            : `Could not remove workers. Skipped ${result.skipped_count}: ${reasons}`,
        );
      } else {
        setMessage(`Removed ${result.deleted_count} workers.`);
      }
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Bulk remove failed."),
  });

  const bulkDeleteSupervisors = useMutation({
    mutationFn: api.bulkDeleteSupervisors,
    onSuccess: (result) => {
      setMessage(`Removed ${result.deleted_count} supervisor${result.deleted_count === 1 ? "" : "s"}.`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Bulk remove failed."),
  });

  const assignProject = useMutation({
    mutationFn: async ({
      userId,
      kind,
      projectId,
    }: {
      userId: number;
      kind: "labour" | "supervisor";
      projectId: number | null;
    }) => {
      const field = kind === "supervisor" ? "supervisors" : "labours";
      const working: Project[] = (projects.data?.results ?? []).map((project) => ({
        ...project,
        labours: [...(project.labours ?? [])],
        supervisors: [...(project.supervisors ?? [])],
      }));
      for (const project of working) {
        const current = project[field];
        const shouldHave = projectId !== null && project.id === projectId;
        const next = shouldHave
          ? kind === "supervisor"
            ? [userId]
            : current.includes(userId)
              ? current
              : [...current, userId]
          : current.filter((id) => id !== userId);
        const unchanged =
          next.length === current.length && next.every((id, index) => id === current[index]);
        if (unchanged) continue;
        await api.updateProject(project.id, { [field]: next });
        project[field] = next;
      }
    },
    onSuccess: () => {
      setMessage("Project assignment updated.");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Project assignment failed."),
  });

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const mobile = String(form.get("mobile_number") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const salary = String(form.get("salary") ?? "") || "0";
    const dailySalary = String(form.get("daily_salary") ?? "") || null;

    let designation = designationChoice;
    if (designationChoice === CUSTOM_DESIGNATION_VALUE) {
      designation = customDesignation.trim();
      if (!designation) {
        setCreateError("Enter a new role name.");
        return;
      }
    }

    if (designation === "SUPERVISOR") {
      if (!isSuperAdmin) {
        setCreateError("Only Super Admin can add supervisors.");
        return;
      }
      const parts = fullName.split(/\s+/, 2);
      const usernameBase = (mobile || fullName.replace(/\s+/g, "").toLowerCase() || `sup${Date.now()}`).slice(0, 140);
      const password =
        mobile.length >= 8 ? mobile : `Sup${Date.now().toString().slice(-8)}`;
      createSupervisor.mutate({
        username: usernameBase,
        password,
        first_name: parts[0] || "Supervisor",
        last_name: parts[1] || "",
        email,
        mobile_number: mobile || "",
        role: "SUPERVISOR",
        salary,
        daily_salary: dailySalary,
      });
      return;
    }

    const projectField = String(form.get("project") ?? "");
    const projectId = projectField ? Number(projectField) : undefined;
    createWorker.mutate({
      full_name: fullName,
      mobile_number: mobile,
      email: email || undefined,
      salary,
      daily_salary: dailySalary,
      designation,
      status: String(form.get("status") ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
      joining_date: String(form.get("joining_date") ?? "") || undefined,
      project: Number.isFinite(projectId) ? projectId : undefined,
    });
  }

  function closeCreateModal() {
    setCreateOpen(false);
    setCreateError("");
    setDesignationChoice("LABOUR");
    setCustomDesignation("");
  }

  function openEditModal(row: DirectoryRow) {
    if (row.kind === "supervisor" && !isSuperAdmin) return;
    const resolved = resolveDesignationChoice(row.designationCode);
    setEditTarget(row);
    setEditError("");
    setEditDesignationChoice(row.kind === "supervisor" ? "SUPERVISOR" : resolved.choice);
    setEditCustomDesignation(resolved.custom);
  }

  function closeEditModal() {
    setEditTarget(null);
    setEditError("");
    setEditDesignationChoice("LABOUR");
    setEditCustomDesignation("");
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setEditError("");
    const form = new FormData(event.currentTarget);
    const projectField = String(form.get("project") ?? "");
    const projectId = projectField ? Number(projectField) : null;
    const currentProjectId =
      editTarget.assigned_projects.length === 1 ? editTarget.assigned_projects[0].id : null;

    try {
      if (editTarget.kind === "supervisor") {
        if (!isSuperAdmin) {
          setEditError("Only Super Admin can edit supervisors.");
          return;
        }
        await api.updateUser(editTarget.userId, {
          full_name: String(form.get("full_name") ?? "").trim(),
          mobile_number: String(form.get("mobile_number") ?? "").trim(),
          salary: String(form.get("salary") ?? "") || "0",
          daily_salary: String(form.get("daily_salary") ?? "") || null,
        });
        if (projectId !== currentProjectId) {
          await assignProject.mutateAsync({
            userId: editTarget.userId,
            kind: "supervisor",
            projectId: Number.isFinite(projectId) ? projectId : null,
          });
        }
        queryClient.invalidateQueries({ queryKey: ["supervisors"] });
        queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
        queryClient.invalidateQueries({ queryKey: ["supervisor-profile"] });
      } else {
        let designation = editDesignationChoice;
        if (editDesignationChoice === CUSTOM_DESIGNATION_VALUE) {
          designation = editCustomDesignation.trim();
          if (!designation) {
            setEditError("Enter a new role name.");
            return;
          }
        }
        await updateWorker.mutateAsync({
          id: editTarget.id,
          payload: {
            full_name: String(form.get("full_name") ?? "").trim(),
            mobile_number: String(form.get("mobile_number") ?? "").trim(),
            salary: String(form.get("salary") ?? "") || "0",
            daily_salary: String(form.get("daily_salary") ?? "") || null,
            designation,
            status: String(form.get("status") ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
            joining_date: String(form.get("joining_date") ?? "") || null,
          },
        });
        if (projectId !== currentProjectId) {
          await assignProject.mutateAsync({
            userId: editTarget.userId,
            kind: "labour",
            projectId: Number.isFinite(projectId) ? projectId : null,
          });
        }
      }
      setMessage(editTarget.kind === "supervisor" ? "Supervisor updated." : "Employee updated.");
      closeEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  const projectList = projects.data?.results ?? [];

  const designationOptions = useMemo(() => {
    const labels = new Set<string>(BUILTIN_DESIGNATIONS.map((item) => item.label));
    for (const worker of workers.data?.results ?? []) {
      labels.add(designationLabel(worker.designation));
    }
    if (isSuperAdmin) labels.add("Supervisor");
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [workers.data?.results, isSuperAdmin]);

  const rows = useMemo(() => {
    const labourRows: DirectoryRow[] = (workers.data?.results ?? []).map((worker) => {
      const wage = wageByUserId.get(worker.user_id);
      return {
        key: `labour-${worker.id}`,
        kind: "labour" as const,
        id: worker.id,
        userId: worker.user_id,
        full_name: worker.full_name,
        mobile_number: worker.mobile_number,
        email: worker.email,
        designation: designationLabel(worker.designation),
        designationCode: worker.designation || "LABOUR",
        salary: wage?.monthly ?? worker.salary,
        daily_salary: wage?.daily ?? worker.daily_salary,
        resolved_daily_wage: wage?.daily ?? worker.resolved_daily_wage,
        status: worker.status ?? "ACTIVE",
        joining_date: worker.joining_date ?? null,
        assigned_projects: worker.assigned_projects ?? [],
        href: `/workers/${worker.id}`,
        wageFromProfile: Boolean(wage),
      };
    });

    const name = nameSearch.trim().toLowerCase();
    let combined: DirectoryRow[] = labourRows;

    if (isSuperAdmin) {
      const supervisorRows: DirectoryRow[] = (supervisors.data ?? [])
        .filter((supervisor) => {
          const fullName = (supervisor.full_name || supervisor.username || "").toLowerCase();
          if (name && !fullName.includes(name)) return false;
          return true;
        })
        .map((supervisor) => {
          const wage = wageByUserId.get(supervisor.id);
          return {
            key: `supervisor-${supervisor.id}`,
            kind: "supervisor" as const,
            id: supervisor.id,
            userId: supervisor.id,
            full_name: supervisor.full_name || supervisor.username,
            mobile_number: supervisor.mobile_number,
            designation: "Supervisor",
            designationCode: "SUPERVISOR",
            salary: wage?.monthly ?? null,
            daily_salary: wage?.daily ?? null,
            resolved_daily_wage: wage?.daily ?? null,
            status: "ACTIVE" as const,
            joining_date: null,
            assigned_projects: supervisor.assigned_projects ?? [],
            href: `/supervisors/${supervisor.id}`,
            wageFromProfile: Boolean(wage),
          };
        });
      combined = [...labourRows, ...supervisorRows].sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    return combined.filter((row) => {
      if (designationFilter !== "all" && row.designation !== designationFilter) return false;
      if (siteFilter === "unassigned") return !row.assigned_projects.length;
      if (siteFilter !== "all") {
        const siteId = Number(siteFilter);
        return row.assigned_projects.some((project) => project.id === siteId);
      }
      return true;
    });
  }, [
    workers.data?.results,
    supervisors.data,
    isSuperAdmin,
    nameSearch,
    designationFilter,
    siteFilter,
    wageByUserId,
  ]);

  const workersPage = useTablePage(rows, {
    pageSize: 100,
    resetKey: `${nameSearch}-${designationFilter}-${siteFilter}-${isSuperAdmin}`,
  });
  const pageIds = workersPage.pageRows.map((worker) => worker.key);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const deleting =
    deleteWorker.isPending ||
    deleteSupervisor.isPending ||
    bulkDeleteWorkers.isPending ||
    bulkDeleteSupervisors.isPending;

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  function togglePage() {
    setSelected((prev) => {
      if (allPageSelected) return prev.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...prev, ...pageIds]));
    });
  }

  function confirmRemoveOne(row: DirectoryRow) {
    if (!window.confirm(`Remove ${row.full_name}? This cannot be undone.`)) return;
    if (row.kind === "supervisor") deleteSupervisor.mutate(row.id);
    else deleteWorker.mutate(row.id);
  }

  function confirmRemoveSelected() {
    if (!selected.length) {
      setMessage("Select at least one employee to remove.");
      return;
    }
    if (!window.confirm(`Remove ${selected.length} selected employee${selected.length === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    const labourIds = selected.filter((key) => key.startsWith("labour-")).map((key) => Number(key.replace("labour-", "")));
    const supervisorIds = selected.filter((key) => key.startsWith("supervisor-")).map((key) => Number(key.replace("supervisor-", "")));
    if (labourIds.length) bulkDeleteWorkers.mutate(labourIds);
    if (supervisorIds.length) bulkDeleteSupervisors.mutate(supervisorIds);
  }

  return (
    <section className="space-y-4">
      {message && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Toolbar>
          <div className="flex flex-nowrap items-center gap-2">
            <input
              className={`${inputClass} !w-36 shrink-0 py-1.5`}
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="Search by name"
              aria-label="Search by name"
            />
            <select
              className={`${inputClass} !w-36 shrink-0 py-1.5`}
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              aria-label="Filter by designation"
            >
              <option value="all">All designations</option>
              {designationOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={`${inputClass} !w-40 shrink-0 py-1.5`}
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              aria-label="Filter by site"
            >
              <option value="all">All sites</option>
              <option value="unassigned">Unassigned</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ? `${project.code} · ${project.name}` : project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                disabled={deleting}
                onClick={confirmRemoveSelected}
              >
                <Trash2 className="h-4 w-4" />
                {bulkDeleteWorkers.isPending ? "Removing..." : `Remove selected (${selected.length})`}
              </button>
            )}
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
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className={btnPrimaryClass}
              onClick={() => {
                setCreateError("");
                setDesignationChoice("LABOUR");
                setCustomDesignation("");
                setCreateOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Add Employee
            </button>
          </div>
        </Toolbar>

        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allPageSelected}
                  onChange={togglePage}
                  disabled={!pageIds.length}
                />
              </th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Mobile</th>
              <th className="px-4 py-2.5">Designation</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Monthly</th>
              <th className="px-4 py-2.5">Per day</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {workersPage.pageRows.map((worker, i) => {
              const assigned = worker.assigned_projects;
              const projectValue =
                assigned.length === 1 ? String(assigned[0].id) : assigned.length === 0 ? "" : "multi";
              const projectBusy = assigningKey === worker.key;
              return (
              <DataTableRow key={worker.key} zebra={i % 2 === 1}>
                <DataTableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select ${worker.full_name}`}
                    checked={selected.includes(worker.key)}
                    onChange={() => toggle(worker.key)}
                  />
                </DataTableCell>
                <DataTableCell className="font-medium text-gray-900">{worker.full_name}</DataTableCell>
                <DataTableCell>{worker.mobile_number || "—"}</DataTableCell>
                <DataTableCell>{worker.designation}</DataTableCell>
                <DataTableCell>
                  <select
                    className={`${inputClass} min-w-[10rem] py-1.5 text-sm`}
                    aria-label={`Project for ${worker.full_name}`}
                    disabled={projectBusy || projects.isLoading || (worker.kind === "supervisor" && !isSuperAdmin)}
                    value={projectValue}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "multi") return;
                      const nextId = raw === "" ? null : Number(raw);
                      if (assigned.length === 1 && nextId === assigned[0].id) return;
                      if (assigned.length === 0 && nextId === null) return;
                      setAssigningKey(worker.key);
                      assignProject.mutate(
                        { userId: worker.userId, kind: worker.kind, projectId: nextId },
                        { onSettled: () => setAssigningKey(null) },
                      );
                    }}
                  >
                    <option value="">Unassigned</option>
                    {assigned.length > 1 ? (
                      <option value="multi" disabled>
                        Multiple ({assigned.length}) — choose one
                      </option>
                    ) : null}
                    {projectList.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code ? `${project.code} · ${project.name}` : project.name}
                      </option>
                    ))}
                  </select>
                </DataTableCell>
                <DataTableCell>{worker.salary != null && worker.salary !== "" ? formatCurrency(worker.salary) : "—"}</DataTableCell>
                <DataTableCell>
                  {worker.daily_salary != null && worker.daily_salary !== "" ? (
                    formatCurrency(worker.daily_salary)
                  ) : worker.resolved_daily_wage != null && worker.resolved_daily_wage !== "" ? (
                    <span className="text-gray-500" title="Derived from monthly ÷ 26">
                      {formatCurrency(worker.resolved_daily_wage)}
                      {!worker.wageFromProfile && worker.kind === "labour" ? (
                        <span className="ml-1 text-[10px] uppercase tracking-wide">auto</span>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex items-center gap-3">
                    <Link href={worker.href} className="text-sm font-medium text-violet-700 hover:underline">
                      View
                    </Link>
                    {worker.kind === "labour" || (worker.kind === "supervisor" && isSuperAdmin) ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-violet-700 hover:underline"
                        onClick={() => openEditModal(worker)}
                      >
                        Edit
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
                      disabled={deleting}
                      onClick={() => confirmRemoveOne(worker)}
                    >
                      Remove
                    </button>
                  </div>
                </DataTableCell>
              </DataTableRow>
              );
            })}
            {!rows.length && !workers.isLoading && !(isSuperAdmin && supervisors.isLoading) && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                  No employee records found.
                </td>
              </tr>
            )}
          </DataTableBody>
        </DataTable>
        <TablePagination
          page={workersPage.page}
          totalPages={workersPage.totalPages}
          total={workersPage.total}
          pageSize={workersPage.pageSize}
          from={workersPage.from}
          to={workersPage.to}
          onPageChange={workersPage.setPage}
        />
      </div>

      <Modal
        open={createOpen}
        title="Add Employee"
        subtitle="Create a new worker record"
        onClose={closeCreateModal}
        footer={
          <>
            <button type="button" className={btnSecondaryClass} onClick={closeCreateModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="create-labour-form"
              className={btnPrimaryClass}
              disabled={createWorker.isPending || createSupervisor.isPending}
            >
              {createWorker.isPending || createSupervisor.isPending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form id="create-labour-form" ref={createFormRef} onSubmit={submitCreate}>
          {createError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{createError}</p>
          )}
          <FormRow label="Full name"><input className={inputClass} name="full_name" /></FormRow>
          <FormRow label="Mobile"><input className={inputClass} name="mobile_number" /></FormRow>
          <FormRow label="Email">
            <input className={inputClass} name="email" type="email" placeholder="Optional — for welcome login email" />
          </FormRow>
          <FormRow label="Monthly salary"><input className={inputClass} name="salary" type="number" min="0" step="0.01" /></FormRow>
          <FormRow label="Per day salary">
            <input className={inputClass} name="daily_salary" type="number" min="0" step="0.01" placeholder="Optional — else monthly ÷ 26" />
          </FormRow>
          <FormRow label="Designation / Role">
            <select
              className={inputClass}
              value={designationChoice}
              onChange={(e) => setDesignationChoice(e.target.value)}
            >
              {BUILTIN_DESIGNATIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
              {isSuperAdmin ? <option value="SUPERVISOR">Supervisor</option> : null}
              {designationOptions
                .filter((label) => !BUILTIN_DESIGNATIONS.some((item) => item.label === label) && label !== "Supervisor")
                .map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              <option value={CUSTOM_DESIGNATION_VALUE}>+ Add new role…</option>
            </select>
          </FormRow>
          {designationChoice === CUSTOM_DESIGNATION_VALUE ? (
            <FormRow label="New role name">
              <input
                className={inputClass}
                value={customDesignation}
                onChange={(e) => setCustomDesignation(e.target.value)}
                placeholder="e.g. Mason, Electrician, Welder"
                required
                autoFocus
              />
            </FormRow>
          ) : null}
          <FormRow label="Joining date"><input className={inputClass} name="joining_date" type="date" /></FormRow>
          <FormRow label="Site">
            <select
              className={inputClass}
              name="project"
              defaultValue={projectList.length === 1 ? String(projectList[0].id) : ""}
              required={!isSuperAdmin}
            >
              <option value="">{isSuperAdmin ? "No site (optional)" : "Select site"}</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code ? `${project.code} · ${project.name}` : project.name}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="Status">
            <select className={inputClass} name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </FormRow>
        </form>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        title={editTarget?.kind === "supervisor" ? "Edit Supervisor" : "Edit Employee"}
        subtitle={editTarget ? `Update ${editTarget.full_name}` : "Update record"}
        onClose={closeEditModal}
        footer={
          <>
            <button type="button" className={btnSecondaryClass} onClick={closeEditModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="edit-labour-form"
              className={btnPrimaryClass}
              disabled={updateWorker.isPending || assignProject.isPending}
            >
              {updateWorker.isPending || assignProject.isPending ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        {editTarget ? (
          <form id="edit-labour-form" ref={editFormRef} key={editTarget.key} onSubmit={submitEdit}>
            {editError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{editError}</p>
            )}
            <FormRow label="Full name">
              <input className={inputClass} name="full_name" defaultValue={editTarget.full_name} required />
            </FormRow>
            <FormRow label="Mobile">
              <input className={inputClass} name="mobile_number" defaultValue={editTarget.mobile_number ?? ""} />
            </FormRow>
            <FormRow label="Monthly salary">
              <input
                className={inputClass}
                name="salary"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editTarget.salary ?? "0"}
              />
            </FormRow>
            <FormRow label="Per day salary">
              <input
                className={inputClass}
                name="daily_salary"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editTarget.daily_salary ?? ""}
                placeholder="Optional — else monthly ÷ 26"
              />
            </FormRow>
            {editTarget.kind === "labour" ? (
              <>
                <FormRow label="Designation / Role">
                  <select
                    className={inputClass}
                    value={editDesignationChoice}
                    onChange={(e) => setEditDesignationChoice(e.target.value)}
                  >
                    {BUILTIN_DESIGNATIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                    {Array.from(
                      new Set(
                        (workers.data?.results ?? [])
                          .map((worker) => worker.designation)
                          .filter(
                            (code) =>
                              code &&
                              !BUILTIN_DESIGNATIONS.some((item) => item.value === code) &&
                              code !== "SUPERVISOR",
                          ),
                      ),
                    ).map((code) => (
                      <option key={code} value={code}>
                        {designationLabel(code)}
                      </option>
                    ))}
                    <option value={CUSTOM_DESIGNATION_VALUE}>+ Add new role…</option>
                  </select>
                </FormRow>
                {editDesignationChoice === CUSTOM_DESIGNATION_VALUE ? (
                  <FormRow label="New role name">
                    <input
                      className={inputClass}
                      value={editCustomDesignation}
                      onChange={(e) => setEditCustomDesignation(e.target.value)}
                      placeholder="e.g. Mason, Electrician, Welder"
                      required
                      autoFocus
                    />
                  </FormRow>
                ) : null}
                <FormRow label="Joining date">
                  <input
                    className={inputClass}
                    name="joining_date"
                    type="date"
                    defaultValue={editTarget.joining_date ?? ""}
                  />
                </FormRow>
                <FormRow label="Status">
                  <select className={inputClass} name="status" defaultValue={editTarget.status}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </FormRow>
              </>
            ) : (
              <FormRow label="Designation">
                <input className={inputClass} value="Supervisor" disabled readOnly />
              </FormRow>
            )}
            <FormRow label="Site">
              <select
                className={inputClass}
                name="project"
                defaultValue={
                  editTarget.assigned_projects.length === 1 ? String(editTarget.assigned_projects[0].id) : ""
                }
              >
                <option value="">No site (optional)</option>
                {projectList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `${project.code} · ${project.name}` : project.name}
                  </option>
                ))}
              </select>
            </FormRow>
          </form>
        ) : null}
      </Modal>
    </section>
  );
}

export function WorkerProfilePage({ workerId }: { workerId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDesignationChoice, setEditDesignationChoice] = useState("LABOUR");
  const [editCustomDesignation, setEditCustomDesignation] = useState("");
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

  const deleteWorker = useMutation({
    mutationFn: () => api.deleteLabourWorker(workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
      router.push("/workers");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Remove failed."),
  });

  const updateWorker = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateLabourWorker>[1]) =>
      api.updateLabourWorker(workerId, payload),
    onSuccess: () => {
      setMessage("Employee updated.");
      setEditOpen(false);
      setEditError("");
      queryClient.invalidateQueries({ queryKey: ["labour-summary", workerId] });
      queryClient.invalidateQueries({ queryKey: ["labour-workers"] });
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
    },
    onError: (err) => setEditError(err instanceof Error ? err.message : "Update failed."),
  });

  const salaryRows = workerSalaries.data ?? [];
  const salariesPage = useTablePage(salaryRows, { resetKey: `${salaryMonth}-${salaryYear}-${workerId}` });

  if (summary.isLoading) return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading profile...</p>;
  if (!summary.data) return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Worker not found.</p>;

  const profile = summary.data.profile;
  const stats = summary.data.attendance_stats;
  const assignedProjects = profile.assigned_projects ?? [];
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

  function openEdit() {
    const resolved = resolveDesignationChoice(profile.designation || "LABOUR");
    setEditDesignationChoice(resolved.choice);
    setEditCustomDesignation(resolved.custom);
    setEditError("");
    setEditOpen(true);
  }

  function submitProfileEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError("");
    const form = new FormData(event.currentTarget);
    let designation = editDesignationChoice;
    if (editDesignationChoice === CUSTOM_DESIGNATION_VALUE) {
      designation = editCustomDesignation.trim();
      if (!designation) {
        setEditError("Enter a new role name.");
        return;
      }
    }
    updateWorker.mutate({
      full_name: String(form.get("full_name") ?? "").trim(),
      mobile_number: String(form.get("mobile_number") ?? "").trim(),
      salary: String(form.get("salary") ?? "") || "0",
      daily_salary: String(form.get("daily_salary") ?? "") || null,
      designation,
      status: String(form.get("status") ?? "ACTIVE") as "ACTIVE" | "INACTIVE",
      joining_date: String(form.get("joining_date") ?? "") || null,
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/workers" className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-coal shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to employee list
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnSecondaryClass} onClick={openEdit}>
            Edit Employee
          </button>
          <Link href={`/workers/${workerId}/history`} className={btnSecondaryClass}>
            <History className="h-4 w-4" />
            View Attendance History
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            disabled={deleteWorker.isPending}
            onClick={() => {
              if (!window.confirm(`Remove ${profile.full_name}? This cannot be undone.`)) return;
              deleteWorker.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
            {deleteWorker.isPending ? "Removing..." : "Remove Employee"}
          </button>
        </div>
      </div>

      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-coal">Salary Payments</h3>
              {/* <p className="text-xs text-gray-500">
                {paidSalaries.length} paid · {pendingSalaries.length} pending
                {paidSalaries.length > 0 ? ` · Total paid ${formatCurrency(totalNetPaid)}` : ""}
              </p> */}
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
          <>
          <DataTable>
            <DataTableHead>
              <tr>
                <th className="px-4 py-2.5">Period</th>
                <th className="px-4 py-2.5">Days</th>
                <th className="px-4 py-2.5">Extra Hrs</th>
                <th className="px-4 py-2.5">Gross</th>
                <th className="px-4 py-2.5">Advances</th>
                <th className="px-4 py-2.5">Net Pay</th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {salariesPage.pageRows.map((row, i) => (
                <DataTableRow key={row.id} zebra={i % 2 === 1} onClick={() => setSelectedSalary(row)}>
                  <DataTableCell className="font-medium text-gray-900">{formatPeriod(row.period_start, row.period_end)}</DataTableCell>
                  <DataTableCell>{row.working_days}</DataTableCell>
                  <DataTableCell>{row.overtime_hours}h</DataTableCell>
                  <DataTableCell>{formatCurrency(row.gross_pay)}</DataTableCell>
                  <DataTableCell>{formatCurrency(row.advances)}</DataTableCell>
                  <DataTableCell className="font-medium text-gray-900">{formatCurrency(row.net_pay)}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <TablePagination
            page={salariesPage.page}
            totalPages={salariesPage.totalPages}
            total={salariesPage.total}
            pageSize={salariesPage.pageSize}
            from={salariesPage.from}
            to={salariesPage.to}
            onPageChange={salariesPage.setPage}
          />
          </>
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
                  <dt className="text-gray-600">Working days</dt>
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Employee Profile</p>
          <h2 className="mt-1 text-base font-semibold text-coal">{profile.full_name}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Mobile</p><p className="font-bold">{profile.mobile_number || "—"}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Employee ID</p><p className="font-bold">{profile.employee_id || "—"}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Designation</p><p className="font-bold">{designationLabel(profile.designation)}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Monthly salary</p><p className="font-bold">{formatCurrency(profile.salary)}</p></div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500">Per day</p>
              <p className="font-bold">{formatCurrency(profile.resolved_daily_wage)}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                {profile.daily_salary != null && profile.daily_salary !== "" ? "Set per day" : "From monthly ÷ 26"}
              </p>
            </div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Status</p><p className="font-bold">{profile.status}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Joining Date</p><p className="font-bold">{profile.joining_date || "—"}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Working Hours</p><p className="font-bold">{stats.total_working_hours}h</p></div>
          </div>
          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Current site</p>
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
                No site assigned yet. Assign from Employee directory or Site team.
              </p>
            )}
          </div>
          <SiteAssignmentHistoryPanel rows={summary.data.site_assignment_history} />
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
            <div className="rounded-xl bg-green-50 p-2"><p className="text-[10px] uppercase text-green-800">Workdays</p><p className="font-black text-green-900">{formatDayCount(monthPresentDays)}</p></div>
            <div className="rounded-xl bg-red-50 p-2"><p className="text-[10px] uppercase text-red-800">Absent</p><p className="font-black text-red-900">{monthAbsentDays}</p></div>
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        title="Edit Employee"
        subtitle={`Update ${profile.full_name}`}
        onClose={() => {
          setEditOpen(false);
          setEditError("");
        }}
        footer={
          <>
            <button
              type="button"
              className={btnSecondaryClass}
              onClick={() => {
                setEditOpen(false);
                setEditError("");
              }}
            >
              Cancel
            </button>
            <button type="submit" form="edit-profile-form" className={btnPrimaryClass} disabled={updateWorker.isPending}>
              {updateWorker.isPending ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form id="edit-profile-form" onSubmit={submitProfileEdit}>
          {editError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{editError}</p>
          )}
          <FormRow label="Full name">
            <input className={inputClass} name="full_name" defaultValue={profile.full_name} required />
          </FormRow>
          <FormRow label="Mobile">
            <input className={inputClass} name="mobile_number" defaultValue={profile.mobile_number ?? ""} />
          </FormRow>
          <FormRow label="Monthly salary">
            <input
              className={inputClass}
              name="salary"
              type="number"
              min="0"
              step="0.01"
              defaultValue={salaryProfile?.monthly_salary ?? profile.salary ?? "0"}
            />
          </FormRow>
          <FormRow label="Per day salary">
            <input
              className={inputClass}
              name="daily_salary"
              type="number"
              min="0"
              step="0.01"
              defaultValue={salaryProfile?.daily_wage ?? profile.daily_salary ?? ""}
              placeholder="Optional — else monthly ÷ 26"
            />
          </FormRow>
          <FormRow label="Designation / Role">
            <select
              className={inputClass}
              value={editDesignationChoice}
              onChange={(e) => setEditDesignationChoice(e.target.value)}
            >
              {BUILTIN_DESIGNATIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
              {profile.designation &&
              !BUILTIN_DESIGNATIONS.some((item) => item.value === profile.designation) ? (
                <option value={profile.designation}>{designationLabel(profile.designation)}</option>
              ) : null}
              <option value={CUSTOM_DESIGNATION_VALUE}>+ Add new role…</option>
            </select>
          </FormRow>
          {editDesignationChoice === CUSTOM_DESIGNATION_VALUE ? (
            <FormRow label="New role name">
              <input
                className={inputClass}
                value={editCustomDesignation}
                onChange={(e) => setEditCustomDesignation(e.target.value)}
                placeholder="e.g. Mason, Electrician, Welder"
                required
                autoFocus
              />
            </FormRow>
          ) : null}
          <FormRow label="Joining date">
            <input className={inputClass} name="joining_date" type="date" defaultValue={profile.joining_date ?? ""} />
          </FormRow>
          <FormRow label="Status">
            <select className={inputClass} name="status" defaultValue={profile.status}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </FormRow>
        </form>
      </Modal>
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
    queryFn: () => api.attendance({ labourId: summary.data!.profile.user_id }),
    enabled: Boolean(summary.data?.profile.user_id),
  });

  const records = attendance.data?.results ?? [];
  const recordsPage = useTablePage(records, { resetKey: workerId });

  if (summary.isLoading || attendance.isLoading) {
    return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading attendance history...</p>;
  }
  if (!summary.data) {
    return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Worker not found.</p>;
  }

  const profile = summary.data.profile;

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
          <p className="text-xs text-gray-500">Workday marks and site for each record</p>
        </div>
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Workday</th>
              <th className="px-4 py-2.5">Project</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {recordsPage.pageRows.map((record, i) => (
              <DataTableRow key={record.id} zebra={i % 2 === 1}>
                <DataTableCell className="font-medium text-gray-900">{formatDate(record.punch_in_at)}</DataTableCell>
                <DataTableCell>
                  <Badge tone={markTone(record.attendance_mark, Number(record.workday_value))}>
                    {record.workday_value != null
                      ? Number(record.workday_value) === 0
                        ? "Absent"
                        : `${Number.isInteger(Number(record.workday_value)) ? Number(record.workday_value) : Number(record.workday_value).toFixed(1)} workday${Number(record.workday_value) === 1 ? "" : "s"}`
                      : record.attendance_mark || "PRESENT"}
                  </Badge>
                </DataTableCell>
                <DataTableCell>{record.project_name || "—"}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <TablePagination
          page={recordsPage.page}
          totalPages={recordsPage.totalPages}
          total={recordsPage.total}
          pageSize={recordsPage.pageSize}
          from={recordsPage.from}
          to={recordsPage.to}
          onPageChange={recordsPage.setPage}
        />
        {!records.length && <p className="px-4 py-8 text-center text-sm text-gray-500">No attendance records yet.</p>}
      </div>
    </section>
  );
}

export function BulkAttendancePage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<"labour" | "supervisor">("labour");

  const workers = useQuery({
    queryKey: ["labour-workers"],
    queryFn: () => api.labourWorkers({ ordering: "user__first_name" }),
    enabled: audience === "labour",
  });

  const supervisors = useQuery({
    queryKey: ["supervisors"],
    queryFn: api.supervisors,
    enabled: audience === "supervisor",
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
            const person = people.find((w) => w.id === item.labour_id);
            const name = person?.full_name || `#${item.labour_id}`;
            return `${name}: ${item.error}`;
          })
          .join("; ");
        setMessage(
          result.created_count > 0
            ? `Marked attendance for ${result.created_count}. Skipped ${result.skipped_count}: ${reasons}`
            : `Could not mark attendance. Skipped ${result.skipped_count}: ${reasons}`,
        );
      } else {
        setMessage(`Marked attendance for ${result.created_count}.`);
      }
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Bulk attendance failed."),
  });

  const labourRows = useMemo(
    () =>
      (workers.data?.results ?? []).map((worker) => ({
        id: worker.user_id,
        full_name: worker.full_name,
        mobile_number: worker.mobile_number,
        assigned_projects: worker.assigned_projects ?? [],
      })),
    [workers.data?.results],
  );

  const supervisorRows = useMemo(
    () =>
      (supervisors.data ?? []).map((supervisor) => ({
        id: supervisor.id,
        full_name: supervisor.full_name || supervisor.username,
        mobile_number: supervisor.mobile_number,
        assigned_projects: supervisor.assigned_projects ?? [],
      })),
    [supervisors.data],
  );

  const people = audience === "labour" ? labourRows : supervisorRows;
  const allIds = useMemo(() => people.map((p) => p.id), [people]);
  const projectList = projects.data?.results ?? [];

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) {
      setMessage(`Select at least one ${audience === "labour" ? "employee" : "supervisor"}.`);
      return;
    }
    const form = new FormData(event.currentTarget);
    const projectValue = form.get("project");
    bulk.mutate({
      labour_ids: selected,
      project: projectValue ? Number(projectValue) : undefined,
      date: String(form.get("date")),
      punch_in_time: String(form.get("punch_in_time") || "") || undefined,
      punch_out_time: String(form.get("punch_out_time") || "") || undefined,
      workday_value: Number(form.get("workday_value")),
      extra_hours: Number(form.get("extra_hours") || 0) || undefined,
      notes: String(form.get("notes") || ""),
    });
  }

  return (
    <section className="space-y-4">
      <Link href="/attendance" className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-coal shadow-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to attendance
      </Link>

      <div>
        <h2 className="text-base font-semibold text-coal">Bulk Attendance</h2>
        <p className="text-xs text-gray-500">Select employees or supervisors and apply the same attendance in one action.</p>
      </div>

      <TabBar
        active={audience}
        onChange={(next) => {
          setAudience(next);
          setSelected([]);
          setMessage("");
        }}
        tabs={[
          { id: "labour", label: "Employee", count: labourRows.length || workers.data?.count },
          { id: "supervisor", label: "Supervisors", count: supervisorRows.length },
        ]}
      />

      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-coal">
              Select {audience === "labour" ? "Employee" : "Supervisors"} ({selected.length})
            </h3>
            <button
              type="button"
              className="text-sm font-bold text-orange-600"
              onClick={() => setSelected(selected.length === allIds.length ? [] : allIds)}
            >
              {selected.length === allIds.length ? "Deselect All" : "Select All"}
            </button>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {people.map((person) => (
              <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-cement p-3">
                <input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggle(person.id)} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-coal">{person.full_name}</p>
                  <p className="text-xs text-gray-500">{person.mobile_number}</p>
                  {person.assigned_projects?.length ? (
                    <p className="mt-1 text-xs text-violet-700">
                      {person.assigned_projects.map((project) => `${project.code} · ${project.name}`).join(" | ")}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">No project assigned</p>
                  )}
                </div>
              </label>
            ))}
            {!people.length && (
              <p className="text-sm text-gray-500">
                {audience === "labour" ? "No employees found." : "No supervisors found."}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <h3 className="font-black text-coal">Attendance Details</h3>
          <div className="mt-4 grid gap-4">
            <select className={inputClass} name="project" defaultValue="">
              <option value="">No site (optional)</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
            <input className={inputClass} name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            <input className={inputClass} name="punch_in_time" type="time" defaultValue="09:00" />
            <input className={inputClass} name="punch_out_time" type="time" defaultValue="18:00" />
            <select className={inputClass} name="workday_value" defaultValue="1">
              <option value="0">Absent (0)</option>
              <option value="1">1 workday</option>
              <option value="1.5">1.5 workdays</option>
              <option value="2">2 workdays</option>
              <option value="2.5">2.5 workdays</option>
              <option value="3">3 workdays</option>
            </select>
            <input className={inputClass} name="extra_hours" type="number" min="0" step="0.5" placeholder="Extra hours (optional)" />
            <input className={inputClass} name="notes" placeholder="Notes (optional)" />
          </div>
          <button className={`${btnPrimaryClass} mt-4 w-full`} disabled={bulk.isPending}>
            {bulk.isPending ? "Saving..." : "Apply to Selected"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function SupervisorProfilePage({ supervisorId }: { supervisorId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState("");
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

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects,
    enabled: isSuperAdmin && editOpen,
  });

  const deleteSupervisor = useMutation({
    mutationFn: () => api.deleteUser(supervisorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      router.push("/workers");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Remove failed."),
  });

  const updateSupervisor = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateUser>[1]) => api.updateUser(supervisorId, payload),
    onSuccess: () => {
      setMessage("Supervisor updated.");
      setEditOpen(false);
      setEditError("");
      queryClient.invalidateQueries({ queryKey: ["supervisor-profile", supervisorId] });
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      queryClient.invalidateQueries({ queryKey: ["salary-profiles"] });
    },
    onError: (err) => setEditError(err instanceof Error ? err.message : "Update failed."),
  });

  if (summary.isLoading) return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading...</p>;
  if (!summary.data) return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Supervisor not found.</p>;

  const profile = summary.data.profile;
  const stats = summary.data.attendance_stats;
  const assignedProjects = profile.assigned_projects ?? [];
  const salaryProfile = summary.data.salary_profile;
  const monthPresentDays = monthly.data?.present_days ?? 0;
  const monthAbsentDays = monthly.data?.absent_days ?? 0;
  const formatDayCount = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
  const assignedSiteLabel = assignedProjects.length
    ? assignedProjects.map((p) => (p.code ? `${p.code} · ${p.name}` : p.name)).join(" | ")
    : null;
  const projectList = projects.data?.results ?? [];

  async function submitSupervisorEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSuperAdmin) return;
    setEditError("");
    const form = new FormData(event.currentTarget);
    const projectField = String(form.get("project") ?? "");
    const projectId = projectField ? Number(projectField) : null;
    const currentProjectId = assignedProjects.length === 1 ? assignedProjects[0].id : null;

    try {
      await updateSupervisor.mutateAsync({
        full_name: String(form.get("full_name") ?? "").trim(),
        mobile_number: String(form.get("mobile_number") ?? "").trim(),
        salary: String(form.get("salary") ?? "") || "0",
        daily_salary: String(form.get("daily_salary") ?? "") || null,
      });
      if (projectId !== currentProjectId) {
        const field = "supervisors" as const;
        const working: Project[] = (projects.data?.results ?? []).map((project) => ({
          ...project,
          labours: [...(project.labours ?? [])],
          supervisors: [...(project.supervisors ?? [])],
        }));
        for (const project of working) {
          const current = project[field];
          const shouldHave = projectId !== null && project.id === projectId;
          const next = shouldHave ? [supervisorId] : current.filter((id) => id !== supervisorId);
          const unchanged =
            next.length === current.length && next.every((id, index) => id === current[index]);
          if (unchanged) continue;
          await api.updateProject(project.id, { [field]: next });
        }
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["supervisor-profile", supervisorId] });
        queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/workers" className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-coal shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin ? (
            <button type="button" className={btnSecondaryClass} onClick={() => { setEditError(""); setEditOpen(true); }}>
              Edit Supervisor
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            disabled={deleteSupervisor.isPending}
            onClick={() => {
              if (!window.confirm(`Remove ${profile.full_name}? This cannot be undone.`)) return;
              deleteSupervisor.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
            {deleteSupervisor.isPending ? "Removing..." : "Remove Supervisor"}
          </button>
        </div>
      </div>

      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Supervisor Profile</p>
          <h2 className="mt-1 text-base font-semibold text-coal">{profile.full_name}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Mobile</p><p className="font-bold">{profile.mobile_number || "—"}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Username</p><p className="font-bold">{profile.username}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Monthly salary</p><p className="font-bold">{formatCurrency(salaryProfile?.monthly_salary)}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Per day</p><p className="font-bold">{formatCurrency(salaryProfile?.daily_wage)}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Working Days</p><p className="font-bold">{stats.total_present_days}</p></div>
            <div className="rounded-md bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-500">Working Hours</p><p className="font-bold">{stats.total_working_hours}h</p></div>
          </div>
          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Current site</p>
            {assignedSiteLabel ? (
              <p className="mt-1 text-sm text-coal">{assignedSiteLabel}</p>
            ) : (
              <p className="mt-1 text-sm text-amber-700">No site assigned</p>
            )}
          </div>
          <SiteAssignmentHistoryPanel rows={summary.data.site_assignment_history} />
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
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-green-50 p-2"><p className="text-[10px] uppercase text-green-800">Workdays</p><p className="font-black text-green-900">{formatDayCount(monthPresentDays)}</p></div>
            <div className="rounded-xl bg-red-50 p-2"><p className="text-[10px] uppercase text-red-800">Absent</p><p className="font-black text-red-900">{formatDayCount(monthAbsentDays)}</p></div>
          </div>
        </div>
      </div>

      {isSuperAdmin ? (
        <Modal
          open={editOpen}
          title="Edit Supervisor"
          subtitle={`Update ${profile.full_name}`}
          onClose={() => {
            setEditOpen(false);
            setEditError("");
          }}
          footer={
            <>
              <button
                type="button"
                className={btnSecondaryClass}
                onClick={() => {
                  setEditOpen(false);
                  setEditError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" form="edit-supervisor-form" className={btnPrimaryClass} disabled={updateSupervisor.isPending}>
                {updateSupervisor.isPending ? "Saving..." : "Save changes"}
              </button>
            </>
          }
        >
          <form id="edit-supervisor-form" key={supervisorId} onSubmit={submitSupervisorEdit}>
            {editError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{editError}</p>
            )}
            <FormRow label="Full name">
              <input className={inputClass} name="full_name" defaultValue={profile.full_name} required />
            </FormRow>
            <FormRow label="Mobile">
              <input className={inputClass} name="mobile_number" defaultValue={profile.mobile_number ?? ""} />
            </FormRow>
            <FormRow label="Monthly salary">
              <input
                className={inputClass}
                name="salary"
                type="number"
                min="0"
                step="0.01"
                defaultValue={salaryProfile?.monthly_salary ?? "0"}
              />
            </FormRow>
            <FormRow label="Per day salary">
              <input
                className={inputClass}
                name="daily_salary"
                type="number"
                min="0"
                step="0.01"
                defaultValue={salaryProfile?.daily_wage ?? ""}
                placeholder="Optional — else monthly ÷ 26"
              />
            </FormRow>
            <FormRow label="Designation">
              <input className={inputClass} value="Supervisor" disabled readOnly />
            </FormRow>
            <FormRow label="Site">
              <select
                className={inputClass}
                name="project"
                defaultValue={assignedProjects.length === 1 ? String(assignedProjects[0].id) : ""}
              >
                <option value="">No site (optional)</option>
                {projectList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code ? `${project.code} · ${project.name}` : project.name}
                  </option>
                ))}
              </select>
            </FormRow>
          </form>
        </Modal>
      ) : null}
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
