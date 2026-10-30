export type Role = "admin" | "manager" | "employee";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Pagination {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  is_password_set: boolean;
  department: number | null;
  department_name: string | null;
  reporting_manager: number | null;
  reporting_manager_name: string | null;
  date_joined: string;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  policy_id: number | null;
  annual_entitlement: string | null;
  created_at: string;
}

export interface LeavePolicy {
  id: number;
  leave_type: number;
  leave_type_name: string;
  annual_entitlement: string;
  max_consecutive_days: number;
  half_day_allowed: boolean;
  approval_required: boolean;
  is_active: boolean;
}

export interface LeaveBalance {
  id: number;
  user: number;
  user_name: string;
  leave_type: number;
  leave_type_name: string;
  year: number;
  entitled_days: string;
  used_days: string;
  remaining_days: string;
  pending_days: string;
}

export interface LeaveHistoryEntry {
  id: number;
  action: string;
  action_by: number | null;
  action_by_name: string;
  old_status: string;
  new_status: string;
  comment: string;
  created_at: string;
}

export interface LeaveRequest {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  department_name: string | null;
  leave_type: number;
  leave_type_name: string;
  approver: number | null;
  approver_name: string | null;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  total_days: string;
  reason: string;
  status: LeaveStatus;
  decision_comment: string;
  decided_at: string | null;
  created_at: string;
  history?: LeaveHistoryEntry[];
}

export interface CalendarEntry {
  id: number;
  employee: number;
  employee_name: string;
  department_name: string | null;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  total_days: string;
  status: LeaveStatus;
}

export interface AppNotification {
  id: number;
  leave_request: number | null;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface CompanySettings {
  company_name: string;
  support_email: string;
  email_notifications_enabled: boolean;
  updated_at: string;
}

export type StatusCounts = Record<LeaveStatus, number>;

export interface AdminSummary {
  year: number;
  total_employees: number;
  users_by_role: Partial<Record<Role, number>>;
  total_departments: number;
  employees_by_department: { id: number; name: string; total: number }[];
  requests_by_status: StatusCounts;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  on_leave_today: number;
}

export interface LeaveUsageReport {
  year: number;
  by_leave_type: { leave_type_name: string; entitled: string; used: string; remaining: string }[];
  by_department: { department_name: string; days: string; requests: number }[];
  by_month: { month: string; days: string }[];
}

export interface Dashboard {
  role: Role;
  year: number;
  my_balances: LeaveBalance[];
  my_requests: StatusCounts;
  upcoming_leaves: { id: number; leave_type_name: string; start_date: string; end_date: string; total_days: string }[];
  team_size?: number;
  pending_approvals?: number;
  team_on_leave_today?: { employee_name: string; leave_type_name: string; end_date: string }[];
  summary?: AdminSummary;
}
