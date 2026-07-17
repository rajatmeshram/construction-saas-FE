import { store } from "@/store";
import { clearSession, setSession } from "@/store/auth-slice";
import { buildListQuery } from "@/lib/pagination";
import type {
  AttendanceRecord,
  AuthUser,
  DashboardMetrics,
  Expense,
  FuelLog,
  LabourProfile,
  LabourSummary,
  Machinery,
  MachineryMaintenance,
  MachineryUsage,
  Material,
  MaterialStock,
  MonthlyAttendance,
  OperationsReport,
  Project,
  ProjectDocument,
  ProjectTask,
  Salary,
  SalaryProfile,
  SupervisorSummary,
  TaskMaterial,
  Vendor,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

function roundCoord(value?: number) {
  if (value == null || Number.isNaN(value)) {
    return undefined;
  }
  return Number(value.toFixed(6));
}

function formatApiError(error: Record<string, unknown>): string {
  if (typeof error.detail === "string") {
    return error.detail;
  }
  if (Array.isArray(error.non_field_errors) && error.non_field_errors[0]) {
    return String(error.non_field_errors[0]);
  }
  const fieldMessages = Object.entries(error).flatMap(([key, value]) => {
    if (Array.isArray(value) && value[0]) {
      return [`${key}: ${value[0]}`];
    }
    return [];
  });
  if (fieldMessages.length) {
    return fieldMessages.join(" ");
  }
  return JSON.stringify(error);
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = store.getState().auth.refreshToken;
  if (!refreshToken) {
    return false;
  }
  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as { access: string; refresh?: string };
  const user = store.getState().auth.user;
  if (!user) {
    return false;
  }
  store.dispatch(
    setSession({
      access: data.access,
      refresh: data.refresh ?? refreshToken,
      user,
    }),
  );
  return true;
}

async function request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const token = store.getState().auth.accessToken;
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && allowRetry && path !== "/auth/refresh/") {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    store.dispatch(clearSession());
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(formatApiError(error));
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

async function downloadRequest(path: string, filename: string, allowRetry = true): Promise<void> {
  const token = store.getState().auth.accessToken;
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (response.status === 401 && allowRetry && path !== "/auth/refresh/") {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return downloadRequest(path, filename, false);
    }
    store.dispatch(clearSession());
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Download failed" }));
    throw new Error(formatApiError(error));
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const resolvedName = match?.[1] ?? filename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = resolvedName;
  link.click();
  URL.revokeObjectURL(url);
}

type CreateTaskPayload = {
  project: number;
  title: string;
  description?: string;
  status: ProjectTask["status"];
  priority: ProjectTask["priority"];
  estimated_hours?: string;
  start_date?: string;
  due_date?: string;
  assigned_labours: number[];
};

export const api = {
  login: (username: string, password: string) =>
    request<{ access: string; refresh: string; user: AuthUser }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  dashboard: () => request<DashboardMetrics>("/projects/items/dashboard/"),
  users: () => request<{ results?: AuthUser[] }>(`/accounts/users/${buildListQuery()}`),
  labours: () => request<AuthUser[]>("/accounts/users/labours/"),
  supervisors: () => request<AuthUser[]>("/accounts/users/supervisors/"),
  createUser: (payload: {
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile_number: string;
    role: "SUPER_ADMIN" | "SUPERVISOR" | "LABOUR";
    salary?: string;
    daily_salary?: string | null;
  }) =>
    request<AuthUser>("/accounts/users/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteUser: (id: number) => request<void>(`/accounts/users/${id}/`, { method: "DELETE" }),
  bulkDeleteSupervisors: (ids: number[]) =>
    request<{
      deleted_count: number;
      skipped_count: number;
      skipped: Array<{ id: number; error: string }>;
    }>("/accounts/users/bulk_delete/", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  projects: () => request<{ results?: Project[] }>(`/projects/items/${buildListQuery()}`),
  project: (id: number) => request<Project>(`/projects/items/${id}/`),
  createProject: (payload: {
    name: string;
    code: string;
    client_name: string;
    location: string;
    start_date: string;
    end_date: string;
    estimated_budget: string;
    status: Project["status"];
    description: string;
    supervisors: number[];
    labours: number[];
  }) =>
    request<Project>("/projects/items/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateProject: (
    id: number,
    payload: Partial<{
      supervisors: number[];
      labours: number[];
      status: Project["status"];
      description: string;
    }>,
  ) =>
    request<Project>(`/projects/items/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  tasks: (projectId?: number) =>
    request<{ results?: ProjectTask[] }>(
      `/projects/tasks/${buildListQuery({ project: projectId })}`,
    ),
  createTask: (payload: CreateTaskPayload) =>
    request<ProjectTask>("/projects/tasks/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTask: (id: number, payload: Partial<CreateTaskPayload>) =>
    request<ProjectTask>(`/projects/tasks/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteTask: (id: number) => request<void>(`/projects/tasks/${id}/`, { method: "DELETE" }),
  createTaskMaterial: (payload: { task: number; material: number; quantity: string; notes?: string }) =>
    request<TaskMaterial>("/projects/task-materials/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  projectDocuments: (projectId: number) =>
    request<{ results?: ProjectDocument[] }>(`/projects/documents/${buildListQuery({ project: projectId })}`),
  uploadProjectDocument: (payload: { project: number; title: string; file: File; description?: string }) => {
    const formData = new FormData();
    formData.append("project", String(payload.project));
    formData.append("title", payload.title);
    formData.append("file", payload.file);
    if (payload.description) {
      formData.append("description", payload.description);
    }
    return request<ProjectDocument>("/projects/documents/", { method: "POST", body: formData });
  },
  deleteProjectDocument: (id: number) =>
    request<void>(`/projects/documents/${id}/`, { method: "DELETE" }),
  machineryUsage: (projectId?: number) =>
    request<{ results?: MachineryUsage[] }>(
      `/operations/machinery-usage/${buildListQuery({ project: projectId })}`,
    ),
  currentAttendance: () =>
    request<{ active: boolean; attendance?: AttendanceRecord }>("/attendance/records/current/"),
  punchIn: (payload: {
    project: number;
    latitude?: number;
    longitude?: number;
    selfie: File;
  }) => {
    const formData = new FormData();
    formData.append("project", String(payload.project));
    formData.append("punch_in_selfie", payload.selfie);
    const lat = roundCoord(payload.latitude);
    const lng = roundCoord(payload.longitude);
    if (lat != null) formData.append("punch_in_latitude", String(lat));
    if (lng != null) formData.append("punch_in_longitude", String(lng));
    return request<AttendanceRecord>("/attendance/records/punch_in/", { method: "POST", body: formData });
  },
  punchOut: (payload: { latitude?: number; longitude?: number; selfie: File }) => {
    const formData = new FormData();
    formData.append("punch_out_selfie", payload.selfie);
    const lat = roundCoord(payload.latitude);
    const lng = roundCoord(payload.longitude);
    if (lat != null) formData.append("punch_out_latitude", String(lat));
    if (lng != null) formData.append("punch_out_longitude", String(lng));
    return request<AttendanceRecord>("/attendance/records/punch_out/", { method: "POST", body: formData });
  },
  attendance: (projectId?: number, status?: AttendanceRecord["status"], labourId?: number) => {
    return request<{ results?: AttendanceRecord[] }>(
      `/attendance/records/${buildListQuery({
        project: projectId,
        status,
        labour: labourId,
      })}`,
    );
  },
  approveAttendance: (id: number, approval_status: "APPROVED" | "REJECTED", rejection_reason = "") =>
    request<AttendanceRecord>(`/attendance/records/${id}/approve/`, {
      method: "POST",
      body: JSON.stringify({ approval_status, rejection_reason }),
    }),
  attendanceRecord: (id: number) => request<AttendanceRecord>(`/attendance/records/${id}/`),
  monthlyAttendance: (month: number, year: number, labourId?: number) => {
    const params = new URLSearchParams({ month: String(month), year: String(year) });
    if (labourId) params.set("labour", String(labourId));
    return request<MonthlyAttendance>(`/attendance/records/monthly/?${params}`);
  },
  createSalaryProfile: (payload: {
    labour: number;
    monthly_salary: string;
    daily_wage: string;
    overtime_rate: string;
  }) =>
    request("/payroll/profiles/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createAdvance: (payload: { labour: number; amount: string; date: string; reason: string }) =>
    request("/payroll/advances/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateSalary: (payload: {
    labour: number;
    month: number;
    year: number;
    deductions?: string;
    till_date?: string;
  }) =>
    request<Salary>("/payroll/salaries/generate/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateAllSalaries: (payload: {
    month: number;
    year: number;
    deductions?: string;
    till_date?: string;
  }) =>
    request<{
      created_count: number;
      skipped_count: number;
      created_ids: number[];
      skipped: Array<{ labour_id: number; labour_name: string; error: string }>;
    }>("/payroll/salaries/generate_all/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  markSalaryPaid: (id: number) =>
    request<Salary>(`/payroll/salaries/${id}/mark_paid/`, { method: "POST" }),
  salaries: (params?: { month?: number; year?: number; labour?: number }) => {
    return request<{ results?: Salary[] }>(
      `/payroll/salaries/${buildListQuery({
        month: params?.month,
        year: params?.year,
        labour: params?.labour,
      })}`,
    );
  },
  exportSalaries: (params: { month: number; year: number }) => {
    const query = new URLSearchParams({
      month: String(params.month),
      year: String(params.year),
    });
    return downloadRequest(`/payroll/salaries/export/?${query.toString()}`, `payroll_${params.year}_${String(params.month).padStart(2, "0")}.xlsx`);
  },
  salary: (id: number) => request<Salary>(`/payroll/salaries/${id}/`),
  vendors: () => request<{ results?: Vendor[] }>(`/operations/vendors/${buildListQuery()}`),
  createVendor: (payload: {
    name: string;
    gst_number: string;
    address: string;
    contact_number: string;
    email: string;
    bank_details: string;
  }) =>
    request<Vendor>("/operations/vendors/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  materials: () => request<{ results?: Material[] }>(`/operations/materials/${buildListQuery()}`),
  createMaterial: (payload: { name: string; unit: string; low_stock_level: string }) =>
    request<Material>("/operations/materials/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  materialStock: () => request<{ results?: MaterialStock[] }>(`/operations/material-stock/${buildListQuery()}`),
  saveMaterialStock: (payload: {
    project: number;
    material: number;
    required_quantity: string;
    current_stock: string;
    used_stock: string;
    damaged_stock: string;
  }) =>
    request<MaterialStock>("/operations/material-stock/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createMaterialPurchase: (payload: {
    vendor: number;
    project: number;
    material: number;
    quantity: string;
    rate: string;
    gst_percent: string;
    invoice_number: string;
    purchase_date: string;
  }) =>
    request("/operations/material-purchases/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createMaterialRequest: (payload: { project: number; material: number; quantity: string; reason: string }) =>
    request("/operations/material-requests/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  expenses: () => request<{ results?: Expense[] }>(`/operations/expenses/${buildListQuery()}`),
  createExpense: (payload: { project: number; amount: string; category: string; description: string }) =>
    request<Expense>("/operations/expenses/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  approveExpense: (id: number, action: "approve" | "reject") =>
    request<Expense>(`/operations/expenses/${id}/${action}/`, { method: "POST" }),
  machinery: () => request<{ results?: Machinery[] }>(`/operations/machinery/${buildListQuery()}`),
  machineryItem: (id: number) => request<Machinery>(`/operations/machinery/${id}/`),
  createMachinery: (payload: {
    name: string;
    machine_type: string;
    registration_number: string;
    vehicle_number?: string;
    vehicle_class?: string;
    chassis_number?: string;
    engine_number?: string;
    insurance_provider?: string;
    insurance_policy_number?: string;
    insurance_start_date?: string;
    insurance_expiry_date?: string;
    permit_number?: string;
    permit_issue_date?: string;
    permit_expiry_date?: string;
    fitness_validity_date?: string;
    puc_date?: string;
    mv_tax_validity_date?: string;
    green_tax_date?: string;
    hsrp_done?: boolean;
    avg_km_per_liter?: string;
    avg_hours_per_liter?: string;
    notes?: string;
    active?: boolean;
    document_type?: string;
    documents?: File[];
  }) => {
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("machine_type", payload.machine_type);
    formData.append("registration_number", payload.registration_number);
    if (payload.vehicle_number) formData.append("vehicle_number", payload.vehicle_number);
    if (payload.vehicle_class) formData.append("vehicle_class", payload.vehicle_class);
    if (payload.chassis_number) formData.append("chassis_number", payload.chassis_number);
    if (payload.engine_number) formData.append("engine_number", payload.engine_number);
    if (payload.insurance_provider) formData.append("insurance_provider", payload.insurance_provider);
    if (payload.insurance_policy_number) formData.append("insurance_policy_number", payload.insurance_policy_number);
    if (payload.insurance_start_date) formData.append("insurance_start_date", payload.insurance_start_date);
    if (payload.insurance_expiry_date) formData.append("insurance_expiry_date", payload.insurance_expiry_date);
    if (payload.permit_number) formData.append("permit_number", payload.permit_number);
    if (payload.permit_issue_date) formData.append("permit_issue_date", payload.permit_issue_date);
    if (payload.permit_expiry_date) formData.append("permit_expiry_date", payload.permit_expiry_date);
    if (payload.fitness_validity_date) formData.append("fitness_validity_date", payload.fitness_validity_date);
    if (payload.puc_date) formData.append("puc_date", payload.puc_date);
    if (payload.mv_tax_validity_date) formData.append("mv_tax_validity_date", payload.mv_tax_validity_date);
    if (payload.green_tax_date) formData.append("green_tax_date", payload.green_tax_date);
    formData.append("hsrp_done", payload.hsrp_done ? "true" : "false");
    if (payload.avg_km_per_liter) formData.append("avg_km_per_liter", payload.avg_km_per_liter);
    if (payload.avg_hours_per_liter) formData.append("avg_hours_per_liter", payload.avg_hours_per_liter);
    if (payload.notes) formData.append("notes", payload.notes);
    formData.append("active", payload.active === false ? "false" : "true");
    if (payload.document_type) formData.append("document_type", payload.document_type);
    payload.documents?.forEach((file) => formData.append("documents", file));
    return request<Machinery>("/operations/machinery/", { method: "POST", body: formData });
  },
  uploadMachineryDocuments: (id: number, payload: { document_type?: string; documents: File[] }) => {
    const formData = new FormData();
    if (payload.document_type) formData.append("document_type", payload.document_type);
    payload.documents.forEach((file) => formData.append("documents", file));
    return request<Machinery>(`/operations/machinery/${id}/`, { method: "PATCH", body: formData });
  },
  createMachineryUsage: (payload: {
    project: number;
    machinery: number;
    operator: string;
    hours_used: string;
    km_used?: string;
    fuel_consumption: string;
    usage_date: string;
  }) =>
    request("/operations/machinery-usage/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createFuelLog: (payload: {
    project?: number;
    machinery: number;
    previous_meter_reading: string;
    current_meter_reading: string;
    fuel_quantity: string;
    fuel_cost: string;
    logged_date: string;
    bill_photos?: File[];
  }) => {
    const formData = new FormData();
    if (payload.project) formData.append("project", String(payload.project));
    formData.append("machinery", String(payload.machinery));
    formData.append("previous_meter_reading", payload.previous_meter_reading);
    formData.append("current_meter_reading", payload.current_meter_reading);
    formData.append("fuel_quantity", payload.fuel_quantity);
    formData.append("fuel_cost", payload.fuel_cost);
    formData.append("logged_date", payload.logged_date);
    payload.bill_photos?.forEach((file) => formData.append("bill_photos", file));
    return request<FuelLog>("/operations/fuel-logs/", { method: "POST", body: formData });
  },
  fuelLogs: () => request<{ results?: FuelLog[] }>(`/operations/fuel-logs/${buildListQuery()}`),
  createMaintenance: (payload: { machinery: number; service_date: string; details: string; cost: string; next_service_due: string }) =>
    request("/operations/maintenance/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  maintenance: (machineryId?: number) =>
    request<{ results?: MachineryMaintenance[] }>(
      `/operations/maintenance/${buildListQuery({ machinery: machineryId })}`,
    ),
  reports: () => request<OperationsReport>("/operations/reports/"),
  labourWorkers: (params?: { name?: string; mobile?: string; page?: number; page_size?: number; ordering?: string }) => {
    return request<{ count: number; next: string | null; previous: string | null; results: LabourProfile[] }>(
      `/labour/workers/${buildListQuery({
        name: params?.name,
        mobile: params?.mobile,
        page: params?.page,
        page_size: params?.page_size ?? 100,
        ordering: params?.ordering,
      })}`,
    );
  },
  labourWorker: (id: number) => request<LabourProfile>(`/labour/workers/${id}/`),
  labourWorkerSummary: (id: number) => request<LabourSummary>(`/labour/workers/${id}/summary/`),
  labourWorkerSalaries: (id: number, params?: { month?: number; year?: number }) => {
    const query = new URLSearchParams();
    if (params?.month) query.set("month", String(params.month));
    if (params?.year) query.set("year", String(params.year));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<Salary[]>(`/labour/workers/${id}/salaries${suffix}`);
  },
  createLabourWorker: (payload: {
    full_name: string;
    mobile_number: string;
    salary: string;
    daily_salary?: string | null;
    employee_id?: string;
    status?: "ACTIVE" | "INACTIVE";
    joining_date?: string;
    username?: string;
    password?: string;
    email?: string;
  }) =>
    request<LabourProfile>("/labour/workers/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateLabourWorker: (
    id: number,
    payload: Partial<{
      full_name: string;
      mobile_number: string;
      salary: string;
      daily_salary: string | null;
      employee_id: string;
      status: "ACTIVE" | "INACTIVE";
      joining_date: string;
    }>,
  ) =>
    request<LabourProfile>(`/labour/workers/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteLabourWorker: (id: number) => request<void>(`/labour/workers/${id}/`, { method: "DELETE" }),
  bulkDeleteLabourWorkers: (ids: number[]) =>
    request<{
      deleted_count: number;
      skipped_count: number;
      skipped: Array<{ id: number; error: string }>;
    }>("/labour/workers/bulk_delete/", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  importLabourWorkers: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{
      created_count: number;
      skipped_count: number;
      created: Array<{ row: number; id: number; name: string }>;
      skipped: Array<{ row: number; error: string }>;
    }>("/labour/workers/import_file/", { method: "POST", body: formData });
  },
  supervisorProfile: (id: number) => request<SupervisorSummary>(`/labour/supervisors/${id}/profile/`),
  salaryProfiles: (labourId?: number) => {
    const params = new URLSearchParams();
    if (labourId) params.set("labour", String(labourId));
    const query = params.toString();
    return request<{ results?: SalaryProfile[] }>(
      query ? `/payroll/profiles/?${query}` : "/payroll/profiles/",
    );
  },
  manualAttendance: (payload: {
    labour: number;
    project?: number;
    date: string;
    punch_in_time?: string;
    punch_out_time?: string;
    workday_value: number;
    attendance_mark?: "PRESENT" | "ABSENT" | "HALF_DAY";
    extra_hours?: number;
    notes?: string;
  }) =>
    request<AttendanceRecord>("/attendance/records/manual/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bulkAttendance: (payload: {
    labour_ids: number[];
    project?: number;
    date: string;
    punch_in_time?: string;
    punch_out_time?: string;
    workday_value: number;
    attendance_mark?: "PRESENT" | "ABSENT" | "HALF_DAY";
    extra_hours?: number;
    notes?: string;
  }) =>
    request<{ created_count: number; skipped_count: number; created_ids: number[]; skipped: Array<{ labour_id: number; error: string }> }>(
      "/attendance/records/bulk/",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  supervisorPunchIn: (payload: { project: number; latitude?: number; longitude?: number; selfie?: File }) => {
    const formData = new FormData();
    formData.append("project", String(payload.project));
    const lat = roundCoord(payload.latitude);
    const lng = roundCoord(payload.longitude);
    if (lat != null) formData.append("punch_in_latitude", String(lat));
    if (lng != null) formData.append("punch_in_longitude", String(lng));
    if (payload.selfie) formData.append("punch_in_selfie", payload.selfie);
    return request<AttendanceRecord>("/attendance/records/supervisor_punch_in/", { method: "POST", body: formData });
  },
  supervisorPunchOut: (payload: { latitude?: number; longitude?: number; selfie?: File }) => {
    const formData = new FormData();
    const lat = roundCoord(payload.latitude);
    const lng = roundCoord(payload.longitude);
    if (lat != null) formData.append("punch_out_latitude", String(lat));
    if (lng != null) formData.append("punch_out_longitude", String(lng));
    if (payload.selfie) formData.append("punch_out_selfie", payload.selfie);
    return request<AttendanceRecord>("/attendance/records/supervisor_punch_out/", { method: "POST", body: formData });
  },
};
