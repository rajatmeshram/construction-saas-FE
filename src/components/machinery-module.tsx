"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Shield, Truck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableRow,
  FormRow,
  TablePagination,
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useTablePage } from "@/lib/pagination";
import type { Machinery, MachineryDocument } from "@/lib/types";

function formatCurrency(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
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

export function MachineryDetailPage({ machineryId }: { machineryId: number }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [docType, setDocType] = useState<MachineryDocument["document_type"]>("INSURANCE");

  const machinery = useQuery({
    queryKey: ["machinery", machineryId],
    queryFn: () => api.machineryItem(machineryId),
  });

  const maintenance = useQuery({
    queryKey: ["maintenance", machineryId],
    queryFn: () => api.maintenance(machineryId),
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
  const maintenancePage = useTablePage(maintenanceRows, { resetKey: machineryId });

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

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600">Machinery</p>
            <h1 className="mt-1 text-lg font-semibold text-coal">{item.name}</h1>
            <p className="text-sm text-gray-500">{item.machine_type}</p>
          </div>
          <Badge tone={item.active ? "green" : "gray"}>{item.active ? "Active" : "Inactive"}</Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-violet-600" />
            <h2 className="text-base font-semibold text-coal">Maintenance History</h2>
          </div>
        </div>
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
            {maintenancePage.pageRows.map((row, i) => (
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
          page={maintenancePage.page}
          totalPages={maintenancePage.totalPages}
          total={maintenancePage.total}
          pageSize={maintenancePage.pageSize}
          from={maintenancePage.from}
          to={maintenancePage.to}
          onPageChange={maintenancePage.setPage}
        />
        {!maintenanceRows.length && <p className="px-4 py-6 text-center text-sm text-gray-500">No maintenance records yet.</p>}
      </div>
    </section>
  );
}
