"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/lib/api";
import type { ActivityRequest } from "@/lib/types";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableRow,
  Toolbar,
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
} from "@/components/ui";

export function ActivityRequestsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const pending = useQuery({
    queryKey: ["activity-requests", "pending"],
    queryFn: () => api.activityRequests({ status: "PENDING" }),
    refetchInterval: 30_000,
  });

  const approve = useMutation({
    mutationFn: api.approveActivityRequest,
    onSuccess: () => {
      setMessage("Request approved and applied.");
      queryClient.invalidateQueries({ queryKey: ["activity-requests"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["machinery-usage"] });
      queryClient.invalidateQueries({ queryKey: ["machinery"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Approve failed."),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.rejectActivityRequest(id, reason),
    onSuccess: () => {
      setMessage("Request rejected. The supervisor has been notified.");
      queryClient.invalidateQueries({ queryKey: ["activity-requests"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Reject failed."),
  });

  const rows: ActivityRequest[] = pending.data?.results ?? [];
  const busy = approve.isPending || reject.isPending;

  return (
    <section className="space-y-4">
      {message && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Toolbar>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Activity requests</h2>
            <p className="text-xs text-gray-500">
              Secondary supervisor actions waiting for primary supervisor or Super Admin approval.
            </p>
          </div>
          <Badge tone="green">{rows.length} pending</Badge>
        </Toolbar>

        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">When</th>
              <th className="px-4 py-2.5">Requested by</th>
              <th className="px-4 py-2.5">Site</th>
              <th className="px-4 py-2.5">Activity</th>
              <th className="px-4 py-2.5">Actions</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((row, i) => (
              <DataTableRow key={row.id} zebra={i % 2 === 1}>
                <DataTableCell className="text-xs text-gray-600">
                  {new Date(row.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </DataTableCell>
                <DataTableCell className="font-medium text-gray-900">{row.requested_by_name}</DataTableCell>
                <DataTableCell>
                  {row.project_code || row.project_name
                    ? [row.project_code, row.project_name].filter(Boolean).join(" · ")
                    : "—"}
                </DataTableCell>
                <DataTableCell>
                  <p className="font-medium text-gray-900">{row.title}</p>
                  <p className="text-xs text-gray-500">{row.action_type_label}</p>
                  {row.summary ? <p className="mt-0.5 text-xs text-gray-500">{row.summary}</p> : null}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnPrimaryClass}
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(`Approve “${row.title}”? This will save the activity.`)) return;
                          approve.mutate(row.id);
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className={btnSecondaryClass}
                        disabled={busy}
                        onClick={() => {
                          const reason = rejectReason[row.id] || "";
                          if (!window.confirm(`Reject “${row.title}”?`)) return;
                          reject.mutate({ id: row.id, reason });
                        }}
                      >
                        Reject
                      </button>
                    </div>
                    <input
                      className={`${inputClass} py-1.5 text-sm`}
                      placeholder="Rejection reason (optional)"
                      value={rejectReason[row.id] || ""}
                      onChange={(e) =>
                        setRejectReason((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                    />
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                  No pending activity requests.
                </td>
              </tr>
            )}
          </DataTableBody>
        </DataTable>
      </div>
    </section>
  );
}
