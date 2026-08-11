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
  LogOut,
  Pencil,
  Package,
  ReceiptText,
  ShieldCheck,
  Timer,
  Trash2,
  Truck,
  UserPlus,
  Users,
  Wrench,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/lib/api";
import { useTablePage } from "@/lib/pagination";
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
  TablePagination,
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
  LabourProfile,
  Machinery,
  Material,
  MaterialStock,
  MachineryUsage,
  MonthlyAttendance,
  OperationsReport,
  Project,
  ProjectDocument,
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
              Project control, employee attendance, payroll, and site operations in one dashboard.
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
          <p className="mt-1 text-xs text-gray-500">Admin, supervisor, or employee account.</p>
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

function mapsLink(lat?: string | number | null, lng?: string | number | null, placeQuery?: string | null) {
  if (lat != null && lng != null && lat !== "" && lng !== "") {
    // Drop a pin at exact coordinates with close zoom.
    return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=18`;
  }
  if (placeQuery && placeQuery.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery.trim())}`;
  }
  return null;
}

function osmEmbedUrl(lat?: string | number | null, lng?: string | number | null) {
  if (lat == null || lng == null || lat === "" || lng === "") return null;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  const delta = 0.004;
  const minLng = longitude - delta;
  const minLat = latitude - delta;
  const maxLng = longitude + delta;
  const maxLat = latitude + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function mediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
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

function formatWorkdayValue(value?: number) {
  if (value == null) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function attendanceWorkdayBadge(record: AttendanceRecord): { label: string; tone: "red" | "amber" | "green" | "gray" } {
  const value = Number(
    record.workday_value ??
      (record.attendance_mark === "ABSENT" ? 0 : record.attendance_mark === "HALF_DAY" ? 0.5 : record.attendance_mark === "PRESENT" ? 1 : NaN),
  );
  if (Number.isNaN(value)) return { label: "—", tone: "gray" };
  if (value === 0) return { label: "A", tone: "red" };
  if (value === 0.5) return { label: "H", tone: "amber" };
  if (value === 1) return { label: "P", tone: "green" };
  return { label: formatWorkdayValue(value), tone: "green" };
}

function resolveWorkdayValue(dayData?: MonthlyAttendance["days"][string]): number | undefined {
  if (!dayData) return undefined;
  if (dayData.workday_value != null) return Number(dayData.workday_value);
  if (dayData.attendance_mark === "ABSENT") return 0;
  if (dayData.attendance_mark === "HALF_DAY") return 0.5;
  if (dayData.present) return 1;
  return undefined;
}

function calendarDayLabel(day: number, workday?: number, hasEntry?: boolean) {
  if (!hasEntry || workday == null) return String(day);
  if (workday === 0) return "A";
  return formatWorkdayValue(workday);
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
            {data?.present_days ?? 0} workdays · {data?.total_hours ?? 0}h
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
          const workday = resolveWorkdayValue(dayData);
          return (
            <div
              key={key}
              className={`flex items-center justify-center font-black ${cellClass} ${calendarDayStyle(workday, Boolean(dayData))}`}
              title={
                dayData
                  ? `Credited workdays: ${formatWorkdayValue(workday)} · ${dayData.working_hours}h${dayData.project_name ? ` · ${dayData.project_name}` : ""}`
                  : "No attendance"
              }
            >
              {calendarDayLabel(day, workday, Boolean(dayData))}
            </div>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span><span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-green-500 text-[10px] font-black text-white">1</span>1–3 workdays</span>
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
  const embedUrl = osmEmbedUrl(lat, lng);
  return (
    <div className="rounded-md bg-gray-50 p-3 text-sm">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">{label}</p>
      {at && <p className="mt-1 text-gray-600">{formatDateTime(at)}</p>}
      {lat && lng ? (
        <div className="mt-1 space-y-2">
          <p className="text-gray-600">
            Location: {lat}, {lng}
          </p>
          {embedUrl && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <iframe
                title={`${label} map pin`}
                src={embedUrl}
                className="h-40 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:underline"
            >
              View location pin on Google Maps
            </a>
          )}
        </div>
      ) : (
        <p className="mt-1 text-gray-500">No GPS location recorded</p>
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
          <h3 className="text-base font-semibold">Employee Punch</h3>
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

function LabourCheckboxList({
  labours,
  selected,
  onChange,
  resourceLabel = "employees",
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
          Create them under <strong>Employee</strong>, then assign here.
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
  const [projectLabourIds, setProjectLabourIds] = useState<number[]>([]);
  const [projectSupervisorIds, setProjectSupervisorIds] = useState<number[]>([]);
  const [teamSyncKey, setTeamSyncKey] = useState("");
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "SUPERVISOR";

  const project = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => api.project(projectId),
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
    queryFn: () => api.machineryUsage({ projectId }),
    retry: false,
  });
  const projectAttendance = useQuery<Paginated<AttendanceRecord>>({
    queryKey: ["attendance", projectId],
    queryFn: () => api.attendance({ projectId }),
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
  const stockRows = (materialStock.data?.results ?? []).filter((row) => row.project === projectId);
  const usageRows = machineryUsage.data?.results ?? [];
  const documentList = documents.data?.results ?? [];
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
  const supervisorOtherSiteById = useMemo(() => {
    const map = new Map<number, string>();
    for (const supervisor of allSupervisors.data ?? []) {
      const other = (supervisor.assigned_projects ?? []).find((item) => item.id !== projectId);
      if (other) {
        map.set(supervisor.id, other.code ? `${other.code} · ${other.name}` : other.name);
      }
    }
    return map;
  }, [allSupervisors.data, projectId]);
  const projectLabours = allLabourOptions.filter((labour) => projectLabourIds.includes(labour.id));
  const attendanceRows = projectAttendance.data?.results ?? [];
  const liveAttendance = attendanceRows.filter((row) => row.status === "PUNCHED_IN");

  function getLabourAttendance(labourId: number) {
    return attendanceRows.find((row) => row.labour === labourId && row.status === "PUNCHED_IN");
  }

  const nextTeamSyncKey = project.data
    ? `${project.data.id}:${(project.data.labours ?? []).join(",")}:${(project.data.supervisors ?? []).join(",")}`
    : "";

  // Sync editable team selection when server project membership changes (adjust state during render).
  if (nextTeamSyncKey && nextTeamSyncKey !== teamSyncKey) {
    setTeamSyncKey(nextTeamSyncKey);
    setProjectLabourIds(project.data?.labours ?? []);
    setProjectSupervisorIds((project.data?.supervisors ?? []).slice(0, 1));
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

  const siteMeta = [p.client_name, p.location].filter(Boolean).join(" · ");
  const timelineLabel =
    p.start_date || p.end_date ? `${p.start_date || "—"} → ${p.end_date || "—"}` : "—";

  return (
    <section className="space-y-5">
      <Link href="/projects" className={`${btnSecondaryClass} text-sm`}>
        <ArrowLeft className="h-4 w-4" />
        Back to sites
      </Link>

      {message && <PageMessage>{message}</PageMessage>}

      <ContentCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {p.code && <p className="text-xs font-medium text-violet-600">{p.code}</p>}
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">{p.name}</h2>
            {siteMeta && <p className="mt-1 text-sm text-gray-500">{siteMeta}</p>}
          </div>
          <Badge tone={p.status === "ACTIVE" ? "green" : "gray"}>{p.status.replace("_", " ")}</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2.5">
            <p className="text-xs text-gray-500">Timeline</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{timelineLabel}</p>
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
                  ...(user?.role === "SUPER_ADMIN"
                    ? { supervisors: projectSupervisorIds.slice(0, 1) }
                    : {}),
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
              <p className="mt-1 text-xs text-gray-500">
                Only one supervisor per site. Uncheck the current one to choose someone else. A supervisor can also only
                belong to one site at a time.
              </p>
              <div className="mt-2">
                {canManage && user?.role === "SUPER_ADMIN" ? (
                  <MemberPicker
                    members={allSupervisorOptions}
                    selected={projectSupervisorIds.slice(0, 1)}
                    onChange={(ids) => setProjectSupervisorIds(ids.slice(0, 1))}
                    maxSelected={1}
                    emptyMessage="No supervisors found. Add them under Employee."
                    getBadge={(id) => {
                      const other = supervisorOtherSiteById.get(id);
                      if (!other || projectSupervisorIds.includes(id)) return null;
                      return { label: `On ${other}`, tone: "amber" };
                    }}
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
            <SubsectionTitle>Employees</SubsectionTitle>
            <p className="mt-1 text-xs text-gray-500">Workers assigned to this site.</p>
            <div className="mt-2">
              {canManage ? (
                <MemberPicker
                  members={allLabourOptions}
                  selected={projectLabourIds}
                  onChange={setProjectLabourIds}
                  getBadge={labourSiteBadge}
                  emptyMessage="No workers found. Add them under Employee."
                />
              ) : (
                <MemberList
                  members={projectLabours}
                  getBadge={labourSiteBadge}
                  emptyMessage="No employees assigned to this project."
                />
              )}
            </div>
          </div>
        </div>
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
              <div
                key={usage.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  usage.over_consumption ? "border-red-200 bg-red-50" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900">{usage.machinery_name}</p>
                  {usage.over_consumption && <Badge tone="red">Over consumption</Badge>}
                </div>
                <p className={`text-xs ${usage.over_consumption ? "text-red-700" : "text-gray-500"}`}>
                  {usage.fuel_consumption}L · {usage.km_used} km · {usage.hours_used}h · {usage.operator || "No operator"} · {usage.usage_date}
                </p>
                {(usage.expected_km != null || usage.expected_hours != null) && (
                  <p className={`mt-1 text-xs ${usage.over_consumption ? "text-red-600" : "text-gray-400"}`}>
                    Expected for this fuel: {usage.expected_km != null ? `${usage.expected_km} km` : "—"}
                    {" · "}
                    {usage.expected_hours != null ? `${usage.expected_hours} hrs` : "—"}
                  </p>
                )}
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
  const [editingSite, setEditingSite] = useState<Project | null>(null);
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
      setMessage("Site created successfully.");
      setSupervisors([]);
      setLabours([]);
      setEditingSite(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Site creation failed."),
  });

  const updateSite = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof api.updateProject>[1];
    }) => api.updateProject(id, payload),
    onSuccess: () => {
      setMessage("Site updated successfully.");
      setSupervisors([]);
      setLabours([]);
      setEditingSite(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Site update failed."),
  });

  const deleteSite = useMutation({
    mutationFn: (id: number) => api.deleteProject(id),
    onSuccess: () => {
      setMessage("Site deleted.");
      if (editingSite) {
        setEditingSite(null);
        setSupervisors([]);
        setLabours([]);
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) =>
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not delete site. It may have attendance or other linked records.",
      ),
  });

  function startEdit(site: Project) {
    setEditingSite(site);
    setSupervisors((site.supervisors ?? []).slice(0, 1));
    setLabours([...(site.labours ?? [])]);
    setMessage("");
  }

  function cancelEdit() {
    setEditingSite(null);
    setSupervisors([]);
    setLabours([]);
  }

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const startDate = String(form.get("start_date") ?? "").trim();
    const endDate = String(form.get("end_date") ?? "").trim();
    const budget = String(form.get("estimated_budget") ?? "").trim();
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      code: String(form.get("code") ?? "").trim(),
      client_name: String(form.get("client_name") ?? "").trim(),
      location: String(form.get("location") ?? "").trim(),
      start_date: startDate || null,
      end_date: endDate || null,
      estimated_budget: budget || "0",
      status: String(form.get("status") ?? "ACTIVE") as Project["status"],
      description: String(form.get("description") ?? ""),
      supervisors: supervisors.slice(0, 1),
      labours,
    };
    if (!payload.name) {
      setMessage("Site name is required.");
      return;
    }
    if (editingSite) {
      updateSite.mutate({ id: editingSite.id, payload });
      return;
    }
    createProject.mutate(payload);
    event.currentTarget.reset();
  }

  function confirmDelete(site: Project) {
    if (
      !window.confirm(
        `Delete site "${site.name}" (${site.code})? This cannot be undone if the site has no protected records.`,
      )
    ) {
      return;
    }
    deleteSite.mutate(site.id);
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
  const formBusy = createProject.isPending || updateSite.isPending;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const showSiteForm = isSuperAdmin || Boolean(editingSite);

  return (
    <section className={`grid gap-4 ${showSiteForm ? "xl:grid-cols-[0.9fr_1.1fr]" : ""}`}>
      {showSiteForm && (
      <form
        key={editingSite ? `edit-${editingSite.id}` : "create"}
        onSubmit={submitProject}
        className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <FolderPlus className="h-6 w-6 text-safety" />
          <h2 className="text-base font-semibold text-coal">{editingSite ? "Edit site" : "Create site"}</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Site name">
            <input className={inputClass} name="name" required defaultValue={editingSite?.name ?? ""} />
          </Field>
          <Field label="Site code">
            <input className={inputClass} name="code" placeholder="Auto-generated if empty" defaultValue={editingSite?.code ?? ""} />
          </Field>
          <Field label="Client name">
            <input className={inputClass} name="client_name" defaultValue={editingSite?.client_name ?? ""} />
          </Field>
          <Field label="Location">
            <input className={inputClass} name="location" defaultValue={editingSite?.location ?? ""} />
          </Field>
          <Field label="Start date">
            <input className={inputClass} name="start_date" type="date" defaultValue={editingSite?.start_date ?? ""} />
          </Field>
          <Field label="End date">
            <input className={inputClass} name="end_date" type="date" defaultValue={editingSite?.end_date ?? ""} />
          </Field>
          <Field label="Estimated budget">
            <input
              className={inputClass}
              name="estimated_budget"
              min="0"
              step="0.01"
              type="number"
              defaultValue={editingSite?.estimated_budget ?? ""}
            />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="status" defaultValue={editingSite?.status ?? "ACTIVE"}>
              {["DRAFT", "PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          {user?.role === "SUPER_ADMIN" && (
            <Field label="Assign supervisor">
              <p className="mb-2 text-xs text-gray-500">Only one supervisor per site.</p>
              <MemberPicker
                members={supervisorList.map((item) => ({
                  id: item.id,
                  username: item.username,
                  full_name: item.full_name,
                  role: item.role,
                  mobile_number: item.mobile_number,
                }))}
                selected={supervisors.slice(0, 1)}
                onChange={(ids) => setSupervisors(ids.slice(0, 1))}
                maxSelected={1}
                emptyMessage="No supervisors found."
              />
            </Field>
          )}
          {(user?.role === "SUPER_ADMIN" || user?.role === "SUPERVISOR") && (
            <div className="md:col-span-2">
              <Field label="Assign employees">
                <LabourCheckboxList labours={labourList} selected={labours} onChange={setLabours} />
              </Field>
            </div>
          )}
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea className={inputClass} name="description" rows={4} defaultValue={editingSite?.description ?? ""} />
            </Field>
          </div>
        </div>
        {message && <p className="mt-4 rounded-2xl bg-safety/15 px-4 py-3 text-sm font-semibold text-coal">{message}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={btnPrimaryClass} disabled={formBusy}>
            {formBusy
              ? editingSite
                ? "Saving..."
                : "Creating..."
              : editingSite
                ? "Save site"
                : "Create site"}
          </button>
          {editingSite && (
            <button type="button" className={btnSecondaryClass} onClick={cancelEdit} disabled={formBusy}>
              Cancel
            </button>
          )}
        </div>
      </form>
      )}

      <div className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-coal">{isSuperAdmin ? "Site list" : "My site"}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {isSuperAdmin
            ? "Open a site for team and details, or edit/delete here."
            : "Only your assigned site is shown."}
        </p>
        {!showSiteForm && message && (
          <p className="mt-3 rounded-2xl bg-safety/15 px-4 py-3 text-sm font-semibold text-coal">{message}</p>
        )}
        <div className="mt-5 space-y-2">
          {projectList.map((project) => (
            <div
              key={project.id}
              className="flex w-full items-center gap-2 rounded-2xl border border-gray-100 bg-cement p-3 transition hover:border-safety/40 hover:bg-safety/5"
            >
              <Link href={`/projects/${project.id}`} className="min-w-0 flex-1 text-left">
                <p className="font-semibold text-coal">
                  {project.code ? `${project.code} · ${project.name}` : project.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{project.location || "No location"}</p>
              </Link>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(project.status)}`}>
                {project.status.replace("_", " ")}
              </span>
              {isSuperAdmin && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className={`${btnSecondaryClass} inline-flex items-center gap-1 px-2.5 py-1.5 text-xs`}
                    onClick={() => startEdit(project)}
                    title="Edit site"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className={`${btnSecondaryClass} inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-700 hover:border-red-200 hover:bg-red-50`}
                    onClick={() => confirmDelete(project)}
                    disabled={deleteSite.isPending}
                    title="Delete site"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {!projectList.length && (
            <p className="rounded-md bg-gray-50 p-5 text-gray-500">
              {isSuperAdmin ? "No sites created yet." : "No site assigned to you yet."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function PeopleManager({ user }: { user: AuthUser | null }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [createRole, setCreateRole] = useState<"SUPERVISOR" | "SUPER_ADMIN">("SUPERVISOR");
  const [selected, setSelected] = useState<number[]>([]);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const supervisors = useQuery<AuthUser[]>({
    queryKey: ["supervisors"],
    queryFn: api.supervisors,
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
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["labours"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "User creation failed."),
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

  const bulkDeleteSupervisors = useMutation({
    mutationFn: api.bulkDeleteSupervisors,
    onSuccess: (result) => {
      if (result.skipped_count > 0) {
        const reasons = result.skipped.map((item) => `#${item.id}: ${item.error}`).join("; ");
        setMessage(
          result.deleted_count > 0
            ? `Removed ${result.deleted_count} supervisors. Skipped ${result.skipped_count}: ${reasons}`
            : `Could not remove supervisors. Skipped ${result.skipped_count}: ${reasons}`,
        );
      } else {
        setMessage(`Removed ${result.deleted_count} supervisors.`);
      }
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Bulk remove failed."),
  });

  function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const role = isSuperAdmin
      ? (String(form.get("role") ?? "SUPERVISOR") as AuthUser["role"])
      : "LABOUR";
    createUser.mutate({
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      first_name: String(form.get("first_name") ?? ""),
      last_name: String(form.get("last_name") ?? ""),
      email: String(form.get("email") ?? ""),
      mobile_number: String(form.get("mobile_number") ?? ""),
      role,
      ...(role === "SUPERVISOR"
        ? {
            salary: String(form.get("salary") ?? "0") || "0",
            daily_salary: String(form.get("daily_salary") ?? "") || null,
          }
        : {}),
    });
    event.currentTarget.reset();
    setCreateRole("SUPERVISOR");
  }

  const supervisorList = supervisors.data ?? [];
  const labourList = labours.data ?? [];
  const listRows = isSuperAdmin ? supervisorList : labourList;
  const allSelected = listRows.length > 0 && listRows.every((item) => selected.includes(item.id));
  const deleting = deleteSupervisor.isPending || bulkDeleteSupervisors.isPending;

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected((prev) => (allSelected ? [] : listRows.map((item) => item.id)));
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={submitUser} className="rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-safety" />
          <h2 className="text-base font-semibold text-coal">
            {isSuperAdmin ? "Create Supervisor" : "Create Employee"}
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
              <select
                className={inputClass}
                name="role"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as typeof createRole)}
              >
                <option value="SUPERVISOR">Supervisor</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </Field>
          ) : (
            <input type="hidden" name="role" value="LABOUR" />
          )}
          {isSuperAdmin && createRole === "SUPERVISOR" && (
            <>
              <Field label="Monthly salary">
                <input className={inputClass} name="salary" type="number" min="0" step="0.01" defaultValue="0" />
              </Field>
              <Field label="Per day salary">
                <input className={inputClass} name="daily_salary" type="number" min="0" step="0.01" placeholder="Optional — else monthly ÷ 26" />
              </Field>
            </>
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

      <div className="overflow-hidden rounded-lg border border-gray-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-coal">{isSuperAdmin ? "Supervisors" : "Employees"}</h2>
            <p className="text-xs text-gray-500">{listRows.length} {isSuperAdmin ? "supervisor" : "worker"}{listRows.length === 1 ? "" : "s"}</p>
          </div>
          {isSuperAdmin && selected.length > 0 && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
              disabled={deleting}
              onClick={() => {
                if (!window.confirm(`Remove ${selected.length} selected supervisor${selected.length === 1 ? "" : "s"}? This cannot be undone.`)) {
                  return;
                }
                bulkDeleteSupervisors.mutate(selected);
              }}
            >
              <Trash2 className="h-4 w-4" />
              {bulkDeleteSupervisors.isPending ? "Removing..." : `Remove selected (${selected.length})`}
            </button>
          )}
        </div>
        <DataTable>
          <DataTableHead>
            <tr>
              {isSuperAdmin && (
                <th className="px-4 py-2.5">
                  <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} disabled={!listRows.length} />
                </th>
              )}
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Mobile</th>
              <th className="px-4 py-2.5">Username</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {listRows.map((item, i) => (
              <DataTableRow key={item.id} zebra={i % 2 === 1}>
                {isSuperAdmin && (
                  <DataTableCell>
                    <input type="checkbox" aria-label={`Select ${item.full_name || item.username}`} checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                  </DataTableCell>
                )}
                <DataTableCell className="font-medium text-gray-900">{item.full_name || item.username}</DataTableCell>
                <DataTableCell>{item.mobile_number || "—"}</DataTableCell>
                <DataTableCell>{item.username}</DataTableCell>
                <DataTableCell>
                  <div className="flex items-center gap-3">
                    {item.role === "SUPERVISOR" ? (
                      <Link href={`/supervisors/${item.id}`} className="text-sm font-medium text-violet-700 hover:underline">
                        View profile
                      </Link>
                    ) : item.role === "LABOUR" && item.labour_profile_id ? (
                      <Link href={`/workers/${item.labour_profile_id}`} className="text-sm font-medium text-violet-700 hover:underline">
                        View profile
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {isSuperAdmin && item.role === "SUPERVISOR" && (
                      <button
                        type="button"
                        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
                        disabled={deleting}
                        onClick={() => {
                          if (!window.confirm(`Remove ${item.full_name || item.username}? This cannot be undone.`)) return;
                          deleteSupervisor.mutate(item.id);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
            {!listRows.length && (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-10 text-center text-sm text-gray-500">
                  {isSuperAdmin ? "No supervisors yet." : "No employees yet."}
                </td>
              </tr>
            )}
          </DataTableBody>
        </DataTable>
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
  const searchParams = useSearchParams();
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const idsParam = searchParams.get("ids") || undefined;
  const labourIdsParam = searchParams.get("labour_ids") || undefined;
  const approvedByParam = searchParams.get("approved_by");
  const approvedBy = approvedByParam && /^\d+$/.test(approvedByParam) ? Number(approvedByParam) : undefined;
  const markedAtParam = searchParams.get("marked_at") || undefined;
  const projectParam = searchParams.get("project");
  const projectFilter = projectParam && /^\d+$/.test(projectParam) ? Number(projectParam) : undefined;

  const attendance = useQuery<Paginated<AttendanceRecord>>({
    queryKey: ["attendance", idsParam, labourIdsParam, approvedBy, markedAtParam, projectFilter],
    queryFn: () =>
      api.attendance({
        ids: idsParam,
        labour_ids: labourIdsParam,
        approved_by: approvedBy,
        marked_at: markedAtParam,
        project: projectFilter,
      }),
    enabled: hydrated && Boolean(accessToken),
  });

  const rows = attendance.data?.results ?? [];
  const rowsPage = useTablePage(rows, {
    resetKey: `${idsParam ?? ""}-${labourIdsParam ?? ""}-${approvedBy ?? ""}-${markedAtParam ?? ""}-${projectFilter ?? ""}`,
  });
  const filtered = Boolean(idsParam || labourIdsParam || approvedBy || markedAtParam);

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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/attendance" className={`${btnSecondaryClass} text-xs`}>
            <ArrowLeft className="h-4 w-4" />
            Back to attendance
          </Link>
          {filtered && (
            <Link href="/attendance/history" className={`${btnSecondaryClass} text-xs`}>
              Clear filter
            </Link>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {rows.length} record{rows.length === 1 ? "" : "s"}
          {filtered ? " (filtered)" : ""}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-coal">{filtered ? "Filtered Attendance Records" : "All Attendance Records"}</h2>
          <p className="text-xs text-gray-500">Click a row to view photos, location, and details</p>
        </div>
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Worker</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Workday</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Attendance by</th>
              <th className="px-4 py-2.5">Location</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rowsPage.pageRows.map((record, i) => {
              const workday = attendanceWorkdayBadge(record);
              const mapUrl = mapsLink(record.punch_in_latitude, record.punch_in_longitude);
              return (
                <DataTableRow
                  key={record.id}
                  zebra={i % 2 === 1}
                  onClick={() => router.push(`/attendance/${record.id}`)}
                >
                  <DataTableCell className="font-medium text-gray-900">{record.labour_name || "Worker"}</DataTableCell>
                  <DataTableCell>{formatDate(record.punch_in_at)}</DataTableCell>
                  <DataTableCell>
                    <Badge tone={workday.tone}>{workday.label}</Badge>
                  </DataTableCell>
                  <DataTableCell>{record.project_name || "—"}</DataTableCell>
                  <DataTableCell>{record.attendance_by || "—"}</DataTableCell>
                  <DataTableCell>
                    {mapUrl ? (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-violet-700 hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        View location pin
                      </a>
                    ) : (
                      "—"
                    )}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
        <TablePagination
          page={rowsPage.page}
          totalPages={rowsPage.totalPages}
          total={rowsPage.total}
          pageSize={rowsPage.pageSize}
          from={rowsPage.from}
          to={rowsPage.to}
          onPageChange={rowsPage.setPage}
        />
        {!rows.length && <p className="px-4 py-8 text-center text-sm text-gray-500">No attendance records yet.</p>}
      </div>
    </section>
  );
}

function localDateIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Most recent Tuesday on or before `from` (local). */
function mostRecentTuesday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const daysSinceTue = (d.getDay() + 5) % 7; // Sun=0 → 5, Mon=1 → 6, Tue=2 → 0
  d.setDate(d.getDate() - daysSinceTue);
  return d;
}

const PAYROLL_DAY_LABELS = ["Wed", "Thr", "Fri", "Sat", "Sun", "Mon", "Tues"] as const;

function payrollWeekForOffset(weekOffset: number) {
  const weekEnd = mostRecentTuesday();
  weekEnd.setDate(weekEnd.getDate() + weekOffset * 7);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return {
      key: localDateIso(day),
      label: PAYROLL_DAY_LABELS[i],
      dateLabel: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).replace(" ", "-"),
    };
  });
  return {
    weekStart: localDateIso(weekStart),
    weekEnd: localDateIso(weekEnd),
    rangeLabel: `${days[0].dateLabel} – ${days[6].dateLabel}`,
    days,
  };
}

function formatWeekMark(value?: number) {
  if (value == null) return "—";
  if (value === 0) return "A";
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

function AttendanceManager() {
  const queryClient = useQueryClient();
  const hydrated = useAppSelector((state) => state.auth.hydrated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const today = new Date();
  const todayLocalKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [selectedDates, setSelectedDates] = useState<string[]>([todayLocalKey]);
  const [selected, setSelected] = useState<number[]>([]);
  const [workdayValue, setWorkdayValue] = useState(1);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<
    Array<{ labour_id: number; date?: string; error: string; existing_workday?: number | null }>
  >([]);
  const [markerCoords, setMarkerCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [nameFilter, setNameFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  /** 0 = current Wed–Tue payroll week; -1 previous; +1 upcoming */
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedAttendanceId, setExpandedAttendanceId] = useState<number | null>(null);
  const [allWeekOpen, setAllWeekOpen] = useState(false);
  const [allWeekNameFilter, setAllWeekNameFilter] = useState("");
  const [allWeekDesignationFilter, setAllWeekDesignationFilter] = useState("all");
  const [allWeekProjectFilter, setAllWeekProjectFilter] = useState("all");
  const [allWeekOffset, setAllWeekOffset] = useState(0);

  const workers = useQuery({
    queryKey: ["labour-workers", "attendance-bulk"],
    queryFn: () => api.labourWorkers({ ordering: "user__first_name", page_size: 200 }),
    enabled: hydrated && Boolean(accessToken),
  });

  const supervisors = useQuery({
    queryKey: ["supervisors", "attendance-bulk"],
    queryFn: api.supervisors,
    enabled: hydrated && Boolean(accessToken) && isSuperAdmin,
  });

  const projects = useQuery({
    queryKey: ["projects", "attendance-filters"],
    queryFn: api.projects,
    enabled: hydrated && Boolean(accessToken),
  });

  const labourRows = useMemo(() => {
    const workerRows = (workers.data?.results ?? []).map((worker) => ({
      id: worker.user_id,
      full_name: worker.full_name || worker.username,
      mobile_number: worker.mobile_number,
      designation:
        worker.designation === "DRIVER"
          ? "Driver"
          : worker.designation === "OFFICE_STAFF"
            ? "Office Staff"
            : worker.designation === "LABOUR"
              ? "Labour"
              : worker.designation || "Labour",
      assigned_projects: worker.assigned_projects ?? [],
    }));
    if (!isSuperAdmin) return workerRows;
    const supervisorRows = (supervisors.data ?? []).map((supervisor) => ({
      id: supervisor.id,
      full_name: supervisor.full_name || supervisor.username,
      mobile_number: supervisor.mobile_number,
      designation: "Supervisor",
      assigned_projects: supervisor.assigned_projects ?? [],
    }));
    return [...workerRows, ...supervisorRows].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [workers.data?.results, supervisors.data, isSuperAdmin]);

  const projectList = projects.data?.results ?? [];

  const filteredLabourRows = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    return labourRows.filter((row) => {
      if (name && !row.full_name.toLowerCase().includes(name) && !(row.mobile_number || "").toLowerCase().includes(name)) {
        return false;
      }
      if (designationFilter !== "all" && row.designation !== designationFilter) {
        return false;
      }
      if (projectFilter === "unassigned") {
        return row.assigned_projects.length === 0;
      }
      if (projectFilter !== "all") {
        const projectId = Number(projectFilter);
        return row.assigned_projects.some((project) => project.id === projectId);
      }
      return true;
    });
  }, [labourRows, nameFilter, designationFilter, projectFilter]);

  const allIds = useMemo(() => filteredLabourRows.map((row) => row.id), [filteredLabourRows]);
  const workersPage = useTablePage(filteredLabourRows, {
    pageSize: 20,
    resetKey: `${nameFilter}-${designationFilter}-${projectFilter}`,
  });

  const payrollWeek = useMemo(() => payrollWeekForOffset(weekOffset), [weekOffset]);
  const weekDayKeys = useMemo(() => payrollWeek.days.map((d) => d.key), [payrollWeek.days]);
  const canGoNextPayrollWeek = payrollWeekForOffset(weekOffset + 1).weekStart <= todayLocalKey;
  const attendancePopupEmployee = useMemo(
    () => (expandedAttendanceId == null ? null : labourRows.find((row) => row.id === expandedAttendanceId) ?? null),
    [expandedAttendanceId, labourRows],
  );

  const allPayrollWeek = useMemo(() => payrollWeekForOffset(allWeekOffset), [allWeekOffset]);
  const allWeekDayKeys = useMemo(() => allPayrollWeek.days.map((d) => d.key), [allPayrollWeek.days]);
  const canGoNextAllWeek = payrollWeekForOffset(allWeekOffset + 1).weekStart <= todayLocalKey;

  const allWeekFilteredRows = useMemo(() => {
    const name = allWeekNameFilter.trim().toLowerCase();
    return labourRows.filter((row) => {
      if (name && !row.full_name.toLowerCase().includes(name) && !(row.mobile_number || "").toLowerCase().includes(name)) {
        return false;
      }
      if (allWeekDesignationFilter !== "all" && row.designation !== allWeekDesignationFilter) {
        return false;
      }
      if (allWeekProjectFilter === "unassigned") {
        return row.assigned_projects.length === 0;
      }
      if (allWeekProjectFilter !== "all") {
        const projectId = Number(allWeekProjectFilter);
        return row.assigned_projects.some((project) => project.id === projectId);
      }
      return true;
    });
  }, [labourRows, allWeekNameFilter, allWeekDesignationFilter, allWeekProjectFilter]);

  const weekAttendance = useQuery({
    queryKey: ["attendance", "payroll-week", payrollWeek.weekStart, payrollWeek.weekEnd, expandedAttendanceId],
    queryFn: () =>
      api.attendance({
        labourId: expandedAttendanceId!,
        date_from: payrollWeek.weekStart,
        date_to: payrollWeek.weekEnd,
        page_size: 50,
      }),
    enabled: hydrated && Boolean(accessToken) && expandedAttendanceId != null,
  });

  const popupWeekMarks = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const record of weekAttendance.data?.results ?? []) {
      const dayKey = (record.punch_in_at || "").slice(0, 10);
      if (!weekDayKeys.includes(dayKey)) continue;
      const raw = record.workday_value;
      const value = raw == null || raw === "" ? NaN : Number(raw);
      if (Number.isNaN(value)) continue;
      const existing = byDay[dayKey];
      byDay[dayKey] = existing == null ? value : Math.max(existing, value);
    }
    return byDay;
  }, [weekAttendance.data?.results, weekDayKeys]);

  const allWeekAttendance = useQuery({
    queryKey: [
      "attendance",
      "payroll-week-all",
      allPayrollWeek.weekStart,
      allPayrollWeek.weekEnd,
      allWeekFilteredRows.map((r) => r.id).join(","),
    ],
    queryFn: () =>
      api.attendance({
        labour_ids: allWeekFilteredRows.map((r) => r.id),
        date_from: allPayrollWeek.weekStart,
        date_to: allPayrollWeek.weekEnd,
        page_size: 2000,
      }),
    enabled: hydrated && Boolean(accessToken) && allWeekOpen && allWeekFilteredRows.length > 0,
  });

  const allWeekMarksByLabour = useMemo(() => {
    const map = new Map<number, Record<string, number>>();
    for (const record of allWeekAttendance.data?.results ?? []) {
      const dayKey = (record.punch_in_at || "").slice(0, 10);
      if (!allWeekDayKeys.includes(dayKey)) continue;
      const raw = record.workday_value;
      const value = raw == null || raw === "" ? NaN : Number(raw);
      if (Number.isNaN(value)) continue;
      const byDay = map.get(record.labour) ?? {};
      const existing = byDay[dayKey];
      byDay[dayKey] = existing == null ? value : Math.max(existing, value);
      map.set(record.labour, byDay);
    }
    return map;
  }, [allWeekAttendance.data?.results, allWeekDayKeys]);

  function openAllWeekAttendance() {
    setAllWeekNameFilter(nameFilter);
    setAllWeekDesignationFilter(designationFilter);
    setAllWeekProjectFilter(projectFilter);
    setAllWeekOffset(0);
    setExpandedAttendanceId(null);
    setAllWeekOpen(true);
  }

  const workdayOptions = [
    { value: 0, label: "A", hint: "Absent" },
    { value: 0.5, label: "H", hint: "0.5 day" },
    { value: 1, label: "P", hint: "1 day" },
    { value: 1.5, label: "1.5", hint: "1.5 days" },
    { value: 2, label: "2", hint: "2 days" },
    { value: 2.5, label: "2.5", hint: "2.5 days" },
    { value: 3, label: "3", hint: "3 days" },
  ] as const;

  function workdayLabel(value?: number | null) {
    if (value == null) return "—";
    if (value === 0) return "A";
    if (value === 0.5) return "H";
    if (value === 1) return "P";
    return String(value);
  }

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const startWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  const monthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const todayKey = todayLocalKey;
  const canGoNextMonth =
    calendarYear < today.getFullYear() ||
    (calendarYear === today.getFullYear() && calendarMonth < today.getMonth());

  function toDateKey(day: number) {
    return `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function isDateSelectable(day: number) {
    return toDateKey(day) <= todayKey;
  }

  function toggleDate(day: number) {
    if (!isDateSelectable(day)) return;
    const key = toDateKey(day);
    setSelectedDates((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key].sort()));
  }

  function shiftMonth(delta: number) {
    if (delta > 0 && !canGoNextMonth) return;
    const next = new Date(calendarYear, calendarMonth + delta, 1);
    // Do not navigate into a future month.
    if (
      next.getFullYear() > today.getFullYear() ||
      (next.getFullYear() === today.getFullYear() && next.getMonth() > today.getMonth())
    ) {
      return;
    }
    setCalendarMonth(next.getMonth());
    setCalendarYear(next.getFullYear());
  }

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function togglePage() {
    const pageIds = workersPage.pageRows.map((row) => row.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
    setSelected((prev) => {
      if (allSelected) return prev.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...prev, ...pageIds]));
    });
  }

  function buildPayload(
    overwrite = false,
    coords: { latitude?: number; longitude?: number } = markerCoords,
  ) {
    return {
      labour_ids: selected,
      dates: selectedDates,
      punch_in_time: workdayValue === 0 ? undefined : "09:00",
      punch_out_time: workdayValue === 0 ? undefined : "18:00",
      workday_value: workdayValue,
      overwrite,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }

  function readMarkerLocation(): Promise<{ latitude?: number; longitude?: number }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
      );
    });
  }

  function summarizeResult(result: Awaited<ReturnType<typeof api.bulkAttendance>>, overwritePass: boolean) {
    const parts: string[] = [];
    if (result.created_count > 0) parts.push(`Marked ${result.created_count}`);
    if ((result.updated_count ?? 0) > 0) parts.push(`Updated ${result.updated_count}`);
    const hardSkips = (result.skipped ?? []).filter((item) => !item.conflict);
    if (hardSkips.length) {
      parts.push(
        `Skipped ${hardSkips.length}: ${hardSkips
          .map((item) => {
            const person = labourRows.find((row) => row.id === item.labour_id);
            return `${person?.full_name || `#${item.labour_id}`}${item.date ? ` (${item.date})` : ""}: ${item.error}`;
          })
          .join("; ")}`,
      );
    }
    if (!parts.length && !overwritePass) return "";
    if (!parts.length) return "No changes made.";
    return parts.join(". ") + ".";
  }

  const bulk = useMutation({
    mutationFn: ({ overwrite, coords }: { overwrite: boolean; coords?: { latitude?: number; longitude?: number } }) =>
      api.bulkAttendance(buildPayload(overwrite, coords ?? markerCoords)),
    onSuccess: async (result, variables) => {
      const conflicts = (result.conflicts?.length ? result.conflicts : result.skipped?.filter((s) => s.conflict)) ?? [];
      if (!variables.overwrite && conflicts.length) {
        setPendingConflicts(conflicts);
        setConfirmOpen(true);
        const summary = summarizeResult(result, false);
        setMessage(
          summary
            ? `${summary} ${conflicts.length} existing mark${conflicts.length === 1 ? "" : "s"} need confirmation.`
            : `${conflicts.length} existing attendance mark${conflicts.length === 1 ? "" : "s"} found. Confirm to overwrite.`,
        );
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        return;
      }
      setConfirmOpen(false);
      setPendingConflicts([]);
      setMessage(summarizeResult(result, true) || "Attendance saved.");
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Bulk attendance failed."),
  });

  const overwriteBulk = useMutation({
    mutationFn: async () => {
      const byDate = new Map<string, number[]>();
      for (const item of pendingConflicts) {
        if (!item.date) continue;
        const list = byDate.get(item.date) ?? [];
        list.push(item.labour_id);
        byDate.set(item.date, list);
      }
      let created = 0;
      let updated = 0;
      const skipped: Array<{ labour_id: number; date?: string; error: string }> = [];
      for (const [date, labour_ids] of byDate.entries()) {
        const result = await api.bulkAttendance({
          labour_ids: Array.from(new Set(labour_ids)),
          dates: [date],
          punch_in_time: workdayValue === 0 ? undefined : "09:00",
          punch_out_time: workdayValue === 0 ? undefined : "18:00",
          workday_value: workdayValue,
          overwrite: true,
          latitude: markerCoords.latitude,
          longitude: markerCoords.longitude,
        });
        created += result.created_count;
        updated += result.updated_count ?? 0;
        skipped.push(...(result.skipped ?? []).filter((item) => !item.conflict));
      }
      return { created_count: created, updated_count: updated, skipped_count: skipped.length, created_ids: [], skipped };
    },
    onSuccess: (result) => {
      setConfirmOpen(false);
      setPendingConflicts([]);
      setMessage(summarizeResult(result, true));
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Overwrite failed."),
  });

  async function markAttendance() {
    setMessage("");
    if (!selected.length) {
      setMessage("Select at least one employee.");
      return;
    }
    if (!selectedDates.length) {
      setMessage("Select at least one date on the calendar.");
      return;
    }
    const coords = await readMarkerLocation();
    setMarkerCoords(coords);
    bulk.mutate({ overwrite: false, coords });
  }

  const pageIds = workersPage.pageRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const saving = bulk.isPending || overwriteBulk.isPending;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200/80 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Timer className="h-5 w-5 text-safety" />
          <div>
            <h2 className="text-sm font-semibold text-coal">Employee Attendance</h2>
            <p className="text-xs text-gray-500">Select employees, dates, and workday mark.</p>
          </div>
        </div>
        <Link href="/attendance/history" className={`${btnSecondaryClass} py-1.5 text-xs`}>
          <History className="h-3.5 w-3.5" />
          View All Records
        </Link>
      </div>

      {message && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.75fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2">
            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.2fr)_minmax(7.5rem,0.7fr)_minmax(8.5rem,1fr)] items-center gap-2">
              <input
                className={`${inputClass} w-full py-1.5 text-sm`}
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Name"
                aria-label="Filter by name"
              />
              <select
                className={`${inputClass} w-full py-1.5 text-sm`}
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                aria-label="Filter by designation"
              >
                <option value="all">Designation</option>
                <option value="Labour">Labour</option>
                <option value="Driver">Driver</option>
                <option value="Office Staff">Office Staff</option>
                {isSuperAdmin ? <option value="Supervisor">Supervisor</option> : null}
              </select>
              <select
                className={`${inputClass} w-full py-1.5 text-sm`}
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Filter by project"
              >
                <option value="all">Project</option>
                <option value="unassigned">Unassigned</option>
                {projectList.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} · {project.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={`${btnSecondaryClass} shrink-0 py-1.5 text-xs`}
              onClick={openAllWeekAttendance}
            >
              All week attendance
            </button>
          </div>
          <DataTable>
            <DataTableHead>
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allPageSelected}
                    onChange={togglePage}
                    disabled={!pageIds.length}
                  />
                </th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Designation</th>
                <th className="px-3 py-2">Projects</th>
                <th className="px-3 py-2">Attendance</th>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {workersPage.pageRows.map((worker, i) => (
                <DataTableRow key={worker.id} zebra={i % 2 === 1}>
                  <DataTableCell className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={`Select ${worker.full_name}`}
                      checked={selected.includes(worker.id)}
                      onChange={() => toggle(worker.id)}
                    />
                  </DataTableCell>
                  <DataTableCell className="px-3 py-1.5 font-medium text-gray-900">{worker.full_name}</DataTableCell>
                  <DataTableCell className="px-3 py-1.5">{worker.designation}</DataTableCell>
                  <DataTableCell className="px-3 py-1.5">
                    {worker.assigned_projects.length
                      ? worker.assigned_projects.map((project) => project.code).join(", ")
                      : <span className="text-amber-700">None</span>}
                  </DataTableCell>
                  <DataTableCell className="px-3 py-1.5">
                    <button
                      type="button"
                      className="text-xs font-medium text-violet-700 hover:underline"
                      onClick={() => {
                        setAllWeekOpen(false);
                        setWeekOffset(0);
                        setExpandedAttendanceId(worker.id);
                      }}
                    >
                      View week
                    </button>
                  </DataTableCell>
                </DataTableRow>
              ))}
              {!filteredLabourRows.length && !workers.isLoading && !(isSuperAdmin && supervisors.isLoading) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No employees match these filters.
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

        <div className="space-y-2.5">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-coal">Dates</h3>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded-md border border-gray-200 px-2 py-0.5 text-xs font-medium text-coal hover:bg-gray-50" onClick={() => shiftMonth(-1)}>
                  ‹
                </button>
                <p className="min-w-[7.5rem] text-center text-xs font-semibold text-coal">{monthLabel}</p>
                <button
                  type="button"
                  className="rounded-md border border-gray-200 px-2 py-0.5 text-xs font-medium text-coal hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => shiftMonth(1)}
                  disabled={!canGoNextMonth}
                >
                  ›
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-gray-500">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div key={`${day}-${i}`} className="py-0.5">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: startWeekday }).map((_, index) => (
                <div key={`pad-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const key = toDateKey(day);
                const active = selectedDates.includes(key);
                const enabled = isDateSelectable(day);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!enabled}
                    onClick={() => toggleDate(day)}
                    className={`flex h-7 items-center justify-center rounded text-xs font-semibold transition ${
                      !enabled
                        ? "cursor-not-allowed bg-gray-50 text-gray-300"
                        : active
                          ? "bg-violet-600 text-white"
                          : "bg-gray-50 text-coal hover:bg-violet-50"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
              <span className="font-medium">{selectedDates.length} selected</span>
              {selectedDates.length > 0 && (
                <button type="button" className="font-medium text-violet-700 hover:underline" onClick={() => setSelectedDates([])}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <h3 className="text-xs font-semibold text-coal">Workday</h3>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {workdayOptions.map((option) => {
                const active = workdayValue === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.hint}
                    onClick={() => setWorkdayValue(option.value)}
                    className={`inline-flex h-8 items-center justify-center rounded-md border text-xs font-bold transition ${
                      active
                        ? option.value === 0
                          ? "border-red-500 bg-red-500 text-white"
                          : option.value === 0.5
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-violet-600 bg-violet-600 text-white"
                        : "border-gray-200 bg-gray-50 text-coal hover:border-violet-300"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button type="button" className={`${btnPrimaryClass} py-1.5 text-xs`} disabled={saving} onClick={markAttendance}>
                {saving ? "Saving..." : "Mark Attendance"}
              </button>
              <button
                type="button"
                className={`${btnSecondaryClass} py-1.5 text-xs`}
                onClick={() => setSelected(selected.length === allIds.length ? [] : allIds)}
              >
                {selected.length === allIds.length ? "Deselect" : "Select All"}
              </button>
              <span className="text-[11px] text-gray-500">{selected.length} selected</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Overwrite existing attendance?"
        subtitle="Some selected employees already have attendance on the chosen dates."
        onClose={() => {
          setConfirmOpen(false);
          setPendingConflicts([]);
        }}
        footer={
          <>
            <button
              type="button"
              className={btnSecondaryClass}
              onClick={() => {
                setConfirmOpen(false);
                setPendingConflicts([]);
              }}
            >
              No
            </button>
            <button
              type="button"
              className={btnPrimaryClass}
              disabled={overwriteBulk.isPending}
              onClick={() => overwriteBulk.mutate()}
            >
              {overwriteBulk.isPending ? "Updating..." : "Yes, change"}
            </button>
          </>
        }
      >
        <div className="space-y-2 py-2">
          <p className="text-sm text-gray-600">
            Change existing marks to <span className="font-semibold text-coal">{workdayLabel(workdayValue)}</span>?
          </p>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-gray-100 bg-gray-50 p-3 text-sm">
            {pendingConflicts.map((item) => {
              const person = labourRows.find((row) => row.id === item.labour_id);
              return (
                <li key={`${item.labour_id}-${item.date}`}>
                  <span className="font-medium text-coal">{person?.full_name || `#${item.labour_id}`}</span>
                  {item.date ? <span className="text-gray-500"> · {item.date}</span> : null}
                  <span className="text-gray-500">
                    {" "}
                    · current {workdayLabel(item.existing_workday)} → {workdayLabel(workdayValue)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>

      <Modal
        open={expandedAttendanceId != null}
        title={attendancePopupEmployee?.full_name || "Attendance"}
        subtitle={`${attendancePopupEmployee?.designation ?? ""}${
          attendancePopupEmployee?.designation ? " · " : ""
        }Wed–Tue payroll week`}
        onClose={() => {
          setExpandedAttendanceId(null);
          setWeekOffset(0);
        }}
      >
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-coal hover:bg-gray-50"
              onClick={() => setWeekOffset((v) => v - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <p className="min-w-[9rem] text-center text-sm font-semibold text-coal">{payrollWeek.rangeLabel}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-coal hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setWeekOffset((v) => v + 1)}
              disabled={!canGoNextPayrollWeek}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {weekAttendance.isLoading ? (
            <p className="py-6 text-center text-sm text-gray-500">Loading week…</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                {payrollWeek.days.map((day) => (
                  <div key={day.key} className="px-1 py-2 text-center">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                      {day.label}
                    </span>
                    <span className="block text-[11px] font-normal text-gray-400">{day.dateLabel}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-white">
                {payrollWeek.days.map((day) => (
                  <div
                    key={day.key}
                    className="border-r border-gray-100 px-1 py-3 text-center text-base font-semibold text-gray-900 last:border-r-0"
                  >
                    {formatWeekMark(popupWeekMarks[day.key])}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={allWeekOpen}
        wide
        title="All employee week attendance"
        subtitle="Wed–Tue payroll week · filter and browse previous weeks"
        onClose={() => {
          setAllWeekOpen(false);
          setAllWeekOffset(0);
        }}
      >
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              className={`${inputClass} py-1.5 text-sm`}
              value={allWeekNameFilter}
              onChange={(e) => setAllWeekNameFilter(e.target.value)}
              placeholder="Name"
              aria-label="Filter by name"
            />
            <select
              className={`${inputClass} py-1.5 text-sm`}
              value={allWeekDesignationFilter}
              onChange={(e) => setAllWeekDesignationFilter(e.target.value)}
              aria-label="Filter by designation"
            >
              <option value="all">All designations</option>
              <option value="Labour">Labour</option>
              <option value="Driver">Driver</option>
              <option value="Office Staff">Office Staff</option>
              {isSuperAdmin ? <option value="Supervisor">Supervisor</option> : null}
            </select>
            <select
              className={`${inputClass} py-1.5 text-sm`}
              value={allWeekProjectFilter}
              onChange={(e) => setAllWeekProjectFilter(e.target.value)}
              aria-label="Filter by project"
            >
              <option value="all">All projects</option>
              <option value="unassigned">Unassigned</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} · {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-coal hover:bg-gray-50"
              onClick={() => setAllWeekOffset((v) => v - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <p className="min-w-[9rem] text-center text-sm font-semibold text-coal">{allPayrollWeek.rangeLabel}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-coal hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setAllWeekOffset((v) => v + 1)}
              disabled={!canGoNextAllWeek}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {allWeekAttendance.isLoading ? (
            <p className="py-6 text-center text-sm text-gray-500">Loading week…</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Designation</th>
                    <th className="px-3 py-2">Project</th>
                    {allPayrollWeek.days.map((day) => (
                      <th key={day.key} className="px-1.5 py-2 text-center">
                        <span className="block text-gray-700">{day.label}</span>
                        <span className="block font-normal normal-case text-gray-400">{day.dateLabel}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allWeekFilteredRows.map((worker, i) => {
                    const marks = allWeekMarksByLabour.get(worker.id) ?? {};
                    return (
                      <tr key={worker.id} className={i % 2 ? "bg-gray-50/60" : "bg-white"}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{worker.full_name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">{worker.designation}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                          {worker.assigned_projects.length
                            ? worker.assigned_projects.map((p) => p.code).join(", ")
                            : "—"}
                        </td>
                        {allPayrollWeek.days.map((day) => (
                          <td key={day.key} className="px-1.5 py-2 text-center font-semibold text-gray-900">
                            {formatWeekMark(marks[day.key])}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {!allWeekFilteredRows.length && (
                    <tr>
                      <td colSpan={3 + allPayrollWeek.days.length} className="px-4 py-8 text-center text-sm text-gray-500">
                        No employees match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}

function daysUntil(date?: string | null) {
  if (!date) return null;
  return (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

function isUpcomingExpiry(date?: string | null, withinDays = 30) {
  const days = daysUntil(date);
  return days != null && days >= 0 && days <= withinDays;
}

function isExpired(date?: string | null) {
  const days = daysUntil(date);
  return days != null && days < 0;
}

type MachineryComplianceKey = "all" | "insurance" | "permit" | "fitness" | "puc" | "mv_tax" | "green_tax" | "hsrp";
type MachineryExpiryKey = "upcoming" | "expired" | "any" | "all";

function machineryComplianceDate(item: Machinery, key: Exclude<MachineryComplianceKey, "all" | "hsrp">) {
  switch (key) {
    case "insurance":
      return item.insurance_expiry_date;
    case "permit":
      return item.permit_expiry_date;
    case "fitness":
      return item.fitness_validity_date;
    case "puc":
      return item.puc_date;
    case "mv_tax":
      return item.mv_tax_validity_date;
    case "green_tax":
      return item.green_tax_date;
  }
}

function matchesMachineryCompliance(item: Machinery, compliance: MachineryComplianceKey, expiry: MachineryExpiryKey) {
  if (compliance === "hsrp") {
    if (expiry === "all") return true;
    if (expiry === "expired" || expiry === "upcoming" || expiry === "any") return !item.hsrp_done;
    return true;
  }

  const dateFields: Array<Exclude<MachineryComplianceKey, "all" | "hsrp">> =
    compliance === "all" ? ["insurance", "permit", "fitness", "puc", "mv_tax", "green_tax"] : [compliance];

  if (expiry === "all") {
    if (compliance === "all") return true;
    return Boolean(machineryComplianceDate(item, compliance));
  }

  const dateMatch = dateFields.some((key) => {
    const date = machineryComplianceDate(item, key);
    if (expiry === "upcoming") return isUpcomingExpiry(date);
    if (expiry === "expired") return isExpired(date);
    // any issue
    return isUpcomingExpiry(date) || isExpired(date);
  });
  // HSRP pending is an open compliance item, but not a date-based "upcoming" expiry.
  const hsrpPendingMatch =
    compliance === "all" && expiry === "any" && !item.hsrp_done;
  return dateMatch || hsrpPendingMatch;
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function expiryBadgeTone(date?: string | null): "green" | "amber" | "red" | "gray" {
  if (!date) return "gray";
  if (isExpired(date)) return "red";
  if (isUpcomingExpiry(date)) return "amber";
  return "green";
}

function OperationsManager({ module }: { module: "materials" | "vendors" | "expenses" | "machinery" | "reports" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [machineryTab, setMachineryTab] = useState<"fuel" | "machines" | "usage" | "maintenance">("machines");
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [fuelMachineryId, setFuelMachineryId] = useState("");
  const [previousMeter, setPreviousMeter] = useState("");
  const [machineryComplianceFilter, setMachineryComplianceFilter] = useState<MachineryComplianceKey>("all");
  const [machineryExpiryFilter, setMachineryExpiryFilter] = useState<MachineryExpiryKey>("all");
  const [selectedMachinery, setSelectedMachinery] = useState<number[]>([]);
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
  const drivers = useQuery<Paginated<LabourProfile>>({
    queryKey: ["labour-workers", "drivers"],
    queryFn: () => api.labourWorkers({ designation: "DRIVER", page_size: 200, ordering: "user__first_name" }),
    enabled: module === "machinery",
    retry: false,
  });
  const fuelLogs = useQuery<Paginated<FuelLog>>({ queryKey: ["fuel-logs"], queryFn: () => api.fuelLogs(), retry: false });
  const machineryUsageList = useQuery<Paginated<MachineryUsage>>({
    queryKey: ["machinery-usage"],
    queryFn: () => api.machineryUsage(),
    retry: false,
    enabled: module === "machinery",
  });
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
  const deleteMachinery = useMutation({
    mutationFn: api.deleteMachinery,
    onSuccess: () => {
      onSuccess("Machine removed.", ["machinery", "fuel-logs", "machinery-usage"]);
      setSelectedMachinery([]);
    },
    onError,
  });
  const bulkDeleteMachinery = useMutation({
    mutationFn: api.bulkDeleteMachinery,
    onSuccess: (result) => {
      if (result.skipped_count > 0) {
        const reasons = result.skipped.map((item) => `#${item.id}: ${item.error}`).join("; ");
        onSuccess(
          result.deleted_count > 0
            ? `Removed ${result.deleted_count} machines. Skipped ${result.skipped_count}: ${reasons}`
            : `Could not remove machines. Skipped ${result.skipped_count}: ${reasons}`,
          ["machinery", "fuel-logs", "machinery-usage"],
        );
      } else {
        onSuccess(`Removed ${result.deleted_count} machine${result.deleted_count === 1 ? "" : "s"}.`, [
          "machinery",
          "fuel-logs",
          "machinery-usage",
        ]);
      }
      setSelectedMachinery([]);
    },
    onError,
  });
  const createUsage = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMachineryUsage>[0]) => api.createMachineryUsage(payload),
    onSuccess: () => {
      onSuccess("Machinery usage recorded.", ["reports", "machinery-usage"]);
      setUsageModalOpen(false);
    },
    onError,
  });
  const createFuel = useMutation({
    mutationFn: (payload: Parameters<typeof api.createFuelLog>[0]) => api.createFuelLog(payload),
    onSuccess: () => {
      onSuccess("Fuel log saved.", ["reports", "fuel-logs"]);
      setFuelModalOpen(false);
      setFuelMachineryId("");
      setPreviousMeter("");
    },
    onError,
  });
  const createMaintenance = useMutation({
    mutationFn: (payload: Parameters<typeof api.createMaintenance>[0]) => api.createMaintenance(payload),
    onSuccess: () => onSuccess("Maintenance record saved.", ["reports", "maintenance"]),
    onError,
  });

  const projectList = projects.data?.results ?? [];
  const vendorList = vendors.data?.results ?? [];
  const materialList = materials.data?.results ?? [];
  const materialStockList = materialStock.data?.results ?? [];
  const expenseList = expenses.data?.results ?? [];
  const machineryList = machinery.data?.results ?? [];
  const driverList = drivers.data?.results ?? [];
  const filteredMachineryList = machineryList.filter((item) =>
    matchesMachineryCompliance(item, machineryComplianceFilter, machineryExpiryFilter),
  );
  const fuelLogList = fuelLogs.data?.results ?? [];
  const usageList = machineryUsageList.data?.results ?? [];
  const fuelPage = useTablePage(fuelLogList, { resetKey: machineryTab });
  const machineryPage = useTablePage(filteredMachineryList, {
    resetKey: `${machineryComplianceFilter}-${machineryExpiryFilter}`,
  });
  const usagePage = useTablePage(usageList, { resetKey: "usage" });
  const machineryPageIds = machineryPage.pageRows.map((item) => item.id);
  const allMachineryPageSelected =
    machineryPageIds.length > 0 && machineryPageIds.every((id) => selectedMachinery.includes(id));
  const deletingMachinery = deleteMachinery.isPending || bulkDeleteMachinery.isPending;

  function toggleMachinery(id: number) {
    setSelectedMachinery((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllMachineryPage() {
    setSelectedMachinery((prev) => {
      if (allMachineryPageSelected) return prev.filter((id) => !machineryPageIds.includes(id));
      return Array.from(new Set([...prev, ...machineryPageIds]));
    });
  }

  function confirmRemoveSelectedMachinery() {
    if (!selectedMachinery.length) return;
    const label = selectedMachinery.length === 1 ? "this machine" : `${selectedMachinery.length} machines`;
    if (!window.confirm(`Delete ${label}? Related fuel logs, usage, and maintenance will also be removed.`)) return;
    bulkDeleteMachinery.mutate(selectedMachinery);
  }

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
      <option value="">Select machine</option>
      {machineryList.filter((item) => item.active).map((item) => (
        <option key={item.id} value={item.id}>
          {item.name} - {item.registration_number}
        </option>
      ))}
    </select>
  );

  async function onFuelMachineryChange(machineryId: string) {
    setFuelMachineryId(machineryId);
    if (!machineryId) {
      setPreviousMeter("");
      return;
    }
    try {
      const last = await api.lastFuelMeter(Number(machineryId));
      setPreviousMeter(last.previous_meter_reading || "0");
    } catch {
      setPreviousMeter("0");
    }
  }

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
                { id: "machines", label: "Machines", count: machineryList.length },
                { id: "fuel", label: "Fuel Logs", count: fuelLogList.length },
                { id: "usage", label: "Usage", count: usageList.length },
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
                    {fuelPage.pageRows.map((item, i) => (
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
                <TablePagination
                  page={fuelPage.page}
                  totalPages={fuelPage.totalPages}
                  total={fuelPage.total}
                  pageSize={fuelPage.pageSize}
                  from={fuelPage.from}
                  to={fuelPage.to}
                  onPageChange={fuelPage.setPage}
                />
              </>
            )}

            {machineryTab === "machines" && (
              <>
                <Toolbar>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">Document</span>
                      <select
                        className={`${inputClass} mt-1 min-w-[9rem]`}
                        value={machineryComplianceFilter}
                        onChange={(event) => setMachineryComplianceFilter(event.target.value as MachineryComplianceKey)}
                      >
                        <option value="all">All documents</option>
                        <option value="insurance">Insurance</option>
                        <option value="permit">Permit</option>
                        <option value="fitness">Fitness</option>
                        <option value="puc">PUC</option>
                        <option value="mv_tax">MV tax</option>
                        <option value="green_tax">Green tax</option>
                        <option value="hsrp">HSRP</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">Expiry</span>
                      <select
                        className={`${inputClass} mt-1 min-w-[11rem]`}
                        value={machineryExpiryFilter}
                        onChange={(event) => setMachineryExpiryFilter(event.target.value as MachineryExpiryKey)}
                      >
                        <option value="upcoming">Upcoming (30 days)</option>
                        <option value="expired">Expired</option>
                        <option value="any">Expired or upcoming</option>
                        <option value="all">All records</option>
                      </select>
                    </label>
                    <p className="pb-2 text-sm text-gray-500">
                      {machineryExpiryFilter === "all" && machineryComplianceFilter === "all"
                        ? `${machineryList.length} machine${machineryList.length === 1 ? "" : "s"}`
                        : `${filteredMachineryList.length} of ${machineryList.length} machines`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedMachinery.length > 0 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                        disabled={deletingMachinery}
                        onClick={confirmRemoveSelectedMachinery}
                      >
                        <Trash2 className="h-4 w-4" />
                        {bulkDeleteMachinery.isPending
                          ? "Removing..."
                          : `Remove selected (${selectedMachinery.length})`}
                      </button>
                    )}
                    <button type="button" className={btnPrimaryClass} onClick={() => setMachineModalOpen(true)}>
                      + Add Machine
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
                          checked={allMachineryPageSelected}
                          onChange={toggleAllMachineryPage}
                          disabled={!machineryPageIds.length}
                        />
                      </th>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Driver</th>
                      <th className="px-4 py-2.5">Vehicle</th>
                      <th className="px-4 py-2.5">Insurance</th>
                      <th className="px-4 py-2.5">Permit</th>
                      <th className="px-4 py-2.5">Fitness</th>
                      <th className="px-4 py-2.5">PUC</th>
                      <th className="px-4 py-2.5">MV tax</th>
                      <th className="px-4 py-2.5">Green tax</th>
                      <th className="px-4 py-2.5">HSRP</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Actions</th>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {machineryPage.pageRows.map((item, i) => (
                      <DataTableRow key={item.id} zebra={i % 2 === 1} onClick={() => router.push(`/machinery/${item.id}`)}>
                        <DataTableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.name}`}
                            checked={selectedMachinery.includes(item.id)}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleMachinery(item.id)}
                          />
                        </DataTableCell>
                        <DataTableCell className="font-medium text-gray-900">
                          <p>{item.name}</p>
                          <p className="text-xs font-normal text-gray-500">{item.machine_type}</p>
                        </DataTableCell>
                        <DataTableCell className="text-sm text-gray-700">{item.driver_name || "—"}</DataTableCell>
                        <DataTableCell className="text-xs">
                          <p>{item.vehicle_number || "—"}</p>
                          <p className="text-gray-500">{item.registration_number}</p>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs text-gray-600">{formatShortDate(item.insurance_expiry_date)}</span>
                            {item.insurance_expiry_date && <Badge tone={expiryBadgeTone(item.insurance_expiry_date)}>{expiryBadgeTone(item.insurance_expiry_date) === "red" ? "Expired" : expiryBadgeTone(item.insurance_expiry_date) === "amber" ? "Soon" : "OK"}</Badge>}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs text-gray-600">{formatShortDate(item.permit_expiry_date)}</span>
                            {item.permit_expiry_date && <Badge tone={expiryBadgeTone(item.permit_expiry_date)}>{expiryBadgeTone(item.permit_expiry_date) === "red" ? "Expired" : expiryBadgeTone(item.permit_expiry_date) === "amber" ? "Soon" : "OK"}</Badge>}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs text-gray-600">{formatShortDate(item.fitness_validity_date)}</span>
                            {item.fitness_validity_date && <Badge tone={expiryBadgeTone(item.fitness_validity_date)}>{expiryBadgeTone(item.fitness_validity_date) === "red" ? "Expired" : expiryBadgeTone(item.fitness_validity_date) === "amber" ? "Soon" : "OK"}</Badge>}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs text-gray-600">{formatShortDate(item.puc_date)}</span>
                            {item.puc_date && <Badge tone={expiryBadgeTone(item.puc_date)}>{expiryBadgeTone(item.puc_date) === "red" ? "Expired" : expiryBadgeTone(item.puc_date) === "amber" ? "Soon" : "OK"}</Badge>}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs text-gray-600">{formatShortDate(item.mv_tax_validity_date)}</span>
                            {item.mv_tax_validity_date && <Badge tone={expiryBadgeTone(item.mv_tax_validity_date)}>{expiryBadgeTone(item.mv_tax_validity_date) === "red" ? "Expired" : expiryBadgeTone(item.mv_tax_validity_date) === "amber" ? "Soon" : "OK"}</Badge>}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs text-gray-600">{formatShortDate(item.green_tax_date)}</span>
                            {item.green_tax_date && <Badge tone={expiryBadgeTone(item.green_tax_date)}>{expiryBadgeTone(item.green_tax_date) === "red" ? "Expired" : expiryBadgeTone(item.green_tax_date) === "amber" ? "Soon" : "OK"}</Badge>}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <Badge tone={item.hsrp_done ? "green" : "amber"}>{item.hsrp_done ? "Done" : "Pending"}</Badge>
                        </DataTableCell>
                        <DataTableCell>
                          <Badge tone={item.active ? "green" : "gray"}>{item.active ? "Active" : "Inactive"}</Badge>
                        </DataTableCell>
                        <DataTableCell>
                          <button
                            type="button"
                            aria-label={`Delete ${item.name}`}
                            title="Delete"
                            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-60"
                            disabled={deletingMachinery}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (
                                !window.confirm(
                                  `Delete "${item.name}"? Related fuel logs, usage, and maintenance will also be removed.`,
                                )
                              ) {
                                return;
                              }
                              deleteMachinery.mutate(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                    {!filteredMachineryList.length && (
                      <tr>
                        <td colSpan={13} className="px-4 py-10 text-center text-sm text-gray-500">
                          {machineryList.length
                            ? "No machines match these expiry filters."
                            : "No machinery registered yet."}
                        </td>
                      </tr>
                    )}
                  </DataTableBody>
                </DataTable>
                <TablePagination
                  page={machineryPage.page}
                  totalPages={machineryPage.totalPages}
                  total={machineryPage.total}
                  pageSize={machineryPage.pageSize}
                  from={machineryPage.from}
                  to={machineryPage.to}
                  onPageChange={machineryPage.setPage}
                />
              </>
            )}

            {machineryTab === "usage" && (
              <>
                <Toolbar>
                  <p className="text-sm text-gray-500">{usageList.length} usage entries</p>
                  <button type="button" className={btnPrimaryClass} onClick={() => setUsageModalOpen(true)}>
                    + Add Usage
                  </button>
                </Toolbar>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Machine</th>
                      <th className="px-4 py-2.5">Project</th>
                      <th className="px-4 py-2.5">Fuel</th>
                      <th className="px-4 py-2.5">KM</th>
                      <th className="px-4 py-2.5">Hours</th>
                      <th className="px-4 py-2.5">Efficiency</th>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {usagePage.pageRows.map((usage, i) => (
                      <DataTableRow key={usage.id} zebra={i % 2 === 1}>
                        <DataTableCell>{usage.usage_date}</DataTableCell>
                        <DataTableCell className="font-medium text-gray-900">
                          <p>{usage.machinery_name}</p>
                          <p className="text-xs font-normal text-gray-500">{usage.operator || "No operator"}</p>
                        </DataTableCell>
                        <DataTableCell>{usage.project_name}</DataTableCell>
                        <DataTableCell>{usage.fuel_consumption} L</DataTableCell>
                        <DataTableCell className={usage.km_over_consumption ? "font-semibold text-red-700" : undefined}>
                          {usage.km_used} km
                          {usage.expected_km != null ? (
                            <p className={`text-xs ${usage.km_over_consumption ? "text-red-600" : "text-gray-500"}`}>
                              expected {usage.expected_km} km
                            </p>
                          ) : null}
                        </DataTableCell>
                        <DataTableCell className={usage.hours_over_consumption ? "font-semibold text-red-700" : undefined}>
                          {usage.hours_used} h
                          {usage.expected_hours != null ? (
                            <p className={`text-xs ${usage.hours_over_consumption ? "text-red-600" : "text-gray-500"}`}>
                              expected {usage.expected_hours} h
                            </p>
                          ) : null}
                        </DataTableCell>
                        <DataTableCell>
                          {usage.over_consumption ? (
                            <Badge tone="red">Over consumption</Badge>
                          ) : Number(usage.fuel_consumption) > 0 ? (
                            <Badge tone="green">Normal</Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                    {!usageList.length && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                          No usage logs yet. Click &quot;Add Usage&quot; to create one.
                        </td>
                      </tr>
                    )}
                  </DataTableBody>
                </DataTable>
                <TablePagination
                  page={usagePage.page}
                  totalPages={usagePage.totalPages}
                  total={usagePage.total}
                  pageSize={usagePage.pageSize}
                  from={usagePage.from}
                  to={usagePage.to}
                  onPageChange={usagePage.setPage}
                />
              </>
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
            subtitle="Previous meter fills from the last fuel entry for that machine"
            onClose={() => {
              setFuelModalOpen(false);
              setFuelMachineryId("");
              setPreviousMeter("");
            }}
            footer={
              <>
                <button
                  type="button"
                  className={btnSecondaryClass}
                  onClick={() => {
                    setFuelModalOpen(false);
                    setFuelMachineryId("");
                    setPreviousMeter("");
                  }}
                >
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
              <FormRow label="Machine">
                <select
                  className={inputClass}
                  name="machinery"
                  required
                  value={fuelMachineryId}
                  onChange={(event) => onFuelMachineryChange(event.target.value)}
                >
                  <option value="">Select machine</option>
                  {machineryList.filter((item) => item.active).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {item.registration_number}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="Date"><input className={inputClass} name="logged_date" type="date" required /></FormRow>
              <FormRow label="Previous meter">
                <input
                  className={inputClass}
                  name="previous_meter_reading"
                  type="number"
                  required
                  value={previousMeter}
                  onChange={(event) => setPreviousMeter(event.target.value)}
                />
              </FormRow>
              <FormRow label="Current meter"><input className={inputClass} name="current_meter_reading" type="number" required /></FormRow>
              <FormRow label="Fuel quantity"><input className={inputClass} name="fuel_quantity" type="number" required /></FormRow>
              <FormRow label="Fuel cost"><input className={inputClass} name="fuel_cost" type="number" required /></FormRow>
              <FormRow label="Bill photos">
                <input className={inputClass} name="bill_photos" type="file" accept="image/*" multiple />
              </FormRow>
            </form>
          </Modal>

          <Modal
            open={usageModalOpen}
            title="Add Usage"
            subtitle="Log hours, km, and fuel. Over-consumption is flagged when efficiency is below the machine average."
            onClose={() => setUsageModalOpen(false)}
            footer={
              <>
                <button type="button" className={btnSecondaryClass} onClick={() => setUsageModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" form="usage-form" className={btnPrimaryClass} disabled={createUsage.isPending}>
                  {createUsage.isPending ? "Saving..." : "Save Usage"}
                </button>
              </>
            }
          >
            <form
              id="usage-form"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                createUsage.mutate({
                  project: Number(form.get("project")),
                  machinery: Number(form.get("machinery")),
                  operator: formValue(form, "operator"),
                  hours_used: formValue(form, "hours_used"),
                  km_used: formValue(form, "km_used") || "0",
                  fuel_consumption: formValue(form, "fuel_consumption") || "0",
                  usage_date: formValue(form, "usage_date"),
                });
              }}
            >
              <FormRow label="Project">{projectSelect}</FormRow>
              <FormRow label="Machine">{machinerySelect}</FormRow>
              <FormRow label="Operator"><input className={inputClass} name="operator" /></FormRow>
              <FormRow label="Hours used"><input className={inputClass} name="hours_used" type="number" min="0" step="0.1" required /></FormRow>
              <FormRow label="KM used"><input className={inputClass} name="km_used" type="number" min="0" step="0.1" defaultValue="0" /></FormRow>
              <FormRow label="Fuel (liters)"><input className={inputClass} name="fuel_consumption" type="number" min="0" step="0.1" defaultValue="0" /></FormRow>
              <FormRow label="Date"><input className={inputClass} name="usage_date" type="date" required /></FormRow>
            </form>
          </Modal>

          <Modal
            open={machineModalOpen}
            title="Add Machinery"
            subtitle="Register machinery with vehicle, insurance, permit, and compliance details"
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
                  vehicle_class: formValue(form, "vehicle_class"),
                  chassis_number: formValue(form, "chassis_number"),
                  engine_number: formValue(form, "engine_number"),
                  driver: formValue(form, "driver") ? Number(formValue(form, "driver")) : null,
                  insurance_provider: formValue(form, "insurance_provider"),
                  insurance_policy_number: formValue(form, "insurance_policy_number"),
                  insurance_start_date: formValue(form, "insurance_start_date"),
                  insurance_expiry_date: formValue(form, "insurance_expiry_date"),
                  permit_number: formValue(form, "permit_number"),
                  permit_issue_date: formValue(form, "permit_issue_date"),
                  permit_expiry_date: formValue(form, "permit_expiry_date"),
                  fitness_validity_date: formValue(form, "fitness_validity_date"),
                  puc_date: formValue(form, "puc_date"),
                  mv_tax_validity_date: formValue(form, "mv_tax_validity_date"),
                  green_tax_date: formValue(form, "green_tax_date"),
                  hsrp_done: form.get("hsrp_done") === "on",
                  avg_km_per_liter: formValue(form, "avg_km_per_liter"),
                  avg_hours_per_liter: formValue(form, "avg_hours_per_liter"),
                  notes: formValue(form, "notes"),
                  active: form.get("active") === "on",
                  document_type: formValue(form, "document_type") || "OTHER",
                  documents: files.length ? files : undefined,
                });
              }}
            >
              <FormRow label="Machine name"><input className={inputClass} name="name" required /></FormRow>
              <FormRow label="Type"><input className={inputClass} name="machine_type" placeholder="Excavator, Truck, Crane..." /></FormRow>
              <FormRow label="Driver">
                <select className={inputClass} name="driver" defaultValue="">
                  <option value="">No driver assigned</option>
                  {driverList.map((driver) => (
                    <option key={driver.id} value={driver.user_id}>
                      {driver.full_name}
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="Vehicle number"><input className={inputClass} name="vehicle_number" placeholder="MH-12-AB-1234" /></FormRow>
              <FormRow label="Registration number"><input className={inputClass} name="registration_number" placeholder="Auto-generated if empty" /></FormRow>
              <FormRow label="Vehicle class"><input className={inputClass} name="vehicle_class" placeholder="LMV, HMV, Trailer..." /></FormRow>
              <FormRow label="Chassis no."><input className={inputClass} name="chassis_number" /></FormRow>
              <FormRow label="Engine no."><input className={inputClass} name="engine_number" /></FormRow>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-coal">Average fuel consumption</p>
                <p className="mt-1 text-xs text-gray-500">Used to detect over-consumption on usage logs (1 liter baseline).</p>
              </div>
              <FormRow label="Avg km / liter"><input className={inputClass} name="avg_km_per_liter" type="number" min="0" step="0.1" placeholder="e.g. 4 = 1L covers 4 km" /></FormRow>
              <FormRow label="Avg hrs / liter"><input className={inputClass} name="avg_hours_per_liter" type="number" min="0" step="0.1" placeholder="e.g. 4 = 1L covers 4 hours" /></FormRow>
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
              <FormRow label="Permit date"><input className={inputClass} name="permit_issue_date" type="date" /></FormRow>
              <FormRow label="Permit validity"><input className={inputClass} name="permit_expiry_date" type="date" /></FormRow>
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-coal">Compliance</p>
              </div>
              <FormRow label="Fitness validity"><input className={inputClass} name="fitness_validity_date" type="date" /></FormRow>
              <FormRow label="PUC date"><input className={inputClass} name="puc_date" type="date" /></FormRow>
              <FormRow label="MV tax validity"><input className={inputClass} name="mv_tax_validity_date" type="date" /></FormRow>
              <FormRow label="Green tax date"><input className={inputClass} name="green_tax_date" type="date" /></FormRow>
              <FormRow label="HSRP done">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="hsrp_done" className="rounded border-gray-300" />
                  HSRP completed
                </label>
              </FormRow>
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

  const data = metrics.data;

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
        <ContentCard
          title="Machinery expiring soon"
          subtitle="Insurance, permit, fitness, PUC & green tax in next 5 days"
        >
          <ul className="divide-y divide-gray-100">
            {(data?.upcoming_machinery_expiries ?? []).map((item) => (
              <li key={`${item.id}-${item.document_key}`} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link href={`/machinery/${item.id}`} className="text-sm font-medium text-gray-900 hover:text-violet-700 hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {item.document} · {item.vehicle_number || "—"} · {formatShortDate(item.expiry_date)}
                  </p>
                </div>
                <Badge tone={item.days_left <= 2 ? "red" : "amber"}>
                  {item.days_left === 0 ? "Today" : item.days_left === 1 ? "1 day" : `${item.days_left} days`}
                </Badge>
              </li>
            ))}
            {!(data?.upcoming_machinery_expiries ?? []).length && (
              <li className="py-6 text-center text-sm text-gray-500">No machinery documents expiring in the next 5 days.</li>
            )}
          </ul>
          <div className="mt-3 border-t border-gray-100 pt-3">
            <Link href="/machinery" className="text-sm font-medium text-violet-700 hover:underline">
              View all machinery →
            </Link>
          </div>
        </ContentCard>
      </section>
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
  OperationsManager,
  LabourPanel,
};

export { PayrollManager, UpdateWagesPage, RecordAdvancePage } from "@/components/payroll-module";
