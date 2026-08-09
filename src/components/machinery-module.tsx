"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Fuel, Pencil, Shield, Timer, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableRow,
  FormRow,
  Modal,
  TablePagination,
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useTablePage } from "@/lib/pagination";
import type { FuelLog, LabourProfile, Machinery, MachineryDocument, MachineryMaintenance, MachineryUsage } from "@/lib/types";

function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function dateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formValue(form: FormData, key: string) {
  return String(form.get(key) ?? "");
}

function mediaUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${url.startsWith("/") ? url : `/${url}`}`;
}

function expiryTone(date?: string | null): "green" | "amber" | "red" | "gray" {
  if (!date) return "gray";
  const diff = new Date(date).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "red";
  if (days < 30) return "amber";
  return "green";
}

function docTypeLabel(type: MachineryDocument["document_type"]) {
  const labels = { INSURANCE: "Insurance", PERMIT: "Permit", RC: "RC", OTHER: "Other" };
  return labels[type] ?? type;
}

function machineryPayloadFromForm(form: FormData) {
  return {
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
  };
}

function MachineryEditFields({ item, drivers }: { item: Machinery; drivers: LabourProfile[] }) {
  return (
    <>
      <FormRow label="Machine name">
        <input className={inputClass} name="name" required defaultValue={item.name} />
      </FormRow>
      <FormRow label="Type">
        <input className={inputClass} name="machine_type" defaultValue={item.machine_type} placeholder="Excavator, Truck, Crane..." />
      </FormRow>
      <FormRow label="Driver">
        <select className={inputClass} name="driver" defaultValue={item.driver ? String(item.driver) : ""}>
          <option value="">No driver assigned</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.user_id}>
              {driver.full_name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Vehicle number">
        <input className={inputClass} name="vehicle_number" defaultValue={item.vehicle_number || ""} placeholder="MH-12-AB-1234" />
      </FormRow>
      <FormRow label="Registration number">
        <input className={inputClass} name="registration_number" defaultValue={item.registration_number} placeholder="Auto-generated if empty" />
      </FormRow>
      <FormRow label="Vehicle class">
        <input className={inputClass} name="vehicle_class" defaultValue={item.vehicle_class || ""} placeholder="LMV, HMV, Trailer..." />
      </FormRow>
      <FormRow label="Chassis no.">
        <input className={inputClass} name="chassis_number" defaultValue={item.chassis_number || ""} />
      </FormRow>
      <FormRow label="Engine no.">
        <input className={inputClass} name="engine_number" defaultValue={item.engine_number || ""} />
      </FormRow>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-coal">Average fuel consumption</p>
        <p className="mt-1 text-xs text-gray-500">Used to detect over-consumption on usage logs (1 liter baseline).</p>
      </div>
      <FormRow label="Avg km / liter">
        <input className={inputClass} name="avg_km_per_liter" type="number" min="0" step="0.1" defaultValue={item.avg_km_per_liter ?? ""} />
      </FormRow>
      <FormRow label="Avg hrs / liter">
        <input className={inputClass} name="avg_hours_per_liter" type="number" min="0" step="0.1" defaultValue={item.avg_hours_per_liter ?? ""} />
      </FormRow>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-coal">Insurance</p>
      </div>
      <FormRow label="Provider">
        <input className={inputClass} name="insurance_provider" defaultValue={item.insurance_provider || ""} />
      </FormRow>
      <FormRow label="Policy number">
        <input className={inputClass} name="insurance_policy_number" defaultValue={item.insurance_policy_number || ""} />
      </FormRow>
      <FormRow label="Start date">
        <input className={inputClass} name="insurance_start_date" type="date" defaultValue={dateInputValue(item.insurance_start_date)} />
      </FormRow>
      <FormRow label="Expiry date">
        <input className={inputClass} name="insurance_expiry_date" type="date" defaultValue={dateInputValue(item.insurance_expiry_date)} />
      </FormRow>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-coal">Permit</p>
      </div>
      <FormRow label="Permit number">
        <input className={inputClass} name="permit_number" defaultValue={item.permit_number || ""} />
      </FormRow>
      <FormRow label="Permit date">
        <input className={inputClass} name="permit_issue_date" type="date" defaultValue={dateInputValue(item.permit_issue_date)} />
      </FormRow>
      <FormRow label="Permit validity">
        <input className={inputClass} name="permit_expiry_date" type="date" defaultValue={dateInputValue(item.permit_expiry_date)} />
      </FormRow>
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-coal">Compliance</p>
      </div>
      <FormRow label="Fitness validity">
        <input className={inputClass} name="fitness_validity_date" type="date" defaultValue={dateInputValue(item.fitness_validity_date)} />
      </FormRow>
      <FormRow label="PUC date">
        <input className={inputClass} name="puc_date" type="date" defaultValue={dateInputValue(item.puc_date)} />
      </FormRow>
      <FormRow label="MV tax validity">
        <input className={inputClass} name="mv_tax_validity_date" type="date" defaultValue={dateInputValue(item.mv_tax_validity_date)} />
      </FormRow>
      <FormRow label="Green tax date">
        <input className={inputClass} name="green_tax_date" type="date" defaultValue={dateInputValue(item.green_tax_date)} />
      </FormRow>
      <FormRow label="HSRP done">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="hsrp_done" defaultChecked={item.hsrp_done} className="rounded border-gray-300" />
          HSRP completed
        </label>
      </FormRow>
      <FormRow label="Notes">
        <textarea className={inputClass} name="notes" rows={2} defaultValue={item.notes || ""} />
      </FormRow>
      <FormRow label="Status">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="active" defaultChecked={item.active} className="rounded border-gray-300" />
          Active machine
        </label>
      </FormRow>
    </>
  );
}

export function MachineryDetailPage({ machineryId }: { machineryId: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [docType, setDocType] = useState<MachineryDocument["document_type"]>("INSURANCE");

  const machinery = useQuery({
    queryKey: ["machinery", machineryId],
    queryFn: () => api.machineryItem(machineryId),
  });

  const drivers = useQuery({
    queryKey: ["labour-workers", "drivers"],
    queryFn: () => api.labourWorkers({ designation: "DRIVER", page_size: 200, ordering: "user__first_name" }),
    retry: false,
  });

  const maintenance = useQuery({
    queryKey: ["maintenance", machineryId],
    queryFn: () => api.maintenance(machineryId),
  });

  const updateMachinery = useMutation({
    mutationFn: (payload: Parameters<typeof api.updateMachinery>[1]) => api.updateMachinery(machineryId, payload),
    onSuccess: () => {
      setMessage("Machine details updated.");
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["machinery", machineryId] });
      queryClient.invalidateQueries({ queryKey: ["machinery"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Update failed."),
  });

  const deleteMachinery = useMutation({
    mutationFn: () => api.deleteMachinery(machineryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machinery"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-logs"] });
      queryClient.invalidateQueries({ queryKey: ["machinery-usage"] });
      router.replace("/machinery");
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Delete failed."),
  });

  const uploadDocs = useMutation({
    mutationFn: (files: File[]) => api.uploadMachineryDocuments(machineryId, { document_type: docType, documents: files }),
    onSuccess: () => {
      setMessage("Documents uploaded.");
      queryClient.invalidateQueries({ queryKey: ["machinery", machineryId] });
      queryClient.invalidateQueries({ queryKey: ["machinery"] });
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : "Upload failed."),
  });

  function submitDocuments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const files = form.getAll("documents").filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) {
      setMessage("Select at least one document.");
      return;
    }
    uploadDocs.mutate(files);
    event.currentTarget.reset();
  }

  const documents = machinery.data?.documents ?? [];
  const maintenanceRows = maintenance.data?.results ?? [];
  const docsPage = useTablePage(documents, { resetKey: machineryId });

  if (machinery.isLoading) {
    return <p className="rounded-lg border border-gray-200/80 bg-white p-4 text-sm text-gray-500 shadow-sm">Loading machinery...</p>;
  }

  if (!machinery.data) {
    return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Machinery not found.</p>;
  }

  const item = machinery.data;

  return (
    <section className="space-y-4">
      <Link href="/machinery" className={`${btnSecondaryClass} text-xs`}>
        <ArrowLeft className="h-4 w-4" />
        Back to machinery
      </Link>

      {message && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href={`/machinery/${machineryId}/fuel-logs`}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
              <Fuel className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-coal">View fuel logs</p>
              <p className="text-xs text-gray-500">All fuel entries · download Excel</p>
            </div>
          </div>
          <span className="text-sm font-medium text-violet-700">Open →</span>
        </Link>
        <Link
          href={`/machinery/${machineryId}/usage`}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-coal">View usage</p>
              <p className="text-xs text-gray-500">Hours, KM & fuel use · download Excel</p>
            </div>
          </div>
          <span className="text-sm font-medium text-violet-700">Open →</span>
        </Link>
        <Link
          href={`/machinery/${machineryId}/maintenance`}
          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-coal">View maintenance</p>
              <p className="text-xs text-gray-500">
                {maintenanceRows.length} record{maintenanceRows.length === 1 ? "" : "s"} · download Excel
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-violet-700">Open →</span>
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Machinery</p>
            <h1 className="mt-1 text-lg font-semibold text-coal">{item.name}</h1>
            <p className="text-sm text-gray-500">{item.machine_type}</p>
            {item.driver_name ? <p className="mt-1 text-sm text-gray-600">Driver: {item.driver_name}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={item.active ? "green" : "gray"}>{item.active ? "Active" : "Inactive"}</Badge>
            <button type="button" className={`${btnSecondaryClass} text-xs`} onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit details
            </button>
            <button
              type="button"
              aria-label={`Delete ${item.name}`}
              title="Delete"
              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-60"
              disabled={deleteMachinery.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    `Delete "${item.name}"? Related fuel logs, usage, and maintenance will also be removed.`,
                  )
                ) {
                  return;
                }
                deleteMachinery.mutate();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Driver</p>
            <p className="mt-1 font-semibold">{item.driver_name || "—"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Vehicle No.</p>
            <p className="mt-1 font-semibold">{item.vehicle_number || item.registration_number || "—"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Registration</p>
            <p className="mt-1 font-semibold">{item.registration_number || "—"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Vehicle class</p>
            <p className="mt-1 font-semibold">{item.vehicle_class || "—"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">HSRP</p>
            <p className="mt-1 font-semibold">{item.hsrp_done ? "Done" : "Pending"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Insurance expiry</p>
            <p className="mt-1 font-semibold">{formatDate(item.insurance_expiry_date)}</p>
            {item.insurance_expiry_date && (
              <div className="mt-1">
                <Badge tone={expiryTone(item.insurance_expiry_date)}>
                  {expiryTone(item.insurance_expiry_date) === "red" ? "Expired" : expiryTone(item.insurance_expiry_date) === "amber" ? "Expiring soon" : "Valid"}
                </Badge>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Permit validity</p>
            <p className="mt-1 font-semibold">{formatDate(item.permit_expiry_date)}</p>
            {item.permit_expiry_date && (
              <div className="mt-1">
                <Badge tone={expiryTone(item.permit_expiry_date)}>
                  {expiryTone(item.permit_expiry_date) === "red" ? "Expired" : expiryTone(item.permit_expiry_date) === "amber" ? "Expiring soon" : "Valid"}
                </Badge>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">Fitness validity</p>
            <p className="mt-1 font-semibold">{formatDate(item.fitness_validity_date)}</p>
            {item.fitness_validity_date && (
              <div className="mt-1">
                <Badge tone={expiryTone(item.fitness_validity_date)}>
                  {expiryTone(item.fitness_validity_date) === "red" ? "Expired" : expiryTone(item.fitness_validity_date) === "amber" ? "Expiring soon" : "Valid"}
                </Badge>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500">PUC date</p>
            <p className="mt-1 font-semibold">{formatDate(item.puc_date)}</p>
            {item.puc_date && (
              <div className="mt-1">
                <Badge tone={expiryTone(item.puc_date)}>
                  {expiryTone(item.puc_date) === "red" ? "Expired" : expiryTone(item.puc_date) === "amber" ? "Expiring soon" : "Valid"}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-coal">Vehicle Identity</h2>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Chassis no.</dt><dd className="font-medium">{item.chassis_number || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Engine no.</dt><dd className="font-medium">{item.engine_number || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Vehicle class</dt><dd className="font-medium">{item.vehicle_class || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">HSRP done</dt><dd className="font-medium">{item.hsrp_done ? "Yes" : "No"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Avg km / liter</dt><dd className="font-medium">{item.avg_km_per_liter ? `${item.avg_km_per_liter} km/L` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Avg hrs / liter</dt><dd className="font-medium">{item.avg_hours_per_liter ? `${item.avg_hours_per_liter} hrs/L` : "—"}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-coal">Insurance Details</h2>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Provider</dt><dd className="font-medium">{item.insurance_provider || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Policy number</dt><dd className="font-medium">{item.insurance_policy_number || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Start date</dt><dd className="font-medium">{formatDate(item.insurance_start_date)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Expiry date</dt><dd className="font-medium">{formatDate(item.insurance_expiry_date)}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-coal">Permit Details</h2>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Permit number</dt><dd className="font-medium">{item.permit_number || "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Permit date</dt><dd className="font-medium">{formatDate(item.permit_issue_date)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Validity</dt><dd className="font-medium">{formatDate(item.permit_expiry_date)}</dd></div>
          </dl>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-coal">Tax & Fitness</h2>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Fitness validity</dt><dd className="font-medium">{formatDate(item.fitness_validity_date)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">PUC date</dt><dd className="font-medium">{formatDate(item.puc_date)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">MV tax validity</dt><dd className="font-medium">{formatDate(item.mv_tax_validity_date)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Green tax date</dt><dd className="font-medium">{formatDate(item.green_tax_date)}</dd></div>
          </dl>
        </div>
      </div>

      {item.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
          <p className="font-semibold text-coal">Notes</p>
          <p className="mt-2 text-gray-600">{item.notes}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-coal">Documents</h2>
          <p className="text-xs text-gray-500">{item.documents?.length ?? 0} files uploaded</p>
        </div>
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Uploaded</th>
              <th className="px-4 py-2.5">File</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {docsPage.pageRows.map((doc, i) => (
              <DataTableRow key={doc.id} zebra={i % 2 === 1}>
                <DataTableCell><Badge tone="violet">{docTypeLabel(doc.document_type)}</Badge></DataTableCell>
                <DataTableCell className="font-medium text-gray-900">{doc.title || "—"}</DataTableCell>
                <DataTableCell>{formatDate(doc.uploaded_at)}</DataTableCell>
                <DataTableCell>
                  {mediaUrl(doc.file_url) ? (
                    <a href={mediaUrl(doc.file_url)!} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-violet-700 hover:underline">
                      View / Download
                    </a>
                  ) : "—"}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <TablePagination
          page={docsPage.page}
          totalPages={docsPage.totalPages}
          total={docsPage.total}
          pageSize={docsPage.pageSize}
          from={docsPage.from}
          to={docsPage.to}
          onPageChange={docsPage.setPage}
        />
        {!item.documents?.length && <p className="px-4 py-6 text-center text-sm text-gray-500">No documents uploaded yet.</p>}

        <form onSubmit={submitDocuments} className="border-t border-gray-100 p-4">
          <p className="text-sm font-semibold text-coal">Upload documents</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <FormRow label="Document type">
              <select className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value as MachineryDocument["document_type"])}>
                <option value="INSURANCE">Insurance</option>
                <option value="PERMIT">Permit</option>
                <option value="RC">Registration (RC)</option>
                <option value="OTHER">Other</option>
              </select>
            </FormRow>
            <FormRow label="Files">
              <input className={inputClass} name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" />
            </FormRow>
          </div>
          <button type="submit" className={`${btnPrimaryClass} mt-3`} disabled={uploadDocs.isPending}>
            {uploadDocs.isPending ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>

      <Modal
        open={editOpen}
        title="Edit machinery"
        subtitle="Update vehicle, insurance, permit, and compliance details"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button type="button" className={btnSecondaryClass} onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="machine-edit-form" className={btnPrimaryClass} disabled={updateMachinery.isPending}>
              {updateMachinery.isPending ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        <form
          id="machine-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateMachinery.mutate(machineryPayloadFromForm(new FormData(event.currentTarget)));
          }}
        >
          <MachineryEditFields key={item.id + String(editOpen)} item={item} drivers={drivers.data?.results ?? []} />
        </form>
      </Modal>
    </section>
  );
}

export function MachineryFuelLogsPage({ machineryId }: { machineryId: number }) {
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const machinery = useQuery({
    queryKey: ["machinery", machineryId],
    queryFn: () => api.machineryItem(machineryId),
  });
  const fuelLogs = useQuery({
    queryKey: ["fuel-logs", machineryId],
    queryFn: () => api.fuelLogs({ machinery: machineryId }),
  });

  const rows = fuelLogs.data?.results ?? [];
  const page = useTablePage(rows, { resetKey: machineryId });

  async function download() {
    setExporting(true);
    try {
      const name = machinery.data?.name?.replace(/\s+/g, "_") || machineryId;
      await api.exportFuelLogs(machineryId, `fuel_logs_${name}.xlsx`);
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
          <Link href={`/machinery/${machineryId}`} className={`${btnSecondaryClass} text-xs`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-coal">Fuel logs</h2>
            <p className="text-xs text-gray-500">{machinery.data?.name || "Machine"}</p>
          </div>
        </div>
        <button type="button" className={`${btnSecondaryClass} inline-flex items-center gap-1.5`} disabled={exporting || !rows.length} onClick={download}>
          <Download className="h-4 w-4" />
          {exporting ? "Downloading..." : "Download Excel"}
        </button>
      </div>

      {message && <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Previous meter</th>
              <th className="px-4 py-2.5">Current meter</th>
              <th className="px-4 py-2.5">Quantity</th>
              <th className="px-4 py-2.5">Cost</th>
              <th className="px-4 py-2.5">Photos</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {page.pageRows.map((item: FuelLog, i) => (
              <DataTableRow key={item.id} zebra={i % 2 === 1}>
                <DataTableCell>{item.logged_date}</DataTableCell>
                <DataTableCell>{item.project_name || "—"}</DataTableCell>
                <DataTableCell>{item.previous_meter_reading}</DataTableCell>
                <DataTableCell>{item.current_meter_reading}</DataTableCell>
                <DataTableCell>{item.fuel_quantity} L</DataTableCell>
                <DataTableCell>{formatCurrency(item.fuel_cost)}</DataTableCell>
                <DataTableCell>
                  {item.images?.length ? (
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
                    </div>
                  ) : (
                    "—"
                  )}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <TablePagination
          page={page.page}
          totalPages={page.totalPages}
          total={page.total}
          pageSize={page.pageSize}
          from={page.from}
          to={page.to}
          onPageChange={page.setPage}
        />
        {!fuelLogs.isLoading && !rows.length && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No fuel logs for this machine.</p>
        )}
      </div>
    </section>
  );
}

export function MachineryMaintenancePage({ machineryId }: { machineryId: number }) {
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const machinery = useQuery({
    queryKey: ["machinery", machineryId],
    queryFn: () => api.machineryItem(machineryId),
  });
  const maintenance = useQuery({
    queryKey: ["maintenance", machineryId],
    queryFn: () => api.maintenance(machineryId),
  });

  const rows = maintenance.data?.results ?? [];
  const page = useTablePage(rows, { resetKey: machineryId });

  async function download() {
    setExporting(true);
    try {
      const name = machinery.data?.name?.replace(/\s+/g, "_") || machineryId;
      await api.exportMaintenance(machineryId, `maintenance_${name}.xlsx`);
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
          <Link href={`/machinery/${machineryId}`} className={`${btnSecondaryClass} text-xs`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-coal">Maintenance history</h2>
            <p className="text-xs text-gray-500">{machinery.data?.name || "Machine"}</p>
          </div>
        </div>
        <button type="button" className={`${btnSecondaryClass} inline-flex items-center gap-1.5`} disabled={exporting || !rows.length} onClick={download}>
          <Download className="h-4 w-4" />
          {exporting ? "Downloading..." : "Download Excel"}
        </button>
      </div>

      {message && <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Service date</th>
              <th className="px-4 py-2.5">Details</th>
              <th className="px-4 py-2.5">Cost</th>
              <th className="px-4 py-2.5">Next due</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {page.pageRows.map((row: MachineryMaintenance, i) => (
              <DataTableRow key={row.id} zebra={i % 2 === 1}>
                <DataTableCell>{formatDate(row.service_date)}</DataTableCell>
                <DataTableCell>{row.details}</DataTableCell>
                <DataTableCell>{formatCurrency(row.cost)}</DataTableCell>
                <DataTableCell>{formatDate(row.next_service_due)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <TablePagination
          page={page.page}
          totalPages={page.totalPages}
          total={page.total}
          pageSize={page.pageSize}
          from={page.from}
          to={page.to}
          onPageChange={page.setPage}
        />
        {!maintenance.isLoading && !rows.length && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No maintenance records for this machine.</p>
        )}
      </div>
    </section>
  );
}

export function MachineryUsagePage({ machineryId }: { machineryId: number }) {
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  const machinery = useQuery({
    queryKey: ["machinery", machineryId],
    queryFn: () => api.machineryItem(machineryId),
  });
  const usage = useQuery({
    queryKey: ["machinery-usage", machineryId],
    queryFn: () => api.machineryUsage({ machinery: machineryId }),
  });

  const rows = usage.data?.results ?? [];
  const page = useTablePage(rows, { resetKey: machineryId });

  async function download() {
    setExporting(true);
    try {
      const name = machinery.data?.name?.replace(/\s+/g, "_") || machineryId;
      await api.exportMachineryUsage(machineryId, `usage_${name}.xlsx`);
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
          <Link href={`/machinery/${machineryId}`} className={`${btnSecondaryClass} text-xs`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-coal">Usage history</h2>
            <p className="text-xs text-gray-500">{machinery.data?.name || "Machine"}</p>
          </div>
        </div>
        <button type="button" className={`${btnSecondaryClass} inline-flex items-center gap-1.5`} disabled={exporting || !rows.length} onClick={download}>
          <Download className="h-4 w-4" />
          {exporting ? "Downloading..." : "Download Excel"}
        </button>
      </div>

      {message && <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">{message}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DataTable>
          <DataTableHead>
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Operator</th>
              <th className="px-4 py-2.5">Hours</th>
              <th className="px-4 py-2.5">KM</th>
              <th className="px-4 py-2.5">Fuel (L)</th>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {page.pageRows.map((item: MachineryUsage, i) => (
              <DataTableRow key={item.id} zebra={i % 2 === 1}>
                <DataTableCell>{formatDate(item.usage_date)}</DataTableCell>
                <DataTableCell>{item.project_name || "—"}</DataTableCell>
                <DataTableCell>{item.operator || "—"}</DataTableCell>
                <DataTableCell>{item.hours_used}</DataTableCell>
                <DataTableCell>{item.km_used}</DataTableCell>
                <DataTableCell>{item.fuel_consumption}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
        <TablePagination
          page={page.page}
          totalPages={page.totalPages}
          total={page.total}
          pageSize={page.pageSize}
          from={page.from}
          to={page.to}
          onPageChange={page.setPage}
        />
        {!usage.isLoading && !rows.length && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No usage records for this machine.</p>
        )}
      </div>
    </section>
  );
}
