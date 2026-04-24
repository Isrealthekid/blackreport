export type Role =
  | "admin"
  | "department_head"
  | "manager"
  | "reviewer"
  | "reporter"
  | "viewer"
  | "camper";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  department_head: "Department Head",
  manager: "Manager",
  reviewer: "Reviewer",
  reporter: "Reporter",
  viewer: "Viewer",
  camper:"Camper"
};

export interface User {
  id: string;
  organisation_id?: string;
  email: string;
  full_name: string;
  position?: string;
  is_admin: boolean;
  is_active?: boolean;
}

export interface Organisation {
  id: string;
  name: string;
  logo_url?: string | null;
  timezone: string;
  locale: string;
  retention_years: number;
}

export interface AssignedTemplate {
  template_id: string;
  name: string;
  version: number;
  is_published: boolean;
  schedule: string;
  deadline_time?: string;
}

export interface Department {
  id: string;
  organisation_id?: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  head_user_id?: string | null;
  is_archived?: boolean;
  chain_template_id?: string | null;
  chain_template_name?: string | null;
  assigned_templates?: AssignedTemplate[];
}

export interface DepartmentMember {
  user_id: string;
  role: Role;
  email: string;
  full_name: string;
}

export type FieldType =
  | "short_text"
  | "long_text"
  | "date"
  | "number"
  | "dropdown"
  | "multi_select"
  | "checkbox"
  | "file_upload"
  | "signature"
  | "table"
  | "rating"
  | "user_reference";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: "Short Text",
  long_text: "Long Text",
  date: "Date",
  number: "Number",
  dropdown: "Dropdown",
  multi_select: "Multi-select",
  checkbox: "Checkbox",
  file_upload: "File Upload",
  signature: "Signature",
  table: "Table / Grid",
  rating: "Rating",
  user_reference: "User Reference",
};

export interface ConditionalRule {
  field: string;
  equals: string;
}

export interface TemplateField {
  key: string;
  type: FieldType;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  conditional?: ConditionalRule;
}

export interface ReportTemplate {
  id: string;
  organisation_id: string;
  name: string;
  version: number;
  schema: TemplateField[];
  is_published: boolean;
}

export type ReportStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "escalated"
  | "revision_requested"
  | "recalled";

export interface Report {
  id: string;
  organisation_id: string;
  department_id: string;
  template_id: string;
  reporter_id: string;
  chain_template_id?: string | null;
  current_level: number;
  status: ReportStatus;
  data: Record<string, unknown>;
  submitted_at?: string | null;
  finalised_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalAction =
  | "approve"
  | "reject"
  | "request_changes"
  | "escalate"
  | "auto_approve";

export interface AuditEntry {
  level_index: number;
  actor_id: string;
  actor_name: string;
  action: ApprovalAction | string;
  comment?: string;
  created_at: string;
}

export interface ChainLevel {
  level_index: number;
  approver_role?: string;
  approver_user_ids?: string[];
  resolution: "any" | "all";
  time_limit_hours: number;
  escalation_action: "auto_approve" | "escalate" | "notify_admin";
}

export type ChainKind = "department" | "mission";

export interface ChainTemplate {
  id: string;
  name: string;
  /** Distinguishes report-flow chains (department) from drone-mission chains. */
  kind?: ChainKind;
  levels?: ChainLevel[];
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  created_at: string;
}

// ──────────── Drone Operations ────────────

export interface Client {
  id: string;
  organisation_id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
}

export type CampRole = "supervisor" | "camper";

export interface CampMember {
  user_id: string;
  role: CampRole;
  email: string;
  full_name: string;
}

export interface PastCampMember {
  user_id: string;
  role: CampRole;
  email: string;
  full_name: string;
  joined_at: string;
  removed_at: string;
  removed_by?: string | null;
}

export interface Camp {
  id: string;
  organisation_id: string;
  client_id: string;
  client_name?: string;
  site_name: string;
  site_code: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  members?: CampMember[];
  /** Optional: the chain attached to this camp's mission approvals. */
  chain_template_id?: string | null;
  chain_template_name?: string | null;
}

export type MissionStatus = "draft" | "submitted" | "approved" | "rejected";

export interface Mission {
  id: string;
  organisation_id: string;
  camp_id: string;
  /** User ID of the person who created/filled the mission. */
  reporter_id?: string;
  mission_number: string;
  mission_date: string;
  status: MissionStatus;
  has_sac16?: boolean;
  has_sac17?: boolean;
  has_sac18?: boolean;
  // Chain of command
  chain_template_id?: string | null;
  current_approval_level?: number;
  approved_by?: string | null;
  approved_by_name?: string;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissionApprovalEntry {
  level_index: number;
  actor_id: string;
  actor_name: string;
  action: ApprovalAction | string;
  comment?: string | null;
  created_at: string;
}

export interface FlightHour {
  hour: number;
  mission_order: string;
  report: string;
}

export interface SAC16 {
  id?: string;
  mission_id: string;
  mission_description: string;
  flight_hours: FlightHour[];
  signed_off?: boolean;
  signed_off_by?: string;
  signed_off_at?: string;
}

export interface SAC17 {
  id?: string;
  mission_id: string;
  mission_initiator?: string;
  unit?: string;
  remote_pilot?: string;
  flyer_id?: string;
  pre_flight_checklist?: Record<string, boolean>;
  observers?: string[];
  other_persons_military?: number;
  other_persons_civilian?: number;
  other_persons_other_agency?: number;
  take_off_latitude?: number;
  take_off_longitude?: number;
  landing_latitude?: number;
  landing_longitude?: number;
  date_from?: string;
  date_to?: string;
  permission?: string;
  notes?: string;
  mission_type?: string;
  flight_count?: number;
  flight_duration?: string;
  flight_id?: string;
  uav_model?: string;
  uav_serial?: string;
  payload_requirements?: string;
  detailed_mission_report?: string;
}

export interface SAC18ChecklistItem {
  value: "YES" | "N/A";
  notes?: string;
}

export interface SAC18RiskRow {
  something_seen: string;
  who_harmed: string;
  what_you_did: string;
  further_actions: string;
  action_by: string;
}

export interface SAC18OverflownEntry {
  name: string;
  contact_details: string;
  permission_given: "YES" | "NO" | "NA";
}

export interface SAC18 {
  id?: string;
  mission_id: string;
  risk_checklist?: Record<string, SAC18ChecklistItem>;
  risk_table?: SAC18RiskRow[];
  overflown_sites?: SAC18OverflownEntry[];
  overflown_areas?: SAC18OverflownEntry[];
  overflown_atzs?: SAC18OverflownEntry[];
  rp_observations?: string;
  pre_flight_checks_by?: string;
  pre_flight_checks_at?: string;
  permissions_given?: string;
  permissions_at?: string;
  pre_flight_briefing_by?: string;
  pre_flight_briefing_at?: string;
  num_flights?: number;
  flight_durations?: string;
  any_incidents?: boolean;
  incident_notes?: string;
  issues_or_alerts?: string;
  further_action_required?: string;
  other_information?: string;
  rp_signed_at?: string;
  supervisor_signed_at?: string;
  post_rp_signed_at?: string;
  post_supervisor_signed_at?: string;
}
