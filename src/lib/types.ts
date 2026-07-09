export type UserRole = "SUPER_ADMIN" | "SUPERVISOR" | "LABOUR";

export type AuthUser = {
  id: number;
  username: string;
  full_name: string;
  mobile_number: string;
  role: UserRole;
};

export type DashboardMetrics = {
  total_projects: number;
  active_projects: number;
  workers_present: number;
  pending_approvals: number;
  monthly_payroll: string;
  budget: {
    total: string | null;
    actual: string | null;
  };
  status_breakdown: Array<{ status: string; total: number }>;
  attendance_trend: Array<{ date: string; label: string; present: number; hours: number }>;
  spend_breakdown: Array<{ name: string; value: number }>;
};

export type AttendanceRecord = {
  id: number;
  labour: number;
  project: number | null;
  project_name: string;
  labour_name: string;
  status: "PUNCHED_IN" | "PUNCHED_OUT";
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  punch_in_at: string;
  punch_out_at: string | null;
  punch_in_latitude: string | null;
  punch_in_longitude: string | null;
  punch_out_latitude: string | null;
  punch_out_longitude: string | null;
  punch_in_selfie_url: string | null;
  punch_out_selfie_url: string | null;
  working_hours: number;
  extra_hours?: number;
  entry_type?: "MOBILE" | "MANUAL" | "SUPERVISOR_SELF" | "BULK";
  attendance_mark?: "PRESENT" | "ABSENT" | "HALF_DAY";
  notes?: string;
};

export type AssignedProject = {
  id: number;
  code: string;
  name: string;
  status: string;
};

export type LabourProfile = {
  id: number;
  user_id: number;
  full_name: string;
  mobile_number: string;
  username: string;
  email: string;
  employee_id: string | null;
  salary: string;
  status: "ACTIVE" | "INACTIVE";
  joining_date: string | null;
  assigned_projects: AssignedProject[];
  created_at: string;
  updated_at: string;
};

export type LabourSummary = {
  profile: LabourProfile;
  attendance_stats: {
    total_present_days: number;
    total_absent_days: number;
    total_working_hours: number;
    pending_approvals: number;
  };
  salary_profile: {
    monthly_salary: string;
    daily_wage: string;
    overtime_rate: string;
  } | null;
  advances: Array<{ id: number; amount: string; date: string; reason: string }>;
  salary_history: Array<{
    id: number;
    month: number;
    year: number;
    period_start: string;
    period_end: string;
    working_days: string;
    overtime_hours: string;
    gross_pay: string;
    advances: string;
    deductions: string;
    net_pay: string;
    payment_status: "PENDING" | "PAID";
    paid_at: string | null;
  }>;
};

export type SupervisorSummary = {
  profile: {
    id: number;
    full_name: string;
    mobile_number: string;
    username: string;
    email: string;
    role: string;
  };
  attendance_stats: {
    total_present_days: number;
    total_working_hours: number;
    pending_approvals: number;
  };
  salary_profile: {
    monthly_salary: string;
    daily_wage: string;
    overtime_rate: string;
  } | null;
  advances: Array<{ id: number; amount: string; date: string; reason: string }>;
  salary_history: Array<{
    id: number;
    month: number;
    year: number;
    period_start: string;
    period_end: string;
    working_days: string;
    overtime_hours: string;
    gross_pay: string;
    advances: string;
    deductions: string;
    net_pay: string;
    payment_status: "PENDING" | "PAID";
    paid_at: string | null;
  }>;
};

export type SalaryProfile = {
  id: number;
  labour: number;
  monthly_salary: string;
  daily_wage: string;
  overtime_rate: string;
};

export type MonthlyAttendance = {
  month: number;
  year: number;
  present_days: number;
  absent_days: number;
  total_hours: number;
  days_in_month: number;
  days: Record<
    string,
    {
      present: boolean;
      attendance_mark?: "PRESENT" | "ABSENT" | "HALF_DAY";
      working_hours: number;
      approval_status: string;
      project_name: string;
      status: string;
      sessions: number;
    }
  >;
};

export type Salary = {
  id: number;
  labour: number;
  labour_name: string;
  month: number;
  year: number;
  period_start: string;
  period_end: string;
  working_days: string;
  overtime_hours: string;
  gross_pay: string;
  advances: string;
  deductions: string;
  net_pay: string;
  payment_status: "PENDING" | "PAID";
  paid_at: string | null;
  paid_by: number | null;
  paid_by_name?: string;
};

export type UserMini = {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  mobile_number: string;
};

export type Project = {
  id: number;
  name: string;
  code: string;
  client_name: string;
  location: string;
  start_date: string;
  end_date: string;
  estimated_budget: string;
  actual_cost: string;
  status: "DRAFT" | "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  description: string;
  supervisors: number[];
  labours: number[];
  supervisor_details?: UserMini[];
  labour_details?: UserMini[];
  remaining_budget?: string;
};

export type ProjectTask = {
  id: number;
  project: number;
  project_name?: string;
  title: string;
  description: string;
  assigned_to: number | null;
  assigned_labours: number[];
  assigned_labour_details?: UserMini[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  estimated_hours: string | null;
  start_date: string | null;
  due_date: string | null;
  materials?: TaskMaterial[];
};

export type TaskMaterial = {
  id: number;
  task: number;
  material: number;
  material_name: string;
  material_unit: string;
  quantity: string;
  notes: string;
};

export type ProjectDocument = {
  id: number;
  project: number;
  title: string;
  file?: string;
  file_url: string;
  description: string;
  uploaded_by: number;
  uploaded_by_name: string;
  created_at: string;
};

export type MachineryUsage = {
  id: number;
  project: number;
  project_name: string;
  machinery: number;
  machinery_name: string;
  operator: string;
  hours_used: string;
  fuel_consumption: string;
  usage_date: string;
};

export type FuelLogImage = {
  id: number;
  image_url: string;
  created_at: string;
};

export type FuelLog = {
  id: number;
  project: number | null;
  project_name: string | null;
  machinery: number;
  machinery_name: string;
  previous_meter_reading: string;
  current_meter_reading: string;
  fuel_quantity: string;
  fuel_cost: string;
  logged_date: string;
  images: FuelLogImage[];
  bill_photo_url: string | null;
  created_at: string;
};

export type NamedItem = {
  id: number;
  name: string;
};

export type OperationsReport = {
  material_spend: string | number;
  approved_expenses: string | number;
  machinery_hours: string | number;
  fuel_cost: string | number;
  open_material_requests: number;
  maintenance_due: number;
};

export type Vendor = NamedItem & {
  contact_number: string;
  gst_number: string;
};

export type Material = NamedItem & {
  unit: string;
  low_stock_level: string;
};

export type MaterialStock = {
  id: number;
  project: number;
  project_name: string;
  material: number;
  material_name: string;
  material_unit: string;
  required_quantity: string;
  current_stock: string;
  used_stock: string;
  damaged_stock: string;
  remaining_stock: string;
  shortage_quantity: string;
};

export type Expense = {
  id: number;
  project_name: string;
  amount: string;
  category: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type Machinery = NamedItem & {
  machine_type: string;
  registration_number: string;
  vehicle_number: string;
  insurance_provider: string;
  insurance_policy_number: string;
  insurance_start_date: string | null;
  insurance_expiry_date: string | null;
  permit_number: string;
  permit_issue_date: string | null;
  permit_expiry_date: string | null;
  notes: string;
  active: boolean;
  documents: MachineryDocument[];
};

export type MachineryDocument = {
  id: number;
  document_type: "INSURANCE" | "PERMIT" | "RC" | "OTHER";
  title: string;
  file_url: string | null;
  uploaded_at: string;
};

export type MachineryMaintenance = {
  id: number;
  machinery: number;
  machinery_name: string;
  service_date: string;
  details: string;
  cost: string;
  next_service_due: string | null;
};
