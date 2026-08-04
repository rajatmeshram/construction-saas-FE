"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MapPin, Timer, Users } from "lucide-react";

import { ContentCard } from "@/components/ui";
import type { AttendanceActivityItem, DashboardMetrics } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#7c3aed",
  PLANNING: "#6366f1",
  ON_HOLD: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  DRAFT: "#9ca3af",
};

const SPEND_COLORS = ["#7c3aed", "#f59e0b", "#10b981", "#6366f1"];

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapsUrl(lat?: string | null, lng?: string | null, placeQuery?: string | null) {
  if (lat != null && lng != null && lat !== "" && lng !== "") {
    return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&z=18`;
  }
  if (placeQuery && placeQuery.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery.trim())}`;
  }
  return null;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-gray-900">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-gray-600">
          {entry.name}: <span className="font-semibold text-gray-900">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function ActivityCard({ item }: { item: AttendanceActivityItem }) {
  const params = new URLSearchParams();
  params.set("approved_by", String(item.marker_id));
  // Use minute bucket so history can resolve the same activity group without listing every id.
  const markedAt = new Date(item.marked_at);
  markedAt.setSeconds(0, 0);
  params.set("marked_at", markedAt.toISOString());
  if (item.project_id != null) params.set("project", String(item.project_id));
  const href = `/attendance/history?${params.toString()}`;
  const mapHref = mapsUrl(item.latitude, item.longitude, item.project_location);
  const countLabel = `${item.employee_count} employee${item.employee_count === 1 ? "" : "s"}`;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 transition hover:border-violet-200 hover:bg-violet-50/40">
      <Link href={href} className="block">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-violet-100 p-2 text-violet-700">
            <Users className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-coal">
              <span className="text-violet-700">{item.marker_name}</span> marked {countLabel} attendance
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {formatDateTime(item.marked_at)}
              </span>
              {(item.project_name || item.project_location) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {item.project_name || item.project_location}
                  {item.project_name && item.project_location ? ` · ${item.project_location}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
      {mapHref ? (
        <a
          href={mapHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 pl-11 text-[11px] font-medium text-violet-700 hover:underline"
        >
          <MapPin className="h-3 w-3" />
          View location pin on map
        </a>
      ) : null}
    </div>
  );
}

export function DashboardCharts({ data }: { data?: DashboardMetrics }) {
  const statusData = (data?.status_breakdown ?? [])
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: formatStatus(item.status),
      value: item.total,
      color: STATUS_COLORS[item.status] ?? "#9ca3af",
    }));

  const spendData = (data?.spend_breakdown ?? []).filter((item) => item.value > 0);
  const activity = data?.attendance_activity ?? [];

  const budgetTotal = Number(data?.budget.total ?? 0);
  const budgetActual = Number(data?.budget.actual ?? 0);
  const budgetData = [
    { name: "Estimated", amount: budgetTotal },
    { name: "Actual", amount: budgetActual },
  ];

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-2">
      <ContentCard title="Attendance Activity" subtitle="Recent supervisor & admin attendance marks">
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {activity.length ? (
            activity.map((item) => <ActivityCard key={item.id} item={item} />)
          ) : (
            <p className="flex h-40 items-center justify-center text-sm text-gray-500">No attendance activity yet.</p>
          )}
        </div>
      </ContentCard>

      <ContentCard title="Spend Breakdown" subtitle="Materials, fuel, expenses & payroll">
        <div className="h-56">
          {spendData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3}>
                  {spendData.map((_, index) => (
                    <Cell key={index} fill={SPEND_COLORS[index % SPEND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                      Number(value ?? 0),
                    )
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-gray-500">No spend recorded yet.</p>
          )}
        </div>
      </ContentCard>

      <ContentCard title="Budget vs Actual" subtitle="Across all projects">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
              />
              <Tooltip
                formatter={(value) =>
                  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
                    Number(value ?? 0),
                  )
                }
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                <Cell fill="#6366f1" />
                <Cell fill="#7c3aed" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ContentCard>

      <ContentCard title="Projects by Status" subtitle="Distribution across portfolio">
        <div className="h-56">
          {statusData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} paddingAngle={2}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-gray-500">No projects yet.</p>
          )}
        </div>
      </ContentCard>
    </section>
  );
}
