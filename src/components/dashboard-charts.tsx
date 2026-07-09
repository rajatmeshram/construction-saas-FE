"use client";

import {
  Area,
  AreaChart,
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

import { ContentCard } from "@/components/ui";
import type { DashboardMetrics } from "@/lib/types";

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

export function DashboardCharts({ data }: { data?: DashboardMetrics }) {
  const statusData = (data?.status_breakdown ?? [])
    .filter((item) => item.total > 0)
    .map((item) => ({
      name: formatStatus(item.status),
      value: item.total,
      color: STATUS_COLORS[item.status] ?? "#9ca3af",
    }));

  const spendData = (data?.spend_breakdown ?? []).filter((item) => item.value > 0);
  const trendData = data?.attendance_trend ?? [];

  const budgetTotal = Number(data?.budget.total ?? 0);
  const budgetActual = Number(data?.budget.actual ?? 0);
  const budgetData = [
    { name: "Estimated", amount: budgetTotal },
    { name: "Actual", amount: budgetActual },
  ];

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-2">
      <ContentCard title="Attendance Trend" subtitle="Last 7 days — present workers & hours">
        <div className="h-56">
          {trendData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area yAxisId="left" type="monotone" dataKey="present" name="Present" stroke="#7c3aed" fill="url(#presentFill)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="hours" name="Hours" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-gray-500">No attendance data yet.</p>
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
