"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileUp,
  FolderPlus,
  HardHat,
  History,
  ListTodo,
  LogOut,
  Pencil,
  Package,
  ReceiptText,
  ShieldCheck,
  Timer,
  Truck,
  UserPlus,
  Users,
  Wrench,
  Download,
} from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { DashboardCharts } from "@/components/dashboard-charts";
import {
  Field,
  ListItem,
  ListPanel,
  MemberList,
  MemberPicker,
  StatCard,
  Badge,
  ContentCard,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableRow,
  FormRow,
  Modal,
  PageMessage,
  SearchInput,
  SubsectionTitle,
  TabBar,
  Toolbar,
  btnAccentClass,
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
} from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearSession, setSession } from "@/store/auth-slice";
import type {
  AttendanceRecord,
  AuthUser,
  DashboardMetrics,
  Expense,
  FuelLog,
  Machinery,
  Material,
  MaterialStock,
  MachineryUsage,
  MonthlyAttendance,
  OperationsReport,
  Project,
  ProjectDocument,
  ProjectTask,
  Salary,
  UserMini,
  Vendor,
} from "@/lib/types";

type ProjectOption = { id: number; name: string; code: string };
type Paginated<T> = { results?: T[] };
type CurrentAttendance = { active: boolean; attendance?: AttendanceRecord };

function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function attendanceApprovalTone(status: AttendanceRecord["approval_status"]): "green" | "amber" | "red" {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "amber";
}

function attendanceStatusTone(status: AttendanceRecord["status"]): "green" | "gray" {
  return status === "PUNCHED_IN" ? "green" : "gray";
}

function usePosition() {
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => setCoords({}),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  return coords;
}

function SignIn() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = useMutation({
    mutationFn: () => api.login(username, password),
    onSuccess: (session: { access: string; refresh: string; user: AuthUser }) => {
      setError("");
      dispatch(setSession(session));
      router.replace(session.user.role === "LABOUR" ? "/labour" : "/dashboard");
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Login failed"),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gray-100 px-4 py-6">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:grid-cols-2">
        <div className="relative bg-coal p-6 text-white lg:p-8">
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs">
              <HardHat className="h-3.5 w-3.5 text-safety" />
              Construction SaaS
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Hitesh Construction</h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              Project control, labour attendance, payroll, and site operations in one dashboard.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {[
                ["JWT", "Secure login"],
                ["RBAC", "Role access"],
                ["Audit", "Tracked changes"],
              ].map(([title, label]) => (
                <div key={title} className="rounded-md border border-white/10 bg-white/10 p-2.5">
                  <p className="text-sm font-semibold text-safety">{title}</p>
                  <p className="text-[11px] text-white/65">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col justify-center p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-safety">Sign In</p>
          <h2 className="mt-1 text-sm font-semibold text-coal">Welcome back</h2>
          <p className="mt-1 text-xs text-gray-500">Admin, supervisor, or labour account.</p>
          <label className="mt-4 text-xs font-medium text-gray-700">Username</label>
          <input
            className={`${inputClass} mt-1`}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
          <label className="mt-3 text-xs font-medium text-gray-700">Password</label>
          <input
            className={`${inputClass} mt-1`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <button className={`${btnPrimaryClass} mt-5 w-full py-2.5`} disabled={login.isPending}>
            {login.isPending ? "Signing in..." : "Open Dashboard"}
          </button>
        </form>
      </section>
    </main>
  );
}

function mapsLink(lat?: string | number | null, lng?: string | number | null) {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function mediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

function calendarDayStyle(mark?: "PRESENT" | "ABSENT" | "HALF_DAY", hasEntry?: boolean) {
  if (!hasEntry) return "bg-cement text-gray-400";
  if (mark === "ABSENT") return "bg-red-500 text-white";
  if (mark === "HALF_DAY") return "bg-amber-400 text-white";
  return "bg-green-500 text-white";
}

function calendarDayLabel(day: number, mark?: "PRESENT" | "ABSENT" | "HALF_DAY", hasEntry?: boolean, compact?: boolean) {
  if (!hasEntry) return compact ? String(day) : String(day);
  if (mark === "ABSENT") return "A";
  if (mark === "HALF_DAY") return "H";
  return "P";
}

function AttendanceCalendar({
  data,
  month,
  year,
  onPrev,
  onNext,
  compact = false,
}: {
  data?: MonthlyAttendance;
  month: number;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  compact?: boolean;
}) {
  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: compact ? "short" : "long",
    year: "numeric",
  });
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = data?.days_in_month ?? new Date(year, month, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const cellClass = compact ? "h-7 w-7 text-[10px] rounded-md" : "aspect-square rounded-xl text-sm";
  const navBtnClass = compact
    ? "rounded-lg bg-cement px-2 py-0.5 text-xs font-bold text-coal"
    : "rounded-xl bg-cement px-3 py-1 text-sm font-bold text-coal";

  return (
    <div className={compact ? "max-w-xs" : undefined}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onPrev} className={navBtnClass}>
          ←
        </button>
        <div className="text-center">
          <p className={`font-semibold text-coal ${compact ? "text-sm" : ""}`}>{monthLabel}</p>
          <p className={`text-gray-500 ${compact ? "text-[10px]" : "text-sm"}`}>
            {data?.present_days ?? 0} present · {data?.total_hours ?? 0}h
          </p>
        </div>
        <button type="button" onClick={onNext} className={navBtnClass}>
          →
        </button>
      </div>
      <div
        className={`grid grid-cols-7 gap-0.5 text-center font-bold text-gray-500 ${
          compact ? "mt-2 text-[9px]" : "mt-4 text-xs"
        }`}
      >
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className={`grid grid-cols-7 gap-0.5 ${compact ? "mt-1" : "mt-2"}`}>
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className={compact ? "h-7 w-7" : "aspect-square"} />;
          }
          const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = data?.days[key];
          const mark = dayData?.attendance_mark ?? (dayData?.present ? "PRESENT" : undefined);
          return (
            <div
              key={key}
              className={`flex items-center justify-center font-black ${cellClass} ${calendarDayStyle(mark, Boolean(dayData))}`}
              title={
                dayData
                  ? `${mark ?? "PRESENT"} · ${dayData.working_hours}h${dayData.project_name ? ` · ${dayData.project_name}` : ""}`
                  : "No attendance"
              }
            >
              {calendarDayLabel(day, mark, Boolean(dayData), compact)}
            </div>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span><span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-green-500 text-[10px] font-black text-white">P</span>Present</span>
          <span><span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-amber-400 text-[10px] font-black text-white">H</span>Half day</span>
          <span><span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-red-500 text-[10px] font-black text-white">A</span>Absent</span>
        </p>
      )}
    </div>
  );
}

function AttendanceProof({
  label,
  photoUrl,
  lat,
  lng,
  at,
}: {
  label: string;
  photoUrl?: string | null;
  lat?: string | null;
  lng?: string | null;
  at?: string | null;
}) {
  const mapUrl = mapsLink(lat, lng);
  return (
    <div className="rounded-md bg-gray-50 p-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">{label}</p>
      {at && <p className="mt-1 text-gray-600">{formatDateTime(at)}</p>}
      {lat && lng && <p className="text-gray-600">Location: {lat}, {lng}</p>}
      {mapUrl && (
        <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-coal underline">
          View on map
        </a>
      )}
      {photoUrl && (
        <a href={photoUrl} target="_blank" rel="noreferrer" className="mt-3 block">
          <img src={photoUrl} alt={label} className="h-24 w-24 rounded-xl object-cover" />
        </a>
      )}
    </div>
  );
}

function LabourPanel() {
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const queryEnabled = Boolean(accessToken);
  const coords = usePosition();
  const now = new Date();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [punchInPhoto, setPunchInPhoto] = useState<File | null>(null);
  const [punchOutPhoto, setPunchOutPhoto] = useState<File | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [message, setMessage] = useState("");
  const projects = useQuery<Paginated<ProjectOption>>({
    queryKey: ["projects"],
    queryFn: api.projects,
    enabled: queryEnabled,
  });
  const current = useQuery<CurrentAttendance>({
    queryKey: ["current-attendance"],
    queryFn: api.currentAttendance,
    refetchInterval: 15_000,
    enabled: queryEnabled,
  });
  const monthly = useQuery<MonthlyAttendance>({
    queryKey: ["monthly-attendance", calendarMonth, calendarYear],
    queryFn: () => api.monthlyAttendance(calendarMonth, calendarYear),
    enabled: queryEnabled,
  });

  const punchIn = useMutation({
    mutationFn: () => {
      if (!selectedProject || !punchInPhoto) {
        throw new Error("Select a project and take a punch-in photo.");
      }
      return api.punchIn({
        project: selectedProject,
        latitude: coords.latitude,
        longitude: coords.longitude,
        selfie: punchInPhoto,
      });
    },
    onSuccess: () => {
      setMessage("Punched in successfully. Waiting for supervisor approval after punch out.");
      setPunchInPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["current-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Punch in failed."),
  });
  const punchOut = useMutation({
    mutationFn: () => {
      if (!punchOutPhoto) {
        throw new Error("Take a punch-out photo before submitting.");
      }
      return api.punchOut({
        latitude: coords.latitude,
        longitude: coords.longitude,
        selfie: punchOutPhoto,
      });
    },
    onSuccess: (record: AttendanceRecord) => {
      setMessage(`Punched out. You worked ${record.working_hours}h. Awaiting supervisor approval.`);
      setPunchOutPhoto(null);
      queryClient.invalidateQueries({ queryKey: ["current-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Punch out failed."),
  });

  function shiftCalendar(delta: number) {
    const date = new Date(calendarYear, calendarMonth - 1 + delta, 1);
    setCalendarMonth(date.getMonth() + 1);
    setCalendarYear(date.getFullYear());
  }

  const projectList = projects.data?.results ?? [];
  const active = current.data?.attendance;
  const punchInPreview = punchInPhoto ? URL.createObjectURL(punchInPhoto) : null;
  const punchOutPreview = punchOutPhoto ? URL.createObjectURL(punchOutPhoto) : null;

  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-lg border border-gray-200/80 bg-coal p-4 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <Timer className="h-6 w-6 text-safety" />
          <h3 className="text-base font-semibold">Labour Punch</h3>
        </div>
        <p className="mt-3 text-sm text-white/60">
          Photo and GPS location are required for punch in and punch out.
        </p>
        <select
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
          value={selectedProject ?? ""}
          disabled={Boolean(current.data?.active)}
          onChange={(event) => {
            const value = event.target.value;
            setSelectedProject(value ? Number(value) : null);
          }}
        >
          <option className="text-coal" value="">
            Select project
          </option>
          {projectList.map((project) => (
            <option className="text-coal" key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </select>
        {!projectList.length && (
          <p className="mt-3 text-sm text-amber-200">
            No projects assigned to you yet. Ask your supervisor to add you to a project team.
          </p>
        )}
        <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm">
          <p className="text-white/60">GPS location</p>
          <p className="mt-1 font-semibold">
            {coords.latitude != null && coords.longitude != null
              ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
              : "Waiting for location..."}
          </p>
        </div>
        <div className="mt-6 rounded-2xl bg-white/10 p-4">
          <p className="text-sm text-white/60">Current status</p>
          <p className="mt-1 text-base font-semibold">
            {current.data?.active ? "Punched In" : "Not punched in"}
          </p>
          {active && (
            <p className="mt-2 text-sm text-white/70">
              {active.project_name} · {active.working_hours}h so far
            </p>
          )}
        </div>
        {!current.data?.active ? (
          <div className="mt-6">
            <label className="block text-sm font-bold text-white/80">Punch-in photo</label>
            <input
              className="mt-2 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm text-white file:mr-3 file:rounded-xl file:border-0 file:bg-safety file:px-3 file:py-2 file:font-bold file:text-coal"
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => setPunchInPhoto(event.target.files?.[0] ?? null)}
            />
            {punchInPreview && (
              <img src={punchInPreview} alt="Punch in preview" className="mt-3 h-28 w-28 rounded-2xl object-cover" />
            )}
          </div>
        ) : (
          <div className="mt-6">
            <label className="block text-sm font-bold text-white/80">Punch-out photo</label>
            <input
              className="mt-2 w-full rounded-2xl bg-white/10 px-3 py-2 text-sm text-white file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:font-bold file:text-coal"
              type="file"
              accept="image/*"
              capture="user"
              onChange={(event) => setPunchOutPhoto(event.target.files?.[0] ?? null)}
            />
            {punchOutPreview && (
              <img src={punchOutPreview} alt="Punch out preview" className="mt-3 h-28 w-28 rounded-2xl object-cover" />
            )}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button
            className="flex-1 rounded-2xl bg-safety px-5 py-3 font-bold text-coal disabled:opacity-50"
            disabled={!selectedProject || !punchInPhoto || Boolean(current.data?.active) || punchIn.isPending}
            onClick={() => punchIn.mutate()}
          >
            Punch In
          </button>
          <button
            className="flex-1 rounded-2xl bg-white px-5 py-3 font-bold text-coal disabled:opacity-50"
            disabled={!current.data?.active || !punchOutPhoto || punchOut.isPending}
            onClick={() => punchOut.mutate()}
          >
            Punch Out
          </button>
        </div>
        {message && (
          <p className="mt-4 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white">{message}</p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-6 w-6 text-safety" />
          <h3 className="text-base font-semibold text-coal">Monthly Attendance</h3>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Green <strong>P</strong> marks days you were present this month.
        </p>
        <div className="mt-6">
          <AttendanceCalendar
            data={monthly.data}
            month={calendarMonth}
            year={calendarYear}
            onPrev={() => shiftCalendar(-1)}
            onNext={() => shiftCalendar(1)}
          />
        </div>
      </div>
    </section>
  );
}

function formValue(form: FormData, key: string) {
  return String(form.get(key) ?? "");
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    BLOCKED: "bg-red-100 text-red-800",
    ON_HOLD: "bg-orange-100 text-orange-800",
    DRAFT: "bg-gray-100 text-gray-700",
    PLANNING: "bg-purple-100 text-purple-800",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

const taskStatusBadgeClass = (status: string) =>
  `rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass(status)}`;

function resolveTaskLabours(task: ProjectTask, projectLabours: UserMini[], allLabours: UserMini[]): UserMini[] {
  if (task.assigned_labour_details?.length) {
    return task.assigned_labour_details;
  }
  const pool = new Map<number, UserMini>();
  for (const labour of [...projectLabours, ...allLabours]) {
    pool.set(labour.id, labour);
  }
  return (task.assigned_labours ?? [])
    .map((id) => pool.get(id))
    .filter((labour): labour is UserMini => Boolean(labour));
}

function LabourCheckboxList({
  labours,
  selected,
  onChange,
  resourceLabel = "labour workers",
  getBadge,
}: {
  labours: UserMini[];
  selected: number[];
  onChange: (ids: number[]) => void;
  resourceLabel?: string;
  getBadge?: (id: number) => { label: string; tone: "gray" | "green" | "amber" | "red" | "violet" | "blue" } | null;
}) {
  if (!labours.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-900">No {resourceLabel} found.</p>
        <p className="mt-1 text-xs text-gray-500">
          Create them in <strong>People</strong> or <strong>Labour</strong>, then assign here.
        </p>
      </div>
    );
  }

  return (
    <MemberPicker
      members={labours}
      selected={selected}
      onChange={onChange}
      getBadge={getBadge}
      maxHeight="max-h-48"
    />
  );
}

function ProjectDetail({
  projectId,
  user,
}: {
  projectId: number;
  user: AuthUser | null;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [taskLabours, setTaskLabours] = useState<number[]>([]);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [editTaskLabours, setEditTaskLabours] = useState<number[]>([]);
  const [projectLabourIds, setProjectLabourIds] = useState<number[]>([]);
  const [projectSupervisorIds, setProjectSupervisorIds] = useState<number[]>([]);
  const [teamSyncKey, setTeamSyncKey] = useState("");
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "SUPERVISOR";

  const project = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => api.project(projectId),
  });
  const tasks = useQuery<Paginated<ProjectTask>>({
    queryKey: ["tasks", projectId],
    queryFn: () => api.tasks(projectId),
  });
  const documents = useQuery<Paginated<ProjectDocument>>({
    queryKey: ["project-documents", projectId],
    queryFn: () => api.projectDocuments(projectId),
    enabled: Boolean(accessToken),
  });
  const materialStock = useQuery<Paginated<MaterialStock>>({
    queryKey: ["material-stock"],
    queryFn: api.materialStock,
    retry: false,
  });
  const machineryUsage = useQuery<Paginated<MachineryUsage>>({
    queryKey: ["machinery-usage", projectId],
    queryFn: () => api.machineryUsage(projectId),
    retry: false,
  });
  const materials = useQuery<Paginated<Material>>({
    queryKey: ["materials"],
    queryFn: api.materials,
    enabled: canManage,
    retry: false,
  });
  const projectAttendance = useQuery<Paginated<AttendanceRecord>>({
    queryKey: ["attendance", projectId],
    queryFn: () => api.attendance(projectId),
    enabled: canManage,
    refetchInterval: 30_000,
  });
  const allLabours = useQuery<AuthUser[]>({
    queryKey: ["labours"],
    queryFn: api.labours,
    enabled: canManage,
    retry: false,
  });
  const allSupervisors = useQuery<AuthUser[]>({
    queryKey: ["supervisors"],
    queryFn: api.supervisors,
    enabled: canManage && user?.role === "SUPER_ADMIN",
    retry: false,
  });

  const createTask = useMutation({
    mutationFn: (payload: Parameters<typeof api.createTask>[0]) => api.createTask(payload),
    onSuccess: () => {
      setMessage("Task created.");
      setTaskLabours([]);
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Task creation failed."),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Parameters<typeof api.createTask>[0]> }) =>
      api.updateTask(id, payload),
    onSuccess: () => {
      setMessage("Task updated.");
      setEditingTask(null);
      setEditTaskLabours([]);
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Task update failed."),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => {
      setMessage("Task deleted.");
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Delete failed."),
  });

  const addTaskMaterial = useMutation({
    mutationFn: (payload: Parameters<typeof api.createTaskMaterial>[0]) => api.createTaskMaterial(payload),
    onSuccess: () => {
      setMessage("Material added to task.");
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Failed to add material."),
  });

  const uploadDocument = useMutation({
    mutationFn: (payload: Parameters<typeof api.uploadProjectDocument>[0]) => api.uploadProjectDocument(payload),
    onSuccess: () => {
      setMessage("Document uploaded.");
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
      queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (id: number) => api.deleteProjectDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-documents", projectId] }),
  });

  const updateProjectTeam = useMutation({
    mutationFn: (payload: { labours: number[]; supervisors?: number[] }) =>
      api.updateProject(projectId, payload),
    onSuccess: () => {
      setMessage("Project team updated.");
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Failed to update team."),
  });

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createTask.mutate({
      project: projectId,
      title: formValue(form, "title"),
      description: formValue(form, "description"),
      status: formValue(form, "status") as ProjectTask["status"],
      priority: formValue(form, "priority") as ProjectTask["priority"],
      estimated_hours: formValue(form, "estimated_hours") || undefined,
      start_date: formValue(form, "start_date") || undefined,
      due_date: formValue(form, "due_date") || undefined,
      assigned_labours: taskLabours,
    });
    event.currentTarget.reset();
    setTaskLabours([]);
  }

  function submitTaskMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addTaskMaterial.mutate({
      task: Number(form.get("task")),
      material: Number(form.get("material")),
      quantity: formValue(form, "quantity"),
      notes: formValue(form, "notes"),
    });
    event.currentTarget.reset();
  }

  function submitEditTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTask) return;
    const form = new FormData(event.currentTarget);
    updateTask.mutate({
      id: editingTask.id,
      payload: {
        title: formValue(form, "title"),
        description: formValue(form, "description"),
        status: formValue(form, "status") as ProjectTask["status"],
        priority: formValue(form, "priority") as ProjectTask["priority"],
        estimated_hours: formValue(form, "estimated_hours") || undefined,
        start_date: formValue(form, "start_date") || undefined,
        due_date: formValue(form, "due_date") || undefined,
        assigned_labours: editTaskLabours,
      },
    });
  }

  function startEditTask(task: ProjectTask) {
    setEditingTask(task);
    setEditTaskLabours(task.assigned_labours ?? []);
  }

  function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      setMessage("Please select a file to upload.");
      return;
    }
    uploadDocument.mutate({
      project: projectId,
      title: formValue(form, "title"),
      file,
      description: formValue(form, "description"),
    });
    event.currentTarget.reset();
  }

  const p = project.data;
  const taskList = tasks.data?.results ?? [];
  const stockRows = (materialStock.data?.results ?? []).filter((row) => row.project === projectId);
  const usageRows = machineryUsage.data?.results ?? [];
  const documentList = documents.data?.results ?? [];
  const materialList = materials.data?.results ?? [];
  const allLabourOptions: UserMini[] = (allLabours.data ?? []).map((labour) => ({
    id: labour.id,
    username: labour.username,
    full_name: labour.full_name,
    role: labour.role,
    mobile_number: labour.mobile_number,
  }));
  const allSupervisorOptions: UserMini[] = (allSupervisors.data ?? []).map((supervisor) => ({
    id: supervisor.id,
    username: supervisor.username,
    full_name: supervisor.full_name,
    role: supervisor.role,
    mobile_number: supervisor.mobile_number,
  }));
  const projectLabours = allLabourOptions.filter((labour) => projectLabourIds.includes(labour.id));
  const taskLabourPool = projectLabours;
  const attendanceRows = projectAttendance.data?.results ?? [];
  const liveAttendance = attendanceRows.filter((row) => row.status === "PUNCHED_IN");

  function getLabourAttendance(labourId: number) {
    return attendanceRows.find((row) => row.labour === labourId && row.status === "PUNCHED_IN");
  }

  const nextTeamSyncKey = project.data
    ? `${project.data.id}:${(project.data.labours ?? []).join(",")}:${(project.data.supervisors ?? []).join(",")}`
    : "";
  if (nextTeamSyncKey && nextTeamSyncKey !== teamSyncKey) {
    setTeamSyncKey(nextTeamSyncKey);
    setProjectLabourIds(project.data?.labours ?? []);
    setProjectSupervisorIds(project.data?.supervisors ?? []);
  }

  if (project.isLoading) {
    return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-gray-500 shadow-sm">Loading project...</p>;
  }

  if (!p) {
    return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-gray-500 shadow-sm">Project not found.</p>;
  }

  function labourSiteBadge(labourId: number) {
    return getLabourAttendance(labourId)
      ? { label: "On site", tone: "green" as const }
      : { label: "Off site", tone: "gray" as const };
  }

  return (
    <section className="space-y-5">
      <Link href="/projects" className={`${btnSecondaryClass} text-sm`}>
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </Link>

      {message && <PageMessage>{message}</PageMessage>}

      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-violet-600">{p.code}</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">{p.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{p.client_name} · {p.location}</p>
          </div>
          <Badge tone={p.status === "ACTIVE" ? "green" : "gray"}>{p.status.replace("_", " ")}</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-500">Timeline</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{p.start_date} → {p.end_date}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-500">Budget</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{formatCurrency(p.estimated_budget)}</p>
            <p className="text-xs text-gray-500">Left {formatCurrency(p.remaining_budget)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-500">Actual cost</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{formatCurrency(p.actual_cost)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-500">Tasks</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {taskList.filter((t) => t.status === "COMPLETED").length}/{taskList.length} done
            </p>
          </div>
        </div>
        {p.description && <p className="mt-4 text-sm text-gray-600">{p.description}</p>}
      </ContentCard>

      <ContentCard
        title="Project team"
        subtitle="Supervisors and workers assigned to this site"
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() =>
                updateProjectTeam.mutate({
                  labours: projectLabourIds,
                  ...(user?.role === "SUPER_ADMIN" ? { supervisors: projectSupervisorIds } : {}),
                })
              }
              disabled={updateProjectTeam.isPending}
              className={btnPrimaryClass}
            >
              {updateProjectTeam.isPending ? "Saving..." : "Save team"}
            </button>
          ) : undefined
        }
      >
        {canManage && liveAttendance.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span className="font-medium">{liveAttendance.length} on site now</span>
            <span className="text-emerald-700">·</span>
            <span className="text-emerald-700">
              {liveAttendance.map((row) => row.labour_name || "Worker").join(", ")}
            </span>
          </div>
        )}

        <div className={`grid gap-6 ${user?.role === "SUPER_ADMIN" && canManage ? "lg:grid-cols-2" : ""}`}>
          {(user?.role === "SUPER_ADMIN" || !canManage) && (
            <div>
              <SubsectionTitle>Supervisors</SubsectionTitle>
              <div className="mt-2">
                {canManage && user?.role === "SUPER_ADMIN" ? (
                  <MemberPicker
                    members={allSupervisorOptions}
                    selected={projectSupervisorIds}
                    onChange={setProjectSupervisorIds}
                    emptyMessage="No supervisors found. Add them in People."
                  />
                ) : (
                  <MemberList
                    members={(p.supervisor_details ?? []).map((supervisor) => ({
                      id: supervisor.id,
                      full_name: supervisor.full_name,
                      username: supervisor.username,
                      mobile_number: supervisor.mobile_number,
                    }))}
                    emptyMessage="No supervisors assigned."
                  />
                )}
              </div>
            </div>
          )}

          <div>
            <SubsectionTitle>Labour</SubsectionTitle>
            <p className="mt-1 text-xs text-gray-500">Selected workers can be assigned to tasks below.</p>
            <div className="mt-2">
              {canManage ? (
                <MemberPicker
                  members={allLabourOptions}
                  selected={projectLabourIds}
                  onChange={setProjectLabourIds}
                  getBadge={labourSiteBadge}
                  emptyMessage="No workers found. Add them in Labour or People."
                />
              ) : (
                <MemberList
                  members={projectLabours}
                  getBadge={labourSiteBadge}
                  emptyMessage="No labour assigned to this project."
                />
              )}
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="Tasks" subtitle="Work items and labour assignments for this project">
        {canManage && (
          <form onSubmit={submitTask} className="mb-5 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <SubsectionTitle>Add task</SubsectionTitle>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Task title">
                <input className={inputClass} name="title" required />
              </Field>
              <Field label="Estimated hours">
                <input className={inputClass} name="estimated_hours" min="0" step="0.5" type="number" />
              </Field>
              <Field label="Status">
                <select className={inputClass} name="status" defaultValue="PENDING">
                  {["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"].map((status) => (
                    <option key={status} value={status}>{status.replace("_", " ")}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select className={inputClass} name="priority" defaultValue="MEDIUM">
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </Field>
              <Field label="Start date">
                <input className={inputClass} name="start_date" type="date" />
              </Field>
              <Field label="Due date">
                <input className={inputClass} name="due_date" type="date" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Assign workers">
                  <LabourCheckboxList labours={taskLabourPool} selected={taskLabours} onChange={setTaskLabours} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea className={inputClass} name="description" rows={2} />
                </Field>
              </div>
            </div>
            <button className={`${btnPrimaryClass} mt-3`} disabled={createTask.isPending}>
              {createTask.isPending ? "Adding..." : "Add task"}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {taskList.map((task) => {
            const taskLabourList = resolveTaskLabours(task, projectLabours, allLabourOptions);
            const isEditing = editingTask?.id === task.id;

            if (isEditing) {
              return (
                <form key={task.id} onSubmit={submitEditTask} className="rounded-lg border border-violet-200 bg-violet-50/40 p-4">
                  <SubsectionTitle>Edit task</SubsectionTitle>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Field label="Task title">
                      <input className={inputClass} name="title" defaultValue={task.title} required />
                    </Field>
                    <Field label="Estimated hours">
                      <input
                        className={inputClass}
                        name="estimated_hours"
                        min="0"
                        step="0.5"
                        type="number"
                        defaultValue={task.estimated_hours ?? ""}
                      />
                    </Field>
                    <Field label="Status">
                      <select className={inputClass} name="status" defaultValue={task.status}>
                        {["PENDING", "IN_PROGRESS", "COMPLETED", "BLOCKED"].map((status) => (
                          <option key={status} value={status}>{status.replace("_", " ")}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select className={inputClass} name="priority" defaultValue={task.priority}>
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                          <option key={priority} value={priority}>{priority}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Start date">
                      <input className={inputClass} name="start_date" type="date" defaultValue={task.start_date ?? ""} />
                    </Field>
                    <Field label="Due date">
                      <input className={inputClass} name="due_date" type="date" defaultValue={task.due_date ?? ""} />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Description">
                        <textarea className={inputClass} name="description" rows={2} defaultValue={task.description} />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Assign labours">
                        <LabourCheckboxList
                          labours={taskLabourPool}
                          selected={editTaskLabours}
                          onChange={setEditTaskLabours}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="submit" className={btnPrimaryClass} disabled={updateTask.isPending}>
                      {updateTask.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(null);
                        setEditTaskLabours([]);
                      }}
                      className={btnSecondaryClass}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              );
            }

            return (
            <div key={task.id} className="rounded-lg border border-gray-100 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.description && <p className="mt-1 text-xs text-gray-500">{task.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={task.status === "COMPLETED" ? "green" : task.status === "BLOCKED" ? "red" : "amber"}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  {task.estimated_hours && (
                    <Badge tone="gray">{task.estimated_hours}h</Badge>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                <span>Priority: {task.priority}</span>
                {task.start_date && <span>Start: {task.start_date}</span>}
                {task.due_date && <span>Due: {task.due_date}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {taskLabourList.length > 0 ? (
                  taskLabourList.map((labour) => (
                    <Badge key={labour.id} tone="violet">{labour.full_name || labour.username}</Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No workers assigned</span>
                )}
              </div>
              {(task.materials ?? []).length > 0 && (
                <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                  <p className="text-xs font-medium text-gray-500">Materials</p>
                  <div className="mt-1 space-y-0.5">
                    {task.materials!.map((item) => (
                      <p key={item.id} className="text-xs text-gray-600">
                        {item.material_name}: {item.quantity} {item.material_unit}
                        {item.notes ? ` · ${item.notes}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {canManage && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEditTask(task)}
                    className={`${btnSecondaryClass} px-3 py-1 text-xs`}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete task "${task.title}"?`)) {
                        deleteTask.mutate(task.id);
                      }
                    }}
                    disabled={deleteTask.isPending}
                    className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            );
          })}
          {!taskList.length && <p className="text-sm text-gray-500">No tasks yet. Add tasks to track work on this project.</p>}
        </div>

        {canManage && taskList.length > 0 && materialList.length > 0 && (
          <form onSubmit={submitTaskMaterial} className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4">
            <SubsectionTitle>Add material to task</SubsectionTitle>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <Field label="Task">
                <select className={inputClass} name="task" required>
                  {taskList.map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </Field>
              <Field label="Material">
                <select className={inputClass} name="material" required>
                  {materialList.map((material) => (
                    <option key={material.id} value={material.id}>{material.name} ({material.unit})</option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity">
                <input className={inputClass} name="quantity" min="0" step="0.01" type="number" required />
              </Field>
              <Field label="Notes">
                <input className={inputClass} name="notes" />
              </Field>
            </div>
            <button className={`${btnPrimaryClass} mt-3`} disabled={addTaskMaterial.isPending}>
              Add material
            </button>
          </form>
        )}
      </ContentCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ContentCard title="Project materials" subtitle="Stock tracked for this site">
          <div className="space-y-2">
            {stockRows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{row.material_name}</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>Req {row.required_quantity} {row.material_unit}</span>
                  <span>·</span>
                  <span>Used {row.used_stock}</span>
                  <span>·</span>
                  <Badge tone={Number(row.remaining_stock) > 0 ? "green" : "red"}>
                    Left {row.remaining_stock}
                  </Badge>
                </div>
              </div>
            ))}
            {!stockRows.length && (
              <p className="text-sm text-gray-500">No materials tracked. Add from the Materials page.</p>
            )}
          </div>
        </ContentCard>

        <ContentCard title="Machinery usage" subtitle="Equipment hours on this project">
          <div className="space-y-2">
            {usageRows.map((usage) => (
              <div key={usage.id} className="rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{usage.machinery_name}</p>
                <p className="text-xs text-gray-500">
                  {usage.hours_used}h · {usage.operator || "No operator"} · {usage.usage_date}
                </p>
              </div>
            ))}
            {!usageRows.length && (
              <p className="text-sm text-gray-500">No machinery usage logged yet.</p>
            )}
          </div>
        </ContentCard>
      </div>

      <ContentCard title="Documents" subtitle="Contracts, drawings and site files">
        {canManage && (
          <form onSubmit={submitDocument} className="mb-4 rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Document title">
                <input className={inputClass} name="title" required />
              </Field>
              <Field label="File">
                <input className={inputClass} name="file" type="file" required />
              </Field>
              <Field label="Description">
                <input className={inputClass} name="description" />
              </Field>
            </div>
            <button className={`${btnPrimaryClass} mt-3`} disabled={uploadDocument.isPending}>
              {uploadDocument.isPending ? "Uploading..." : "Upload document"}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {documents.isLoading && <p className="text-sm text-gray-500">Loading documents...</p>}
          {documents.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {documents.error instanceof Error ? documents.error.message : "Failed to load documents."}
            </p>
          )}
          {documentList.map((doc) => {
            const fileHref = mediaUrl(doc.file_url || doc.file);
            return (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
              <div>
                {fileHref ? (
                  <a href={fileHref} target="_blank" rel="noreferrer" className="text-sm font-medium text-violet-700 hover:underline">
                    {doc.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                )}
                <p className="text-xs text-gray-500">
                  {doc.uploaded_by_name || "Unknown"} · {new Date(doc.created_at).toLocaleDateString()}
                  {doc.description ? ` · ${doc.description}` : ""}
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => deleteDocument.mutate(doc.id)}
                  className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
          );
          })}
          {!documents.isLoading && !documents.isError && !documentList.length && (
            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
          )}
        </div>
      </ContentCard>

      {message && <p className="rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
    </section>
  );
}

function ProjectManager({ user }: { user: AuthUser | null }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [supervisors, setSupervisors] = useState<number[]>([]);
  const [labours, setLabours] = useState<number[]>([]);
  const projects = useQuery<Paginated<Project>>({ queryKey: ["projects"], queryFn: api.projects });
  const users = useQuery<Paginated<AuthUser>>({
    queryKey: ["users"],
    queryFn: api.users,
    enabled: user?.role === "SUPER_ADMIN",
    retry: false,
  });
  const createLabours = useQuery<AuthUser[]>({
    queryKey: ["labours"],
    queryFn: api.labours,
    enabled: user?.role === "SUPER_ADMIN" || user?.role === "SUPERVISOR",
    retry: false,
  });
  const createSupervisors = useQuery<AuthUser[]>({
    queryKey: ["supervisors"],
    queryFn: api.supervisors,
    enabled: user?.role === "SUPER_ADMIN",
    retry: false,
  });

  const createProject = useMutation({
    mutationFn: (payload: Parameters<typeof api.createProject>[0]) => api.createProject(payload),
    onSuccess: () => {
      setMessage("Project created successfully.");
      setSupervisors([]);
      setLabours([]);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Project creation failed."),
  });

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createProject.mutate({
      name: String(form.get("name") ?? ""),
      code: String(form.get("code") ?? ""),
      client_name: String(form.get("client_name") ?? ""),
      location: String(form.get("location") ?? ""),
      start_date: String(form.get("start_date") ?? ""),
      end_date: String(form.get("end_date") ?? ""),
      estimated_budget: String(form.get("estimated_budget") ?? "0"),
      status: String(form.get("status") ?? "ACTIVE") as Project["status"],
      description: String(form.get("description") ?? ""),
      supervisors,
      labours,
    });
    event.currentTarget.reset();
  }

  const userList = users.data?.results ?? [];
  const supervisorList = createSupervisors.data ?? userList.filter((item) => item.role === "SUPERVISOR");
  const labourList: UserMini[] = (createLabours.data ?? userList.filter((item) => item.role === "LABOUR")).map(
    (item) => ({
      id: item.id,
      username: item.username,
      full_name: item.full_name,
      role: item.role,
      mobile_number: item.mobile_number,
    }),
  );
  const projectList = projects.data?.results ?? [];

  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={submitProject} className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <FolderPlus className="h-6 w-6 text-safety" />
          <h2 className="text-base font-semibold text-coal">Create Project</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Project name">
            <input className={inputClass} name="name" required />
          </Field>
          <Field label="Project code">
            <input className={inputClass} name="code" required />
          </Field>
          <Field label="Client name">
            <input className={inputClass} name="client_name" required />
          </Field>
          <Field label="Location">
            <input className={inputClass} name="location" required />
          </Field>
          <Field label="Start date">
            <input className={inputClass} name="start_date" type="date" required />
          </Field>
          <Field label="End date">
            <input className={inputClass} name="end_date" type="date" required />
          </Field>
          <Field label="Estimated budget">
            <input className={inputClass} name="estimated_budget" min="0" step="0.01" type="number" required />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="status" defaultValue="ACTIVE">
              {["DRAFT", "PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          {user?.role === "SUPER_ADMIN" && (
            <Field label="Assign supervisors">
              <LabourCheckboxList
                labours={supervisorList.map((item) => ({
                  id: item.id,
                  username: item.username,
                  full_name: item.full_name,
                  role: item.role,
                  mobile_number: item.mobile_number,
                }))}
                selected={supervisors}
                onChange={setSupervisors}
                resourceLabel="supervisor accounts"
              />
            </Field>
          )}
          {(user?.role === "SUPER_ADMIN" || user?.role === "SUPERVISOR") && (
            <div className="md:col-span-2">
              <Field label="Assign labours">
                <LabourCheckboxList labours={labourList} selected={labours} onChange={setLabours} />
              </Field>
            </div>
          )}
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea className={inputClass} name="description" rows={4} />
            </Field>
          </div>
        </div>
        {message && <p className="mt-4 rounded-2xl bg-safety/15 px-4 py-3 text-sm font-semibold text-coal">{message}</p>}
        <button className={`${btnPrimaryClass} mt-4`} disabled={createProject.isPending}>
          {createProject.isPending ? "Creating..." : "Create Project"}
        </button>
      </form>

      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-coal">Project List</h2>
        <p className="mt-1 text-sm text-gray-500">Click a project to view tasks, team, materials, and documents.</p>
        <div className="mt-5 space-y-2">
          {projectList.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-cement p-4 text-left transition hover:border-safety/40 hover:bg-safety/5"
            >
              <p className="font-semibold text-coal">{project.name}</p>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(project.status)}`}>
                {project.status.replace("_", " ")}
              </span>
            </Link>
          ))}
          {!projectList.length && <p className="rounded-md bg-gray-50 p-5 text-gray-500">No projects created yet.</p>}
        </div>
      </div>
    </section>
  );
}

function PeopleManager({ user }: { user: AuthUser | null }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const users = useQuery<Paginated<AuthUser>>({
    queryKey: ["users"],
    queryFn: api.users,
    enabled: isSuperAdmin,
    retry: false,
  });
  const labours = useQuery<AuthUser[]>({
    queryKey: ["labours"],
    queryFn: api.labours,
    enabled: !isSuperAdmin,
    retry: false,
  });
  const createUser = useMutation({
    mutationFn: (payload: Parameters<typeof api.createUser>[0]) => api.createUser(payload),
    onSuccess: () => {
      setMessage("User created successfully.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["labours"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "User creation failed."),
  });

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createUser.mutate({
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
      email: String(form.get("email") ?? ""),
      mobile_number: String(form.get("mobile_number") ?? ""),
      role: isSuperAdmin
        ? (String(form.get("role") ?? "LABOUR") as AuthUser["role"])
        : "LABOUR",
    });
    event.currentTarget.reset();
  }

  const userList = isSuperAdmin ? (users.data?.results ?? []) : (labours.data ?? []);

  return (
    <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={submitUser} className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-safety" />
          <h2 className="text-base font-semibold text-coal">
            {isSuperAdmin ? "Create Supervisor / Labour" : "Create Labour"}
          </h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Username">
            <input className={inputClass} name="username" required />
          </Field>
          <Field label="Mobile number">
            <input className={inputClass} name="mobile_number" required />
          </Field>
          <Field label="First name">
            <input className={inputClass} name="first_name" required />
          </Field>
          <Field label="Last name">
            <input className={inputClass} name="last_name" />
          </Field>
          <Field label="Email">
            <input className={inputClass} name="email" type="email" />
          </Field>
          {isSuperAdmin ? (
            <Field label="Role">
              <select className={inputClass} name="role" defaultValue="SUPERVISOR">
                <option value="SUPERVISOR">Supervisor</option>
                <option value="LABOUR">Labour</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </Field>
          ) : (
            <input type="hidden" name="role" value="LABOUR" />
          )}
          <div className="md:col-span-2">
            <Field label="Password">
              <input className={inputClass} name="password" minLength={8} type="password" required />
            </Field>
          </div>
        </div>
        {message && <p className="mt-4 rounded-2xl bg-safety/15 px-4 py-3 text-sm font-semibold text-coal">{message}</p>}
        <button className={`${btnPrimaryClass} mt-4`} disabled={createUser.isPending}>
          {createUser.isPending ? "Creating..." : "Create User"}
        </button>
      </form>

      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-coal">{isSuperAdmin ? "Team Members" : "Labour Workers"}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {userList.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-100 bg-cement p-4">
              <p className="font-semibold text-coal">{item.full_name || item.username}</p>
              <p className="text-sm text-gray-500">{item.mobile_number}</p>
              <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-coal">{item.role.replace("_", " ")}</p>
              {item.role === "SUPERVISOR" && (
                <Link href={`/supervisors/${item.id}`} className="mt-3 inline-block text-sm font-bold text-safety hover:underline">
                  View profile
                </Link>
              )}
              {item.role === "LABOUR" && (
                <Link href={`/workers/${item.id}`} className="mt-3 inline-block text-sm font-bold text-safety hover:underline">
                  View profile
                </Link>
              )}
            </div>
          ))}
          {!userList.length && <p className="rounded-md bg-gray-50 p-5 text-gray-500">No users loaded yet.</p>}
        </div>
      </div>
    </section>
  );
}

function AttendanceDetailView({
  record,
  onApprove,
  isApproving,
}: {
  record: AttendanceRecord;
  onApprove: (id: number, status: "APPROVED" | "REJECTED") => void;
  isApproving: boolean;
}) {
  const punchDate = new Date(record.punch_in_at);
  const [calendarMonth, setCalendarMonth] = useState(punchDate.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(punchDate.getFullYear());
  const monthly = useQuery<MonthlyAttendance>({
    queryKey: ["monthly-attendance", record.labour, calendarMonth, calendarYear],
    queryFn: () => api.monthlyAttendance(calendarMonth, calendarYear, record.labour),
  });

  function shiftCalendar(delta: number) {
    const date = new Date(calendarYear, calendarMonth - 1 + delta, 1);
    setCalendarMonth(date.getMonth() + 1);
    setCalendarYear(date.getFullYear());
  }

  const canApprove = record.status === "PUNCHED_OUT" && record.approval_status === "PENDING";

  return (
    <section className="space-y-4">
      <Link
        href="/attendance"
        className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-coal shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to attendance
      </Link>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-600">Attendance</p>
            <h2 className="text-sm font-semibold text-coal">{record.labour_name || "Worker"}</h2>
            <p className="text-sm text-gray-600">{record.project_name}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                record.status === "PUNCHED_IN" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
              }`}
            >
              {record.status.replace("_", " ")}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                record.approval_status === "APPROVED"
                  ? "bg-green-100 text-green-800"
                  : record.approval_status === "REJECTED"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {record.approval_status}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-cement p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Hours</p>
            <p className="text-lg font-semibold text-coal">{record.working_hours}h</p>
          </div>
          <div className="rounded-xl bg-cement p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Punch in</p>
            <p className="text-sm font-bold text-coal">{formatDateTime(record.punch_in_at)}</p>
          </div>
          <div className="rounded-xl bg-cement p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Punch out</p>
            <p className="text-sm font-bold text-coal">
              {record.punch_out_at ? formatDateTime(record.punch_out_at) : "On site"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <AttendanceProof
            label="Punch in"
            photoUrl={record.punch_in_selfie_url}
            lat={record.punch_in_latitude}
            lng={record.punch_in_longitude}
            at={record.punch_in_at}
          />
          {record.punch_out_at ? (
            <AttendanceProof
              label="Punch out"
              photoUrl={record.punch_out_selfie_url}
              lat={record.punch_out_latitude}
              lng={record.punch_out_longitude}
              at={record.punch_out_at}
            />
          ) : (
            <div className="rounded-xl bg-cement p-3 text-xs text-gray-500">
              Punch-out photo and location appear after punch out.
            </div>
          )}
        </div>

        {canApprove && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isApproving}
              onClick={() => onApprove(record.id, "APPROVED")}
              className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isApproving}
              onClick={() => onApprove(record.id, "REJECTED")}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-safety" />
            <h3 className="text-sm font-semibold text-coal">Monthly presence</h3>
          </div>
        </div>
        <div className="mt-3">
          <AttendanceCalendar
            data={monthly.data}
            month={calendarMonth}
            year={calendarYear}
            onPrev={() => shiftCalendar(-1)}
            onNext={() => shiftCalendar(1)}
            compact
          />
        </div>
      </div>
    </section>
  );
}

function AttendanceDetailPage({ recordId }: { recordId: number }) {
  const queryClient = useQueryClient();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const record = useQuery<AttendanceRecord>({
    queryKey: ["attendance-record", recordId],
    queryFn: () => api.attendanceRecord(recordId),
    enabled: Boolean(accessToken),
  });
  const approve = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" }) => api.approveAttendance(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["attendance-record", recordId], updated);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
    },
  });

  if (record.isLoading) {
    return <p className="rounded-2xl bg-white p-6 text-gray-500 shadow-sm">Loading record...</p>;
  }

  if (record.isError || !record.data) {
    return (
      <p className="rounded-2xl bg-red-50 p-6 text-red-700 shadow-sm">
        {record.error instanceof Error ? record.error.message : "Attendance record not found."}
      </p>
    );
  }

  return (
    <AttendanceDetailView
      record={record.data}
      onApprove={(id, status) => approve.mutate({ id, status })}
      isApproving={approve.isPending}
    />
  );
}

function AttendanceHistoryPage() {
  const router = useRouter();
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const attendance = useQuery<Paginated<AttendanceRecord>>({
    queryKey: ["attendance"],
    queryFn: () => api.attendance(),
    enabled: hydrated && Boolean(accessToken),
  });

  if (attendance.isLoading) {
    return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading attendance records...</p>;
  }

  if (attendance.isError) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {attendance.error instanceof Error ? attendance.error.message : "Failed to load attendance records."}
      </p>
    );
  }

  const rows = attendance.data?.results ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/attendance" className={`${btnSecondaryClass} text-xs`}>
          <ArrowLeft className="h-4 w-4" />
          Back to attendance
        </Link>
        <p className="text-sm text-gray-600">{rows.length} records</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-coal">All Attendance Records</h2>
          <p className="text-xs text-gray-500">Click a row to view photos, location, and details</p>
        </div>
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Worker</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Punch In</th>
              <th className="px-4 py-2.5">Punch Out</th>
              <th className="px-4 py-2.5">Hours</th>
              <th className="px-4 py-2.5">Extra Hrs</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Approval</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((record, i) => (
              <DataTableRow
                key={record.id}
                zebra={i % 2 === 1}
                onClick={() => router.push(`/attendance/${record.id}`)}
              >
                <DataTableCell className="font-medium text-gray-900">{record.labour_name || "Worker"}</DataTableCell>
                <DataTableCell>{formatDate(record.punch_in_at)}</DataTableCell>
                <DataTableCell>
                  {record.punch_in_at ? new Date(record.punch_in_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : "—"}
                </DataTableCell>
                <DataTableCell>
                  {record.punch_out_at ? new Date(record.punch_out_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : "—"}
                </DataTableCell>
                <DataTableCell>{record.working_hours}h</DataTableCell>
                <DataTableCell>{record.extra_hours ? `${record.extra_hours}h` : "—"}</DataTableCell>
                <DataTableCell>{record.project_name || "—"}</DataTableCell>
                <DataTableCell>
                  <Badge tone={attendanceStatusTone(record.status)}>{record.status.replace("_", " ")}</Badge>
                </DataTableCell>
                <DataTableCell>
                  <Badge tone={attendanceApprovalTone(record.approval_status)}>{record.approval_status}</Badge>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        {!rows.length && <p className="px-4 py-8 text-center text-sm text-gray-500">No attendance records yet.</p>}
      </div>
    </section>
  );
}

function AttendanceManager() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);
  const attendance = useQuery<Paginated<AttendanceRecord>>({
    queryKey: ["attendance"],
    queryFn: () => api.attendance(),
    enabled: hydrated && Boolean(accessToken),
    refetchInterval: 30_000,
  });
  const approve = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" }) => api.approveAttendance(id, status),
    onSuccess: () => {
      setMessage("Attendance updated.");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Attendance update failed."),
  });

  const rows = attendance.data?.results ?? [];

  if (attendance.isLoading) {
    return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-gray-500 shadow-sm">Loading attendance...</p>;
  }

  if (attendance.isError) {
    return (
      <p className="rounded-3xl bg-red-50 p-8 text-red-700 shadow-sm">
        {attendance.error instanceof Error ? attendance.error.message : "Failed to load attendance."}
      </p>
    );
  }

  const onSite = rows.filter((row) => row.status === "PUNCHED_IN");
  const awaitingApproval = rows.filter(
    (row) => row.status === "PUNCHED_OUT" && row.approval_status === "PENDING",
  );
  const pendingApproval = awaitingApproval.length;

  function canApprove(record: AttendanceRecord) {
    if (!user) return false;
    if (record.entry_type === "SUPERVISOR_SELF") return user.role === "SUPER_ADMIN";
    return user.role === "SUPER_ADMIN" || user.role === "SUPERVISOR";
  }

  function renderApprovalActions(record: AttendanceRecord) {
    if (!canApprove(record)) return null;
    return (
      <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={approve.isPending}
          onClick={() => approve.mutate({ id: record.id, status: "APPROVED" })}
        >
          Approve
        </button>
        <button
          type="button"
          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={approve.isPending}
          onClick={() => approve.mutate({ id: record.id, status: "REJECTED" })}
        >
          Reject
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Timer className="h-6 w-6 text-safety" />
          <div>
            <h2 className="text-base font-semibold text-coal">Labour Attendance</h2>
            <p className="text-sm text-gray-500">
              Monitor live punch-ins with photo and location. Approve after workers punch out.
            </p>
          </div>
        </div>
        {message && <p className="mt-4 rounded-2xl bg-safety/15 px-4 py-3 text-sm font-semibold text-coal">{message}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-green-50 p-4">
            <p className="text-xs font-bold uppercase text-green-800">On site now</p>
            <p className="mt-1 text-xl font-semibold text-green-900">{onSite.length}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase text-amber-800">Awaiting approval</p>
            <p className="mt-1 text-xl font-semibold text-amber-900">{pendingApproval}</p>
          </div>
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-xs font-bold uppercase text-gray-600">Total records</p>
            <p className="mt-1 text-3xl font-semibold text-coal">{rows.length}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Link href="/attendance/history" className={btnSecondaryClass}>
            <History className="h-4 w-4" />
            View All Records
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-coal">Awaiting approval</h3>
        <p className="mt-1 text-sm text-gray-500">Punched-out shifts waiting for your approval.</p>
        <div className="mt-5 space-y-3">
          {awaitingApproval.map((record) => (
            <div
              key={record.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/attendance/${record.id}`)}
              onKeyDown={(event) => event.key === "Enter" && router.push(`/attendance/${record.id}`)}
              className="cursor-pointer rounded-2xl border border-amber-100 bg-amber-50/40 p-4 transition hover:border-amber-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-coal">{record.labour_name || "Worker"}</p>
                  <p className="text-sm text-gray-600">{record.project_name}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                  {record.entry_type === "SUPERVISOR_SELF" ? "Supervisor · Pending" : "Pending"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                <p className="font-bold text-coal">{record.working_hours}h worked</p>
                <p>In: {formatDateTime(record.punch_in_at)}</p>
                <p>Out: {formatDateTime(record.punch_out_at)}</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <AttendanceProof
                  label="Punch in"
                  photoUrl={record.punch_in_selfie_url}
                  lat={record.punch_in_latitude}
                  lng={record.punch_in_longitude}
                  at={record.punch_in_at}
                />
                <AttendanceProof
                  label="Punch out"
                  photoUrl={record.punch_out_selfie_url}
                  lat={record.punch_out_latitude}
                  lng={record.punch_out_longitude}
                  at={record.punch_out_at}
                />
              </div>
              <div className="mt-3">{renderApprovalActions(record)}</div>
            </div>
          ))}
          {!awaitingApproval.length && (
            <p className="rounded-md bg-gray-50 p-5 text-gray-500">No punch-out records waiting for approval.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-coal">Workers on site now</h3>
        <p className="mt-1 text-sm text-gray-500">Live punch-ins with photo and GPS location.</p>
        <div className="mt-5 space-y-3">
          {onSite.map((record) => (
            <div
              key={record.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/attendance/${record.id}`)}
              onKeyDown={(event) => event.key === "Enter" && router.push(`/attendance/${record.id}`)}
              className="cursor-pointer rounded-2xl border border-green-100 bg-green-50/50 p-4 transition hover:border-green-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-coal">{record.labour_name || "Worker"}</p>
                  <p className="text-sm text-gray-600">{record.project_name}</p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800">
                  On site
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                <p>Punched in: {formatDateTime(record.punch_in_at)}</p>
                <p>Hours so far: {record.working_hours}h</p>
              </div>
              <div className="mt-3">
                <AttendanceProof
                  label="Punch in"
                  photoUrl={record.punch_in_selfie_url}
                  lat={record.punch_in_latitude}
                  lng={record.punch_in_longitude}
                  at={record.punch_in_at}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">Approve after the worker punches out. Click to view details.</p>
            </div>
          ))}
          {!onSite.length && (
            <p className="rounded-md bg-gray-50 p-5 text-gray-500">No workers are currently punched in.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function PayrollManager() {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isSupervisor = user?.role === "SUPERVISOR";
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const users = useQuery<Paginated<AuthUser>>({
    queryKey: ["users"],
    queryFn: api.users,
    retry: false,
    enabled: isSuperAdmin,
  });
  const salaries = useQuery<Paginated<Salary>>({
    queryKey: ["salaries", filterMonth, filterYear],
    queryFn: () => api.salaries({ month: filterMonth, year: filterYear }),
  });
  const labourList = (users.data?.results ?? []).filter((item) => item.role === "LABOUR");

  const salaryProfile = useMutation({
    mutationFn: (payload: Parameters<typeof api.createSalaryProfile>[0]) => api.createSalaryProfile(payload),
    onSuccess: () => setMessage("Salary profile saved."),
    onError: (err) => setMessage(err instanceof Error ? err.message : "Salary profile failed."),
  });
  const advance = useMutation({
    mutationFn: (payload: Parameters<typeof api.createAdvance>[0]) => api.createAdvance(payload),
    onSuccess: () => setMessage("Advance payment recorded."),
    onError: (err) => setMessage(err instanceof Error ? err.message : "Advance creation failed."),
  });
  const generate = useMutation({
    mutationFn: (payload: Parameters<typeof api.generateSalary>[0]) => api.generateSalary(payload),
    onSuccess: () => {
      setMessage("Salary generated.");
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Salary generation failed."),
  });
  const generateAll = useMutation({
    mutationFn: api.generateAllSalaries,
    onSuccess: (result) => {
      if (result.skipped_count > 0) {
        const reasons = result.skipped.map((item) => `${item.labour_name}: ${item.error}`).join("; ");
        setMessage(`Generated ${result.created_count} salaries. Skipped ${result.skipped_count}: ${reasons}`);
      } else {
        setMessage(`Generated salary for ${result.created_count} workers.`);
      }
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Bulk salary generation failed."),
  });
  const markPaid = useMutation({
    mutationFn: api.markSalaryPaid,
    onSuccess: () => {
      setMessage("Salary marked as paid.");
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Could not mark salary as paid."),
  });

  function formValue(form: FormData, key: string) {
    return String(form.get(key) ?? "");
  }

  const salaryRows = salaries.data?.results ?? [];
  const pendingCount = salaryRows.filter((salary) => salary.payment_status === "PENDING").length;
  const paidCount = salaryRows.filter((salary) => salary.payment_status === "PAID").length;
  const filterPeriodLabel = new Date(filterYear, filterMonth - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const isFuturePeriod =
    filterYear > now.getFullYear() ||
    (filterYear === now.getFullYear() && filterMonth > now.getMonth() + 1);
  const yearOptions = Array.from({ length: 6 }, (_, index) => now.getFullYear() - 2 + index);

  async function downloadPayrollXlsx() {
    setExporting(true);
    try {
      await api.exportSalaries({ month: filterMonth, year: filterYear });
      setMessage(`Downloaded payroll for ${filterPeriodLabel}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not download payroll file.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      {isSuperAdmin && (
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="text-base font-semibold text-coal">Payroll Actions</h2>
          <p className="mt-1 text-sm text-gray-500">Generate monthly salary sheets for workers. Supervisors can then mark them as paid.</p>
          {message && <p className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}

          <form
            className="mt-6 grid gap-4 rounded-lg border border-violet-100 bg-violet-50/40 p-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              generateAll.mutate({
                month: Number(form.get("month")),
                year: Number(form.get("year")),
                deductions: formValue(form, "deductions") || "0",
                till_date: formValue(form, "till_date") || undefined,
              });
            }}
          >
            <div className="md:col-span-2">
              <h3 className="font-semibold text-coal">Generate salary for all labours</h3>
              <p className="mt-1 text-xs text-gray-500">
                Creates the next unpaid period for every worker up to the till date. If salary was already generated through an earlier date in the month (e.g. 1–9), the new sheet starts from the next day.
              </p>
            </div>
            <Field label="Month">
              <input className={inputClass} name="month" min="1" max="12" type="number" defaultValue={now.getMonth() + 1} required />
            </Field>
            <Field label="Year">
              <input className={inputClass} name="year" min="2024" type="number" defaultValue={now.getFullYear()} required />
            </Field>
            <Field label="Till date (optional)">
              <input className={inputClass} name="till_date" type="date" defaultValue={now.toISOString().slice(0, 10)} />
            </Field>
            <Field label="Deductions (per worker)">
              <input className={inputClass} name="deductions" min="0" step="0.01" type="number" defaultValue="0" />
            </Field>
            <button className={`${btnPrimaryClass} md:col-span-2`} disabled={generateAll.isPending}>
              {generateAll.isPending ? "Generating..." : "Generate All Salaries"}
            </button>
          </form>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <form
              className="grid gap-4 rounded-lg border border-gray-100 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                salaryProfile.mutate({
                  labour: Number(form.get("labour")),
                  monthly_salary: formValue(form, "monthly_salary"),
                  daily_wage: formValue(form, "daily_wage"),
                  overtime_rate: formValue(form, "overtime_rate"),
                });
              }}
            >
              <div className="md:col-span-2">
                <h3 className="font-semibold text-coal">Set salary profile</h3>
              </div>
              <Field label="Labour">
                <select className={inputClass} name="labour" required>
                  <option value="">Select labour</option>
                  {labourList.map((item) => (
                    <option key={item.id} value={item.id}>{item.full_name || item.username}</option>
                  ))}
                </select>
              </Field>
              <Field label="Monthly salary">
                <input className={inputClass} name="monthly_salary" min="0" step="0.01" type="number" defaultValue="0" />
              </Field>
              <Field label="Daily wage">
                <input className={inputClass} name="daily_wage" min="0" step="0.01" type="number" required />
              </Field>
              <Field label="Overtime rate">
                <input className={inputClass} name="overtime_rate" min="0" step="0.01" type="number" defaultValue="0" />
              </Field>
              <button className={btnPrimaryClass}>Save profile</button>
            </form>

            <form
              className="grid gap-4 rounded-lg border border-gray-100 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                advance.mutate({
                  labour: Number(form.get("labour")),
                  amount: formValue(form, "amount"),
                  date: formValue(form, "date"),
                  reason: formValue(form, "reason"),
                });
              }}
            >
              <div className="md:col-span-2">
                <h3 className="font-semibold text-coal">Record advance</h3>
              </div>
              <Field label="Labour">
                <select className={inputClass} name="labour" required>
                  <option value="">Select labour</option>
                  {labourList.map((item) => (
                    <option key={item.id} value={item.id}>{item.full_name || item.username}</option>
                  ))}
                </select>
              </Field>
              <Field label="Amount">
                <input className={inputClass} name="amount" min="0" step="0.01" type="number" required />
              </Field>
              <Field label="Date">
                <input className={inputClass} name="date" type="date" required />
              </Field>
              <Field label="Reason">
                <input className={inputClass} name="reason" />
              </Field>
              <button className={btnPrimaryClass}>Save advance</button>
            </form>
          </div>

          <form
            className="mt-4 grid gap-4 rounded-lg border border-gray-100 p-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              generate.mutate({
                labour: Number(form.get("labour")),
                month: Number(form.get("month")),
                year: Number(form.get("year")),
                deductions: formValue(form, "deductions") || "0",
              });
            }}
          >
            <div className="md:col-span-2">
              <h3 className="font-semibold text-coal">Generate salary for one worker</h3>
              <p className="mt-1 text-xs text-gray-500">
                Continues from the day after that worker&apos;s last generated period in the selected month.
              </p>
            </div>
            <Field label="Labour">
              <select className={inputClass} name="labour" required>
                <option value="">Select labour</option>
                {labourList.map((item) => (
                  <option key={item.id} value={item.id}>{item.full_name || item.username}</option>
                ))}
              </select>
            </Field>
            <Field label="Month">
              <input className={inputClass} name="month" min="1" max="12" type="number" required />
            </Field>
            <Field label="Year">
              <input className={inputClass} name="year" min="2024" type="number" defaultValue={now.getFullYear()} required />
            </Field>
            <Field label="Deductions">
              <input className={inputClass} name="deductions" min="0" step="0.01" type="number" defaultValue="0" />
            </Field>
            <button className={btnPrimaryClass}>Generate salary</button>
          </form>
        </div>
      )}

      {!isSuperAdmin && (
        <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="text-base font-semibold text-coal">Payroll</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isSupervisor
              ? "Review salary sheets generated by admin and mark them as paid once disbursed."
              : "View salary sheets for your team."}
          </p>
          {message && <p className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{message}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-medium uppercase text-amber-800">Pending payment</p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">{pendingCount}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs font-medium uppercase text-emerald-800">Paid</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-900">{paidCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-sm xl:col-span-2">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-coal">Salary Sheets</h2>
              <p className="text-xs text-gray-500">
                {filterPeriodLabel} · {salaryRows.length} record{salaryRows.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Month</span>
                <select
                  className={`${inputClass} mt-1 min-w-[9rem]`}
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(Number(event.target.value))}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
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
                  value={filterYear}
                  onChange={(event) => setFilterYear(Number(event.target.value))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              {isSuperAdmin && (
                <button
                  type="button"
                  className={`${btnSecondaryClass} mt-5`}
                  disabled={exporting || !salaryRows.length}
                  onClick={() => void downloadPayrollXlsx()}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? "Preparing..." : "Download XLSX"}
                </button>
              )}
            </div>
          </div>
        </div>
        {salaries.isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Loading salary sheets...</p>
        ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Worker</th>
              <th className="px-4 py-2.5">Period</th>
              <th className="px-4 py-2.5">Days</th>
              <th className="px-4 py-2.5">OT Hrs</th>
              <th className="px-4 py-2.5">Gross</th>
              <th className="px-4 py-2.5">Advances</th>
              <th className="px-4 py-2.5">Deductions</th>
              <th className="px-4 py-2.5">Net Pay</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Action</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {salaryRows.map((salary, index) => (
              <DataTableRow key={salary.id} zebra={index % 2 === 1}>
                <DataTableCell className="font-medium text-gray-900">{salary.labour_name}</DataTableCell>
                <DataTableCell className="text-xs">
                  {salary.period_start && salary.period_end
                    ? `${new Date(salary.period_start).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(salary.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                    : `${salary.month}/${salary.year}`}
                </DataTableCell>
                <DataTableCell>{salary.working_days}</DataTableCell>
                <DataTableCell>{salary.overtime_hours}</DataTableCell>
                <DataTableCell>{formatCurrency(salary.gross_pay)}</DataTableCell>
                <DataTableCell>{formatCurrency(salary.advances)}</DataTableCell>
                <DataTableCell>{formatCurrency(salary.deductions)}</DataTableCell>
                <DataTableCell className="font-medium text-gray-900">{formatCurrency(salary.net_pay)}</DataTableCell>
                <DataTableCell>
                  <Badge tone={salary.payment_status === "PAID" ? "green" : "amber"}>
                    {salary.payment_status === "PAID" ? "Paid" : "Pending"}
                  </Badge>
                  {salary.payment_status === "PAID" && salary.paid_at && (
                    <p className="mt-1 text-[10px] text-gray-500">
                      {new Date(salary.paid_at).toLocaleDateString("en-IN")}
                      {salary.paid_by_name ? ` · ${salary.paid_by_name}` : ""}
                    </p>
                  )}
                </DataTableCell>
                <DataTableCell>
                  {salary.payment_status === "PENDING" && (isSupervisor || isSuperAdmin) ? (
                    <button
                      type="button"
                      className={`${btnPrimaryClass} px-3 py-1.5 text-xs`}
                      disabled={markPaid.isPending}
                      onClick={() => markPaid.mutate(salary.id)}
                    >
                      Mark paid
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        )}
        {!salaries.isLoading && !salaryRows.length && (
          <p className="px-4 py-8 text-center text-sm text-amber-700">
            Salary not generated yet for {filterPeriodLabel}.
            {isFuturePeriod ? " This month is in the future." : ""}
          </p>
        )}
      </div>
    </section>
  );
}

function OperationsManager({ module }: { module: "materials" | "vendors" | "expenses" | "machinery" | "reports" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [machineryTab, setMachineryTab] = useState<"fuel" | "machines" | "usage" | "maintenance">("fuel");
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const projects = useQuery<Paginated<Project>>({ queryKey: ["projects"], queryFn: api.projects });
  const vendors = useQuery<Paginated<Vendor>>({ queryKey: ["vendors"], queryFn: api.vendors, retry: false });
  const materials = useQuery<Paginated<Material>>({ queryKey: ["materials"], queryFn: api.materials, retry: false });
  const materialStock = useQuery<Paginated<MaterialStock>>({
    queryKey: ["material-stock"],
    queryFn: api.materialStock,
    retry: false,
  });
  const expenses = useQuery<Paginated<Expense>>({ queryKey: ["expenses"], queryFn: api.expenses, retry: false });
  const machinery = useQuery<Paginated<Machinery>>({ queryKey: ["machinery"], queryFn: api.machinery, retry: false });
  const fuelLogs = useQuery<Paginated<FuelLog>>({ queryKey: ["fuel-logs"], queryFn: api.fuelLogs, retry: false });
  const reports = useQuery<OperationsReport>({ queryKey: ["reports"], queryFn: api.reports, retry: false });

  const onSuccess = (text: string, keys: string[]) => {
    setMessage(text);
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };
  const onError = (err: unknown) => setMessage(err instanceof Error ? err.message : "Action failed.");

  const createVendor = useMutation({
    mutationFn: (payload: Parameters<typeof api.createVendor>[0]) => api.createVendor(payload),
    onSuccess: () => onSuccess("Vendor saved.", ["vendors"]),
    onError,
  });
  const createMaterial = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMaterial>[0]) => api.createMaterial(payload),
    onSuccess: () => onSuccess("Material saved.", ["materials"]),
    onError,
  });
  const saveMaterialStock = useMutation({
    mutationFn: (payload: Parameters<typeof api.saveMaterialStock>[0]) => api.saveMaterialStock(payload),
    onSuccess: () => onSuccess("Project material tracking saved.", ["material-stock", "reports", "projects"]),
    onError,
  });
  const createPurchase = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMaterialPurchase>[0]) => api.createMaterialPurchase(payload),
    onSuccess: () => onSuccess("Material purchase recorded.", ["reports"]),
    onError,
  });
  const createRequest = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMaterialRequest>[0]) => api.createMaterialRequest(payload),
    onSuccess: () => onSuccess("Material request raised.", ["reports"]),
    onError,
  });
  const createExpense = useMutation({
    mutationFn: (payload: Parameters<typeof api.createExpense>[0]) => api.createExpense(payload),
    onSuccess: () => onSuccess("Expense saved for approval.", ["expenses", "reports"]),
    onError,
  });
  const approveExpense = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) => api.approveExpense(id, action),
    onSuccess: () => onSuccess("Expense approval updated.", ["expenses", "reports"]),
    onError,
  });
  const createMachinery = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMachinery>[0]) => api.createMachinery(payload),
    onSuccess: () => {
      onSuccess("Machinery saved.", ["machinery"]);
      setMachineModalOpen(false);
    },
    onError,
  });
  const createUsage = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMachineryUsage>[0]) => api.createMachineryUsage(payload),
    onSuccess: () => onSuccess("Machinery usage recorded.", ["reports"]),
    onError,
  });
  const createFuel = useMutation({
    mutationFn: (payload: Parameters<typeof api.createFuelLog>[0]) => api.createFuelLog(payload),
    onSuccess: () => {
      onSuccess("Fuel log saved.", ["reports", "fuel-logs"]);
      setFuelModalOpen(false);
    },
    onError,
  });
  const createMaintenance = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMaintenance>[0]) => api.createMaintenance(payload),
    onSuccess: () => onSuccess("Maintenance record saved.", ["reports"]),
    onError,
  });

  const projectList = projects.data?.results ?? [];
  const vendorList = vendors.data?.results ?? [];
  const materialList = materials.data?.results ?? [];
  const materialStockList = materialStock.data?.results ?? [];
  const expenseList = expenses.data?.results ?? [];
  const machineryList = machinery.data?.results ?? [];
  const fuelLogList = fuelLogs.data?.results ?? [];

  const projectSelect = (
    <select className={inputClass} name="project" required>
      <option value="">Select project</option>
      {projectList.map((project) => (
        <option key={project.id} value={project.id}>
          {project.code} - {project.name}
        </option>
      ))}
    </select>
  );
  const fuelProjectSelect = (
    <select className={inputClass} name="project">
      <option value="">No project (optional)</option>
      {projectList.map((project) => (
        <option key={project.id} value={project.id}>
          {project.code} - {project.name}
        </option>
      ))}
    </select>
  );
  const materialSelect = (
    <select className={inputClass} name="material" required>
      <option value="">Select material</option>
      {materialList.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
  const machinerySelect = (
    <select className={inputClass} name="machinery" required>
      <option value="">Select machinery</option>
      {machineryList.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name} - {item.registration_number}
        </option>
      ))}
    </select>
  );

  return (
    <section className="space-y-4">
      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      {module === "vendors" && (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <form
            className="rounded-lg border border-gray-200/80 bg-white/90 p-4 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createVendor.mutate({
                name: formValue(form, "name"),
                gst_number: formValue(form, "gst_number"),
                address: formValue(form, "address"),
                contact_number: formValue(form, "contact_number"),
                email: formValue(form, "email"),
                bank_details: formValue(form, "bank_details"),
              });
              event.currentTarget.reset();
            }}
          >
            <h2 className="text-base font-semibold text-coal">Vendor Management</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Vendor name"><input className={inputClass} name="name" required /></Field>
              <Field label="Contact number"><input className={inputClass} name="contact_number" required /></Field>
              <Field label="GST number"><input className={inputClass} name="gst_number" /></Field>
              <Field label="Email"><input className={inputClass} name="email" type="email" /></Field>
              <div className="md:col-span-2"><Field label="Address"><textarea className={inputClass} name="address" rows={3} /></Field></div>
              <div className="md:col-span-2"><Field label="Bank details"><textarea className={inputClass} name="bank_details" rows={3} /></Field></div>
            </div>
            <button className={`${btnPrimaryClass} mt-4`}>Save Vendor</button>
          </form>
          <ListPanel title="Vendors" empty="No vendors yet.">
            {vendorList.map((item) => (
              <ListItem key={item.id} title={item.name} meta={`${item.contact_number} · GST ${item.gst_number || "NA"}`} />
            ))}
          </ListPanel>
        </div>
      )}

      {module === "materials" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <form
            className="rounded-lg border border-gray-200/80 bg-white/90 p-4 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createMaterial.mutate({
                name: formValue(form, "name"),
                unit: formValue(form, "unit"),
                low_stock_level: formValue(form, "low_stock_level") || "0",
              });
              event.currentTarget.reset();
            }}
          >
            <h2 className="text-base font-semibold text-coal">Material Master</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field label="Material"><input className={inputClass} name="name" required /></Field>
              <Field label="Unit"><input className={inputClass} name="unit" defaultValue="bags" required /></Field>
              <Field label="Low stock alert"><input className={inputClass} name="low_stock_level" type="number" defaultValue="0" /></Field>
            </div>
            <button className={`${btnPrimaryClass} mt-4`}>Save Material</button>
          </form>
          <form
            className="rounded-lg border border-gray-200/80 bg-white/90 p-4 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createPurchase.mutate({
                vendor: Number(form.get("vendor")),
                project: Number(form.get("project")),
                material: Number(form.get("material")),
                quantity: formValue(form, "quantity"),
                rate: formValue(form, "rate"),
                gst_percent: formValue(form, "gst_percent") || "0",
                invoice_number: formValue(form, "invoice_number"),
                purchase_date: formValue(form, "purchase_date"),
              });
              event.currentTarget.reset();
            }}
          >
            <h2 className="text-base font-semibold text-coal">Purchase Material</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Project">{projectSelect}</Field>
              <Field label="Material">{materialSelect}</Field>
              <Field label="Vendor">
                <select className={inputClass} name="vendor" required>
                  <option value="">Select vendor</option>
                  {vendorList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
              <Field label="Quantity"><input className={inputClass} name="quantity" type="number" required /></Field>
              <Field label="Rate"><input className={inputClass} name="rate" type="number" required /></Field>
              <Field label="GST %"><input className={inputClass} name="gst_percent" type="number" defaultValue="0" /></Field>
              <Field label="Invoice number"><input className={inputClass} name="invoice_number" /></Field>
              <Field label="Purchase date"><input className={inputClass} name="purchase_date" type="date" required /></Field>
            </div>
            <button className={`${btnPrimaryClass} mt-4`}>Record Purchase</button>
          </form>
          <form
            className="rounded-lg border border-gray-200/80 bg-white/90 p-4 shadow-sm xl:col-span-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              saveMaterialStock.mutate({
                project: Number(form.get("project")),
                material: Number(form.get("material")),
                required_quantity: formValue(form, "required_quantity") || "0",
                current_stock: formValue(form, "current_stock") || "0",
                used_stock: formValue(form, "used_stock") || "0",
                damaged_stock: formValue(form, "damaged_stock") || "0",
              });
            }}
          >
            <h2 className="text-base font-semibold text-coal">Project Material Tracking</h2>
            <p className="mt-2 text-sm text-gray-500">
              Use this when a project needs a material. Example: select Project A, Material Cement, required 500 bags, current 100 bags.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field label="Project">{projectSelect}</Field>
              <Field label="Material">{materialSelect}</Field>
              <Field label="Required quantity"><input className={inputClass} name="required_quantity" min="0" step="0.01" type="number" required /></Field>
              <Field label="Current / available stock"><input className={inputClass} name="current_stock" min="0" step="0.01" type="number" defaultValue="0" /></Field>
              <Field label="Used stock"><input className={inputClass} name="used_stock" min="0" step="0.01" type="number" defaultValue="0" /></Field>
              <Field label="Damaged stock"><input className={inputClass} name="damaged_stock" min="0" step="0.01" type="number" defaultValue="0" /></Field>
            </div>
            <button className={`${btnPrimaryClass} mt-4`}>Save Project Material</button>
          </form>

          <ListPanel title="Project Material Stock" empty="No project material tracking rows yet.">
            {materialStockList.map((row) => (
              <div key={row.id} className="rounded-2xl bg-white/75 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-coal">{row.project_name} · {row.material_name}</p>
                    <p className="text-sm text-gray-500">
                      Required {row.required_quantity} {row.material_unit} · Available {row.current_stock} {row.material_unit}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${
                    Number(row.shortage_quantity) > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}>
                    {Number(row.shortage_quantity) > 0 ? `Short ${row.shortage_quantity}` : `Remaining ${row.remaining_stock}`}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                  <p>Used: {row.used_stock} {row.material_unit}</p>
                  <p>Damaged: {row.damaged_stock} {row.material_unit}</p>
                  <p>Remaining: {row.remaining_stock} {row.material_unit}</p>
                </div>
              </div>
            ))}
          </ListPanel>

          <form
            className="rounded-lg border border-gray-200/80 bg-white/90 p-4 shadow-sm xl:col-span-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createRequest.mutate({
                project: Number(form.get("project")),
                material: Number(form.get("material")),
                quantity: formValue(form, "quantity"),
                reason: formValue(form, "reason"),
              });
              event.currentTarget.reset();
            }}
          >
            <h2 className="text-base font-semibold text-coal">Material Request Workflow</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <Field label="Project">{projectSelect}</Field>
              <Field label="Material">{materialSelect}</Field>
              <Field label="Quantity"><input className={inputClass} name="quantity" type="number" required /></Field>
              <Field label="Reason"><input className={inputClass} name="reason" /></Field>
            </div>
            <button className={`${btnPrimaryClass} mt-4`}>Raise Request</button>
          </form>
        </div>
      )}

      {module === "expenses" && (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            className="rounded-lg border border-gray-200/80 bg-white/90 p-4 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createExpense.mutate({
                project: Number(form.get("project")),
                amount: formValue(form, "amount"),
                category: formValue(form, "category"),
                description: formValue(form, "description"),
              });
              event.currentTarget.reset();
            }}
          >
            <h2 className="text-base font-semibold text-coal">Expense Entry</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Project">{projectSelect}</Field>
              <Field label="Amount"><input className={inputClass} name="amount" type="number" required /></Field>
              <Field label="Category"><input className={inputClass} name="category" defaultValue="General" /></Field>
              <Field label="Description"><input className={inputClass} name="description" required /></Field>
            </div>
            <button className={`${btnPrimaryClass} mt-4`}>Submit Expense</button>
          </form>
          <ListPanel title="Expense Approvals" empty="No expenses yet.">
            {expenseList.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-coal">{item.project_name} · {formatCurrency(item.amount)}</p>
                    <p className="text-sm text-gray-500">{item.category} · {item.description}</p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">{item.status}</span>
                </div>
                {item.status === "PENDING" && (
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white" onClick={() => approveExpense.mutate({ id: item.id, action: "approve" })}>Approve</button>
                    <button className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white" onClick={() => approveExpense.mutate({ id: item.id, action: "reject" })}>Reject</button>
                  </div>
                )}
              </div>
            ))}
          </ListPanel>
        </div>
      )}

      {module === "machinery" && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <TabBar
              active={machineryTab}
              onChange={setMachineryTab}
              tabs={[
                { id: "fuel", label: "Fuel Logs", count: fuelLogList.length },
                { id: "machines", label: "Machinery", count: machineryList.length },
                { id: "usage", label: "Usage" },
                { id: "maintenance", label: "Maintenance" },
              ]}
            />

            {machineryTab === "fuel" && (
              <>
                <Toolbar>
                  <p className="text-sm text-gray-500">{fuelLogList.length} fuel entries</p>
                  <button type="button" className={btnPrimaryClass} onClick={() => setFuelModalOpen(true)}>
                    + Add Fuel Log
                  </button>
                </Toolbar>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Machine</th>
                      <th className="px-4 py-2.5">Project</th>
                      <th className="px-4 py-2.5">Quantity</th>
                      <th className="px-4 py-2.5">Cost</th>
                      <th className="px-4 py-2.5">Meter</th>
                      <th className="px-4 py-2.5">Photos</th>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {fuelLogList.map((item, i) => (
                      <DataTableRow key={item.id} zebra={i % 2 === 1}>
                        <DataTableCell>{item.logged_date}</DataTableCell>
                        <DataTableCell className="font-medium text-gray-900">{item.machinery_name}</DataTableCell>
                        <DataTableCell>{item.project_name || "—"}</DataTableCell>
                        <DataTableCell>{item.fuel_quantity} L</DataTableCell>
                        <DataTableCell>{formatCurrency(item.fuel_cost)}</DataTableCell>
                        <DataTableCell className="text-xs text-gray-500">
                          {item.previous_meter_reading} → {item.current_meter_reading}
                        </DataTableCell>
                        <DataTableCell>
                          {item.images.length ? (
                            <div className="flex gap-1">
                              {item.images.slice(0, 3).map((photo) => {
                                const href = mediaUrl(photo.image_url);
                                if (!href) return null;
                                return (
                                  <a key={photo.id} href={href} target="_blank" rel="noopener noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={href} alt="" className="h-8 w-8 rounded border border-gray-200 object-cover" />
                                  </a>
                                );
                              })}
                              {item.images.length > 3 && <Badge tone="gray">+{item.images.length - 3}</Badge>}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                    {!fuelLogList.length && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                          No fuel logs yet. Click &quot;Add Fuel Log&quot; to create one.
                        </td>
                      </tr>
                    )}
                  </DataTableBody>
                </DataTable>
              </>
            )}

            {machineryTab === "machines" && (
              <>
                <Toolbar>
                  <p className="text-sm text-gray-500">{machineryList.length} machines · click a row for full details</p>
                  <button type="button" className={btnPrimaryClass} onClick={() => setMachineModalOpen(true)}>
                    + Add Machine
                  </button>
                </Toolbar>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Vehicle No.</th>
                      <th className="px-4 py-2.5">Registration</th>
                      <th className="px-4 py-2.5">Insurance</th>
                      <th className="px-4 py-2.5">Permit</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {machineryList.map((item, i) => (
                      <DataTableRow key={item.id} zebra={i % 2 === 1} onClick={() => router.push(`/machinery/${item.id}`)}>
                        <DataTableCell className="font-medium text-gray-900">{item.name}</DataTableCell>
                        <DataTableCell>{item.machine_type}</DataTableCell>
                        <DataTableCell>{item.vehicle_number || "—"}</DataTableCell>
                        <DataTableCell>{item.registration_number}</DataTableCell>
                        <DataTableCell className="text-xs text-gray-600">
                          {item.insurance_expiry_date
                            ? new Date(item.insurance_expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </DataTableCell>
                        <DataTableCell className="text-xs text-gray-600">
                          {item.permit_expiry_date
                            ? new Date(item.permit_expiry_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </DataTableCell>
                        <DataTableCell>
                          <Badge tone={item.active ? "green" : "gray"}>{item.active ? "Active" : "Inactive"}</Badge>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                    {!machineryList.length && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                          No machinery registered yet.
                        </td>
                      </tr>
                    )}
                  </DataTableBody>
                </DataTable>
              </>
            )}

            {machineryTab === "usage" && (
              <div className="p-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    createUsage.mutate({
                      project: Number(form.get("project")),
                      machinery: Number(form.get("machinery")),
                      operator: formValue(form, "operator"),
                      hours_used: formValue(form, "hours_used"),
                      fuel_consumption: formValue(form, "fuel_consumption") || "0",
                      usage_date: formValue(form, "usage_date"),
                    });
                    event.currentTarget.reset();
                  }}
                >
                  <FormRow label="Project">{projectSelect}</FormRow>
                  <FormRow label="Machine">{machinerySelect}</FormRow>
                  <FormRow label="Operator"><input className={inputClass} name="operator" /></FormRow>
                  <FormRow label="Hours used"><input className={inputClass} name="hours_used" type="number" required /></FormRow>
                  <FormRow label="Fuel consumption"><input className={inputClass} name="fuel_consumption" type="number" defaultValue="0" /></FormRow>
                  <FormRow label="Date"><input className={inputClass} name="usage_date" type="date" required /></FormRow>
                  <div className="mt-4 flex justify-end">
                    <button className={btnPrimaryClass}>Save Usage</button>
                  </div>
                </form>
              </div>
            )}

            {machineryTab === "maintenance" && (
              <div className="p-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    createMaintenance.mutate({
                      machinery: Number(form.get("machinery")),
                      service_date: formValue(form, "service_date"),
                      details: formValue(form, "details"),
                      cost: formValue(form, "cost") || "0",
                      next_service_due: formValue(form, "next_service_due"),
                    });
                    event.currentTarget.reset();
                  }}
                >
                  <FormRow label="Machine">{machinerySelect}</FormRow>
                  <FormRow label="Service date"><input className={inputClass} name="service_date" type="date" required /></FormRow>
                  <FormRow label="Cost"><input className={inputClass} name="cost" type="number" defaultValue="0" /></FormRow>
                  <FormRow label="Next service due"><input className={inputClass} name="next_service_due" type="date" /></FormRow>
                  <FormRow label="Details"><textarea className={inputClass} name="details" rows={3} required /></FormRow>
                  <div className="mt-4 flex justify-end">
                    <button className={btnPrimaryClass}>Save Maintenance</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <Modal
            open={fuelModalOpen}
            title="Add Fuel Log"
            subtitle="Record fuel purchase with meter readings and bill photos"
            onClose={() => setFuelModalOpen(false)}
            footer={
              <>
                <button type="button" className={btnSecondaryClass} onClick={() => setFuelModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" form="fuel-log-form" className={btnPrimaryClass} disabled={createFuel.isPending}>
                  {createFuel.isPending ? "Saving..." : "Save"}
                </button>
              </>
            }
          >
            <form
              id="fuel-log-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const billPhotos = form
                  .getAll("bill_photos")
                  .filter((file): file is File => file instanceof File && file.size > 0);
                const projectVal = form.get("project");
                createFuel.mutate({
                  project: projectVal ? Number(projectVal) : undefined,
                  machinery: Number(form.get("machinery")),
                  previous_meter_reading: formValue(form, "previous_meter_reading"),
                  current_meter_reading: formValue(form, "current_meter_reading"),
                  fuel_quantity: formValue(form, "fuel_quantity"),
                  fuel_cost: formValue(form, "fuel_cost"),
                  logged_date: formValue(form, "logged_date"),
                  bill_photos: billPhotos.length ? billPhotos : undefined,
                });
              }}
            >
              <FormRow label="Project (optional)">{fuelProjectSelect}</FormRow>
              <FormRow label="Machine">{machinerySelect}</FormRow>
              <FormRow label="Date"><input className={inputClass} name="logged_date" type="date" required /></FormRow>
              <FormRow label="Previous meter"><input className={inputClass} name="previous_meter_reading" type="number" required /></FormRow>
              <FormRow label="Current meter"><input className={inputClass} name="current_meter_reading" type="number" required /></FormRow>
              <FormRow label="Fuel quantity"><input className={inputClass} name="fuel_quantity" type="number" required /></FormRow>
              <FormRow label="Fuel cost"><input className={inputClass} name="fuel_cost" type="number" required /></FormRow>
              <FormRow label="Bill photos">
                <input className={inputClass} name="bill_photos" type="file" accept="image/*" multiple />
              </FormRow>
            </form>
          </Modal>

          <Modal
            open={machineModalOpen}
            title="Add Machinery"
            subtitle="Register machinery with insurance, permit, and documents"
            onClose={() => setMachineModalOpen(false)}
            footer={
              <>
                <button type="button" className={btnSecondaryClass} onClick={() => setMachineModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" form="machine-form" className={btnPrimaryClass} disabled={createMachinery.isPending}>
                  {createMachinery.isPending ? "Saving..." : "Save"}
                </button>
              </>
            }
          >
            <form
              id="machine-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const files = form.getAll("documents").filter((item): item is File => item instanceof File && item.size > 0);
                createMachinery.mutate({
                  name: formValue(form, "name"),
                  machine_type: formValue(form, "machine_type"),
                  registration_number: formValue(form, "registration_number"),
                  vehicle_number: formValue(form, "vehicle_number"),
                  insurance_provider: formValue(form, "insurance_provider"),
                  insurance_policy_number: formValue(form, "insurance_policy_number"),
                  insurance_start_date: formValue(form, "insurance_start_date"),
                  insurance_expiry_date: formValue(form, "insurance_expiry_date"),
                  permit_number: formValue(form, "permit_number"),
                  permit_issue_date: formValue(form, "permit_issue_date"),
                  permit_expiry_date: formValue(form, "permit_expiry_date"),
                  notes: formValue(form, "notes"),
                  active: form.get("active") === "on",
                  document_type: formValue(form, "document_type") || "OTHER",
                  documents: files.length ? files : undefined,
                });
              }}
            >
              <FormRow label="Machine name"><input className={inputClass} name="name" required /></FormRow>
              <FormRow label="Type"><input className={inputClass} name="machine_type" required placeholder="Excavator, Truck, Crane..." /></FormRow>
              <FormRow label="Vehicle number"><input className={inputClass} name="vehicle_number" placeholder="MH-12-AB-1234" /></FormRow>
              <FormRow label="Registration number"><input className={inputClass} name="registration_number" required /></FormRow>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-coal">Insurance</p>
              </div>
              <FormRow label="Provider"><input className={inputClass} name="insurance_provider" /></FormRow>
              <FormRow label="Policy number"><input className={inputClass} name="insurance_policy_number" /></FormRow>
              <FormRow label="Start date"><input className={inputClass} name="insurance_start_date" type="date" /></FormRow>
              <FormRow label="Expiry date"><input className={inputClass} name="insurance_expiry_date" type="date" /></FormRow>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-coal">Permit</p>
              </div>
              <FormRow label="Permit number"><input className={inputClass} name="permit_number" /></FormRow>
              <FormRow label="Issue date"><input className={inputClass} name="permit_issue_date" type="date" /></FormRow>
              <FormRow label="Expiry date"><input className={inputClass} name="permit_expiry_date" type="date" /></FormRow>
              <FormRow label="Notes"><textarea className={inputClass} name="notes" rows={2} /></FormRow>
              <FormRow label="Status">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="active" defaultChecked className="rounded border-gray-300" />
                  Active machine
                </label>
              </FormRow>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-coal">Documents</p>
              </div>
              <FormRow label="Document type">
                <select className={inputClass} name="document_type" defaultValue="INSURANCE">
                  <option value="INSURANCE">Insurance</option>
                  <option value="PERMIT">Permit</option>
                  <option value="RC">Registration (RC)</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormRow>
              <FormRow label="Upload files">
                <input className={inputClass} name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" />
              </FormRow>
            </form>
          </Modal>
        </>
      )}

      {module === "reports" && (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <StatCard icon={Package} label="Material Spend" value={formatCurrency(reports.data?.material_spend)} tone="bg-white/90" />
          <StatCard icon={ReceiptText} label="Approved Expenses" value={formatCurrency(reports.data?.approved_expenses)} tone="bg-white/90" />
          <StatCard icon={Truck} label="Machinery Hours" value={reports.data?.machinery_hours ?? "..."} tone="bg-white/90" />
          <StatCard icon={Factory} label="Fuel Cost" value={formatCurrency(reports.data?.fuel_cost)} tone="bg-white/90" />
          <StatCard icon={ClipboardList} label="Open Material Requests" value={reports.data?.open_material_requests ?? "..."} tone="bg-white/90" />
          <StatCard icon={Wrench} label="Maintenance Due" value={reports.data?.maintenance_due ?? "..."} tone="bg-white/90" />
        </section>
      )}
    </section>
  );
}

function OverviewPage() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const queryEnabled = Boolean(accessToken);
  const metrics = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
    enabled: queryEnabled,
  });
  const attendance = useQuery<Paginated<AttendanceRecord>>({
    queryKey: ["attendance"],
    queryFn: () => api.attendance(),
    enabled: queryEnabled,
  });

  const data = metrics.data;
  const recentAttendance = attendance.data?.results ?? [];

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Total Projects" value={data?.total_projects ?? "..."} />
        <StatCard icon={ClipboardList} label="Active Projects" value={data?.active_projects ?? "..."} />
        <StatCard icon={Users} label="Workers Present" value={data?.workers_present ?? "..."} />
        <StatCard icon={ShieldCheck} label="Pending Approvals" value={data?.pending_approvals ?? "..."} />
      </section>

      <DashboardCharts data={data} />

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <ContentCard title="Financial Overview">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-xs text-gray-500">Budget</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(data?.budget.total)}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-xs text-gray-500">Actual Cost</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(data?.budget.actual)}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
              <p className="text-xs text-gray-500">Monthly Payroll</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(data?.monthly_payroll)}</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard title="Quick Links" subtitle="Phase 1 modules">
          <ul className="space-y-2 text-sm text-gray-600">
            <li>Projects — assign teams and track budgets</li>
            <li>Labour — manage workers and attendance</li>
            <li>Payroll — wages, advances, salary sheets</li>
            <li>Machinery — fuel logs and maintenance</li>
          </ul>
        </ContentCard>
      </section>

      <ContentCard title="Recent Attendance" className="mt-4">
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Worker</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Punch In</th>
              <th className="px-4 py-2.5">Approval</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {recentAttendance.slice(0, 8).map((record, i) => (
              <DataTableRow key={record.id} zebra={i % 2 === 1}>
                <DataTableCell className="font-medium text-gray-900">
                  <Link href={`/attendance/${record.id}`} className="hover:text-violet-700 hover:underline">
                    {record.labour_name || "Worker"}
                  </Link>
                </DataTableCell>
                <DataTableCell>{record.project_name}</DataTableCell>
                <DataTableCell>{record.status.replace("_", " ")}</DataTableCell>
                <DataTableCell className="text-xs">{formatDateTime(record.punch_in_at)}</DataTableCell>
                <DataTableCell>
                  <Badge tone={record.approval_status === "APPROVED" ? "green" : record.approval_status === "PENDING" ? "amber" : "red"}>
                    {record.approval_status}
                  </Badge>
                </DataTableCell>
              </DataTableRow>
            ))}
            {!recentAttendance.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  No attendance records yet.
                </td>
              </tr>
            )}
          </DataTableBody>
        </DataTable>
      </ContentCard>
    </>
  );
}

export {
  SignIn,
  OverviewPage,
  ProjectManager,
  ProjectDetail,
  PeopleManager,
  AttendanceManager,
  AttendanceHistoryPage,
  AttendanceDetailPage,
  PayrollManager,
  OperationsManager,
  LabourPanel,
};
