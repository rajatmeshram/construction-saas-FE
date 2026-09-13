"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/types";
import { useAppSelector } from "@/store/hooks";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableRow,
  PageMessage,
  Toolbar,
  btnPrimaryClass,
  btnSecondaryClass,
} from "@/components/ui";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function localDateIso(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDate(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  return localDateIso(next);
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LocationCell({
  label,
  lat,
  lng,
}: {
  label?: string;
  lat?: string | null;
  lng?: string | null;
}) {
  if (!label && (lat == null || lng == null)) {
    return <span className="text-gray-400">—</span>;
  }
  const maps =
    lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : null;
  return (
    <div className="max-w-[12rem]">
      <p className="truncate text-xs text-gray-700">{label || `${lat}, ${lng}`}</p>
      {maps ? (
        <a href={maps} target="_blank" rel="noreferrer" className="text-[11px] text-violet-700 hover:underline">
          Map
        </a>
      ) : null}
    </div>
  );
}

export function SupervisorCheckinsPage() {
  const queryClient = useQueryClient();
  const user = useAppSelector((state) => state.auth.user);
  const today = localDateIso();
  const [date, setDate] = useState(today);
  const [message, setMessage] = useState("");

  const checkins = useQuery({
    queryKey: ["supervisor-checkins", date],
    queryFn: () => api.supervisorCheckins(date),
    enabled: user?.role === "SUPER_ADMIN",
    refetchInterval: 30_000,
  });

  const review = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "accept" | "reject" }) =>
      api.reviewSupervisorCheckin(id, action),
    onSuccess: (_data, vars) => {
      setMessage(vars.action === "accept" ? "Marked present." : "Marked half day.");
      queryClient.invalidateQueries({ queryKey: ["supervisor-checkins"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Update failed."),
  });

  const rows = useMemo(() => checkins.data?.results ?? [], [checkins.data]);
  const isToday = date === today;
  const canGoNext = date < today;
  const summary = useMemo(() => {
    return {
      hold: rows.filter((row) => row.checkout_state === "HOLD").length,
      open: rows.filter((row) => row.checkout_state === "YET_TO_CHECKOUT").length,
    };
  }, [rows]);

  if (user?.role !== "SUPER_ADMIN") {
    return <PageMessage>Only Super Admin can view supervisor check-ins.</PageMessage>;
  }

  return (
    <section className="space-y-4">
      {message ? <PageMessage>{message}</PageMessage> : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Toolbar>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Supervisor check-in / check-out</h2>
            <p className="text-xs text-gray-500">
              Today’s records by default. Use arrows to browse previous days. Hold rows need Accept (Present) or Reject (Half day).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {summary.hold > 0 ? <Badge tone="amber">{summary.hold} hold</Badge> : null}
            {summary.open > 0 ? <Badge tone="green">{summary.open} on site</Badge> : null}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                className="rounded-md p-1.5 text-gray-600 hover:bg-gray-50"
                aria-label="Previous day"
                onClick={() => setDate((current) => shiftDate(current, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="min-w-[10.5rem] text-center text-sm font-medium text-gray-800">{formatDayLabel(date)}</p>
              <button
                type="button"
                className="rounded-md p-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                aria-label="Next day"
                disabled={!canGoNext}
                onClick={() => setDate((current) => shiftDate(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {!isToday ? (
              <button type="button" className={btnSecondaryClass} onClick={() => setDate(today)}>
                Today
              </button>
            ) : null}
          </div>
        </Toolbar>

        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Supervisor</th>
              <th className="px-4 py-2.5">Site assigned</th>
              <th className="px-4 py-2.5">Check-in</th>
              <th className="px-4 py-2.5">Check-in location</th>
              <th className="px-4 py-2.5">Check-out</th>
              <th className="px-4 py-2.5">Check-out location</th>
              <th className="px-4 py-2.5">Attendance</th>
              <th className="px-4 py-2.5">Action</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                  No supervisor check-ins for this date.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const hold = row.checkout_state === "HOLD";
                const pendingHold = hold && row.approval_status === "PENDING";
                return (
                  <DataTableRow key={row.id} zebra={index % 2 === 1}>
                    <DataTableCell className="font-medium text-gray-900">{row.labour_name}</DataTableCell>
                    <DataTableCell className="max-w-[14rem] truncate">
                      {row.assigned_sites || row.project_name || "—"}
                    </DataTableCell>
                    <DataTableCell>{formatTime(row.punch_in_at)}</DataTableCell>
                    <DataTableCell>
                      <LocationCell
                        label={row.punch_in_location}
                        lat={row.punch_in_latitude}
                        lng={row.punch_in_longitude}
                      />
                    </DataTableCell>
                    <DataTableCell>
                      {hold ? (
                        <div>
                          <Badge tone="amber">Hold</Badge>
                          {row.claimed_checkout_at ? (
                            <p className="mt-1 text-xs text-gray-500">{formatTime(row.claimed_checkout_at)}</p>
                          ) : null}
                          {row.hold_reason ? (
                            <p className="mt-1 max-w-[14rem] whitespace-normal text-xs text-gray-500">{row.hold_reason}</p>
                          ) : (
                            <p className="mt-1 text-xs text-gray-400">Awaiting supervisor reason</p>
                          )}
                        </div>
                      ) : row.checkout_state === "YET_TO_CHECKOUT" ? (
                        <Badge tone="blue">Yet to checkout</Badge>
                      ) : (
                        formatTime(row.punch_out_at)
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      {row.checkout_state === "YET_TO_CHECKOUT" ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <LocationCell
                          label={row.punch_out_location}
                          lat={row.punch_out_latitude}
                          lng={row.punch_out_longitude}
                        />
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      {row.checkout_state === "CHECKED_OUT" || row.approval_status !== "PENDING" ? (
                        <Badge tone={row.attendance_mark === "HALF_DAY" ? "amber" : "green"}>
                          {row.attendance_mark === "HALF_DAY" ? "Half day" : "Present"}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      {pendingHold ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btnPrimaryClass}
                            disabled={review.isPending}
                            onClick={() => review.mutate({ id: row.id, action: "accept" })}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className={btnSecondaryClass}
                            disabled={review.isPending}
                            onClick={() => review.mutate({ id: row.id, action: "reject" })}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </section>
  );
}
