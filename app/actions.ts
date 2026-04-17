"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth";
import type {
  Camp,
  ChainLevel,
  Client,
  Department,
  FieldType,
  Mission,
  Notification,
  Report,
  ReportTemplate,
  TemplateField,
} from "@/lib/types";

// -------- auth --------

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  let token = "";
  try {
    const res = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    token = res.token;
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : "login_failed";
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/dashboard");
}

export async function bootstrapAction(formData: FormData) {
  const body = {
    organisation_name: String(formData.get("organisation_name") ?? ""),
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    position: String(formData.get("position") ?? "") || undefined,
  };
  let token = "";
  try {
    const res = await api<{ token: string }>("/auth/bootstrap", {
      method: "POST",
      body,
    });
    token = res.token;
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : "bootstrap_failed";
    redirect(`/login?bootstrap=1&error=${encodeURIComponent(msg)}`);
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/dashboard");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

// -------- organisation --------

export async function updateOrganisationAction(formData: FormData) {
  const body: Record<string, unknown> = {};
  for (const k of ["name", "logo_url", "timezone", "locale"] as const) {
    const v = formData.get(k);
    if (v != null && v !== "") body[k] = String(v);
  }
  const ry = formData.get("retention_years");
  if (ry) body.retention_years = Number(ry);
  await api("/organisation", { method: "PATCH", body });
  revalidatePath("/", "layout");
  redirect("/organisation");
}

// -------- departments --------

export async function createDepartmentAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const body = {
    name,
    description: String(formData.get("description") ?? "") || undefined,
    parent_id: String(formData.get("parent_id") ?? "") || undefined,
    head_user_id: String(formData.get("head_user_id") ?? "") || undefined,
  };
  const created = await api<Department>("/departments", {
    method: "POST",
    body,
  });

  // Create + assign chain of command.
  const chainRaw = String(formData.get("chain_levels") ?? "[]");
  let chainLevels: ChainLevel[] = [];
  try {
    chainLevels = JSON.parse(chainRaw);
  } catch {}
  if (chainLevels.length > 0) {
    try {
      const chain = await api<{ id: string }>("/chains", {
        method: "POST",
        body: {
          name: `${name} chain`,
          levels: chainLevels.slice(0, 5).map((l, i) => ({
            level_index: i + 1,
            approver_role: l.approver_role || undefined,
            approver_user_ids: l.approver_user_ids ?? [],
            resolution: l.resolution,
            time_limit_hours: Number(l.time_limit_hours) || 24,
            escalation_action: l.escalation_action,
          })),
        },
      });
      await api("/chains/assign", {
        method: "POST",
        body: {
          department_id: created.id,
          chain_template_id: chain.id,
        },
      });
    } catch {
      /* best-effort */
    }
  }

  // Assign selected templates.
  const templateIds = (formData.getAll("template_ids") as string[]).filter(
    Boolean,
  );
  const schedule = String(formData.get("schedule") ?? "adhoc");
  const deadline = String(formData.get("deadline_time") ?? "") || undefined;
  for (const tid of templateIds) {
    try {
      await api("/templates/assign", {
        method: "POST",
        body: {
          department_id: created.id,
          template_id: tid,
          schedule,
          deadline_time: deadline,
        },
      });
    } catch {
      /* best-effort */
    }
  }
  revalidatePath("/departments");
  revalidatePath("/templates");
  revalidatePath("/chains");
}

export async function updateDepartmentAction(formData: FormData) {
  const id = String(formData.get("id"));
  const body: Record<string, unknown> = {};
  for (const k of ["name", "description"] as const) {
    const v = formData.get(k);
    if (v != null) body[k] = String(v);
  }
  const parent = formData.get("parent_id");
  if (parent != null) body.parent_id = parent === "" ? null : String(parent);
  const head = formData.get("head_user_id");
  if (head != null) body.head_user_id = head === "" ? null : String(head);
  await api(`/departments/${id}`, { method: "PATCH", body });
  revalidatePath("/departments");
  revalidatePath(`/departments/${id}`);
  redirect(`/departments/${id}`);
}

export async function toggleArchiveDepartmentAction(formData: FormData) {
  const id = String(formData.get("id"));
  const next = formData.get("archived") !== "true";
  await api(`/departments/${id}`, { method: "PATCH", body: { is_archived: next } });
  revalidatePath("/departments");
}

export async function deleteDepartmentAction(formData: FormData) {
  const id = String(formData.get("id"));
  await api(`/departments/${id}`, { method: "DELETE" });
  revalidatePath("/departments");
  redirect("/departments");
}

export async function addDeptMemberAction(formData: FormData) {
  const id = String(formData.get("department_id"));
  const body = {
    user_id: String(formData.get("user_id")),
    role: String(formData.get("role") || "reporter"),
  };
  await api(`/departments/${id}/members`, { method: "POST", body });
  revalidatePath(`/departments/${id}`);
}

export async function removeDeptMemberAction(formData: FormData) {
  const id = String(formData.get("department_id"));
  const userId = String(formData.get("user_id"));
  await api(`/departments/${id}/members/${userId}`, { method: "DELETE" });
  revalidatePath(`/departments/${id}`);
}

// -------- users --------

const POSITION_LABELS: Record<string, string> = {
  admin: "Admin",
  department_head: "Department Head",
  manager: "Manager",
  reviewer: "Reviewer",
  reporter: "Reporter",
  viewer: "Viewer",
};

export async function createUserAction(formData: FormData) {
  const position = String(formData.get("role") ?? ""); // org position (admin, manager, etc.)
  const departmentId = String(formData.get("department_id") ?? "");
  const campRole = String(formData.get("camp_role") ?? ""); // camper | supervisor | ""
  const campId = String(formData.get("camp_id") ?? "");

  const positionLabel = POSITION_LABELS[position] ?? (campRole ? (campRole === "supervisor" ? "Supervisor" : "Camper") : "");

  const body = {
    email: String(formData.get("email") ?? "").trim(),
    full_name: String(formData.get("full_name") ?? "").trim(),
    position: positionLabel || undefined,
    password: String(formData.get("password") || process.env.DEFAULT_USER_PASSWORD || ""),
    is_admin: position === "admin",
  };

  if (!body.email || !body.full_name) redirect("/users?error=missing_fields");

  let created: { id: string };
  try {
    created = await api<{ id: string }>("/users", { method: "POST", body });
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) redirect("/users?error=email_exists");
    throw e;
  }

  // Assign to department if position is a dept role.
  if (position && departmentId && created?.id) {
    try {
      await api(`/departments/${departmentId}/members`, {
        method: "POST",
        body: { user_id: created.id, role: position },
      });
    } catch { /* best-effort */ }
  }

  // Assign to camp if camp role is set.
  if (campRole && campId && created?.id) {
    try {
      await api(`/camps/${campId}/members`, {
        method: "POST",
        body: { user_id: created.id, role: campRole },
      });
    } catch { /* best-effort */ }
  }

  revalidatePath("/users");
  revalidatePath("/departments");
  revalidatePath("/camps");
  redirect("/users");
}

export async function updateUserAction(formData: FormData) {
  const id = String(formData.get("id"));
  const body: Record<string, unknown> = {};
  for (const k of ["full_name", "position"] as const) {
    const v = formData.get(k);
    if (v != null && v !== "") body[k] = String(v);
  }
  if (formData.has("is_admin")) body.is_admin = formData.get("is_admin") === "on";
  if (formData.has("is_active")) body.is_active = formData.get("is_active") === "on";
  const pwd = String(formData.get("password") ?? "");
  if (pwd) body.password = pwd;
  await api(`/users/${id}`, { method: "PATCH", body });
  revalidatePath("/users");
}

export async function deactivateUserAction(formData: FormData) {
  const id = String(formData.get("id"));
  await api(`/users/${id}`, { method: "DELETE" });
  revalidatePath("/users");
}

export async function importUsersCsvAction(formData: FormData) {
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) return;
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const [headerLine, ...rows] = lines;
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
  const idx = (n: string) => headers.indexOf(n);
  const nameI = idx("full_name") >= 0 ? idx("full_name") : idx("name");
  const emailI = idx("email");
  const posI = idx("position");
  for (const line of rows) {
    const cols = line.split(",").map((c) => c.trim());
    const email = cols[emailI];
    const full_name = cols[nameI];
    if (!email || !full_name) continue;
    try {
      await api("/users", {
        method: "POST",
        body: {
          email,
          full_name,
          position: posI >= 0 ? cols[posI] || undefined : undefined,
          password: process.env.DEFAULT_USER_PASSWORD || "",
          is_admin: false,
        },
      });
    } catch {
      /* skip duplicates */
    }
  }
  revalidatePath("/users");
  redirect("/users");
}

// -------- templates --------

interface RawBuilderField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string;
  min?: number;
  max?: number;
  showIfFieldKey?: string;
  showIfEquals?: string;
}

function buildSchema(raw: RawBuilderField[]): TemplateField[] {
  return raw.map((f) => ({
    key: f.key,
    type: f.type,
    label: f.label,
    required: !!f.required,
    help: f.help || undefined,
    placeholder: f.placeholder || undefined,
    options:
      (f.type === "dropdown" || f.type === "multi_select") && f.options
        ? f.options.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    min: typeof f.min === "number" ? f.min : undefined,
    max: typeof f.max === "number" ? f.max : undefined,
    conditional: f.showIfFieldKey
      ? { field: f.showIfFieldKey, equals: f.showIfEquals ?? "" }
      : undefined,
  }));
}

export async function createTemplateAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const raw = String(formData.get("fields") ?? "[]");
  let parsed: RawBuilderField[] = [];
  try {
    parsed = JSON.parse(raw);
  } catch {}
  if (!name || parsed.length === 0) redirect("/templates/new?error=1");
  const schema = buildSchema(parsed);
  const created = await api<ReportTemplate>("/templates", {
    method: "POST",
    body: { name, schema },
  });
  try {
    await api(`/templates/${created.id}/publish`, { method: "POST" });
  } catch {}

  // Optionally assign to departments immediately.
  const deptIds = (formData.getAll("assign_department_ids") as string[]).filter(Boolean);
  const schedule = String(formData.get("assign_schedule") ?? "adhoc");
  const deadline = String(formData.get("assign_deadline_time") ?? "") || undefined;
  for (const did of deptIds) {
    try {
      await api("/templates/assign", {
        method: "POST",
        body: {
          department_id: did,
          template_id: created.id,
          schedule,
          deadline_time: deadline,
        },
      });
    } catch {}
  }

  revalidatePath("/templates");
  revalidatePath("/departments");
  redirect("/templates");
}

export async function deleteTemplateAction(formData: FormData) {
  const id = String(formData.get("id"));
  await api(`/templates/${id}`, { method: "DELETE" });
  revalidatePath("/templates");
  revalidatePath("/departments");
}

export async function unassignTemplateAction(formData: FormData) {
  const departmentId = String(formData.get("department_id"));
  const templateId = String(formData.get("template_id"));
  await api(`/templates/assign/${departmentId}/${templateId}`, {
    method: "DELETE",
  });
  revalidatePath("/templates");
  revalidatePath("/departments");
  revalidatePath(`/departments/${departmentId}`);
}

export async function publishTemplateAction(formData: FormData) {
  const id = String(formData.get("id"));
  await api(`/templates/${id}/publish`, { method: "POST" });
  revalidatePath("/templates");
}

export async function assignTemplateAction(formData: FormData) {
  const deptId = String(formData.get("department_id"));
  const body = {
    department_id: deptId,
    template_id: String(formData.get("template_id")),
    schedule: String(formData.get("schedule") || "adhoc"),
    deadline_time: String(formData.get("deadline_time") || "") || undefined,
  };
  await api("/templates/assign", { method: "POST", body });
  revalidatePath("/templates");
  revalidatePath("/departments");
  revalidatePath(`/departments/${deptId}`);
}

// -------- reports --------

function collectData(
  schema: TemplateField[],
  formData: FormData,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const f of schema) {
    if (f.type === "multi_select") {
      data[f.key] = formData.getAll(f.key) as string[];
    } else if (f.type === "checkbox") {
      const v = formData.get(f.key);
      data[f.key] = v === "on" || v === "true";
    } else if (f.type === "number" || f.type === "rating") {
      const v = formData.get(f.key);
      data[f.key] = v != null && v !== "" ? Number(v) : null;
    } else {
      data[f.key] = String(formData.get(f.key) ?? "");
    }
  }
  return data;
}

export async function submitReportAction(formData: FormData) {
  const department_id = String(formData.get("department_id"));
  const template_id = String(formData.get("template_id"));
  const action = String(formData.get("action") ?? "submit");
  const schemaRaw = String(formData.get("schema") ?? "[]");
  let schema: TemplateField[] = [];
  try {
    schema = JSON.parse(schemaRaw);
  } catch {}

  const data = collectData(schema, formData);
  const created = await api<Report>("/reports", {
    method: "POST",
    body: { department_id, template_id, data },
  });
  if (action === "submit") {
    try {
      await api(`/reports/${created.id}/submit`, { method: "POST" });
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    revalidatePath("/reports");
    redirect(`/reports/${created.id}?submitted=1`);
  }
  revalidatePath("/reports");
  redirect(`/reports/${created.id}`);
}

export async function updateDraftAction(formData: FormData) {
  const id = String(formData.get("id"));
  const action = String(formData.get("action") ?? "draft");
  const schemaRaw = String(formData.get("schema") ?? "[]");
  let schema: TemplateField[] = [];
  try {
    schema = JSON.parse(schemaRaw);
  } catch {}
  const data = collectData(schema, formData);
  await api(`/reports/${id}`, { method: "PATCH", body: { data } });
  if (action === "submit") {
    await api(`/reports/${id}/submit`, { method: "POST" });
    revalidatePath(`/reports/${id}`);
    revalidatePath("/reports");
    redirect(`/reports/${id}?submitted=1`);
  }
  revalidatePath(`/reports/${id}`);
  revalidatePath("/reports");
  redirect(`/reports/${id}`);
}

export async function recallReportAction(formData: FormData) {
  const id = String(formData.get("id"));
  try {
    await api(`/reports/${id}/recall`, { method: "POST" });
  } catch {}
  revalidatePath(`/reports/${id}`);
  revalidatePath("/reports");
}

// -------- approvals --------

export async function actOnReportAction(formData: FormData) {
  const id = String(formData.get("id"));
  const decision = String(formData.get("decision"));
  const comment = String(formData.get("comment") ?? "").trim() || undefined;
  const body = {
    action: decision === "revise" ? "request_changes" : decision,
    comment,
  };
  await api(`/approvals/${id}/act`, { method: "POST", body });
  revalidatePath("/approvals");
  revalidatePath(`/reports/${id}`);
  redirect("/approvals");
}

export async function bulkApproveAction(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  for (const id of ids) {
    try {
      await api(`/approvals/${id}/act`, {
        method: "POST",
        body: { action: "approve", comment: "Bulk approved" },
      });
    } catch {}
  }
  revalidatePath("/approvals");
}

// -------- notifications --------

export async function markNotificationReadAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id === "all") {
    try {
      const notifs = (await api<Notification[]>("/notifications")) ?? [];
      for (const n of notifs) {
        if (!n.read) {
          try {
            await api(`/notifications/${n.id}/read`, { method: "POST" });
          } catch {}
        }
      }
    } catch {}
  } else if (id) {
    await api(`/notifications/${id}/read`, { method: "POST" });
  }
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

// -------- chains --------

interface RawChainLevel {
  level_index: number;
  approver_role?: string;
  approver_user_ids?: string[];
  resolution: "any" | "all";
  time_limit_hours: number;
  escalation_action: "auto_approve" | "escalate" | "notify_admin";
}

export async function createChainAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const raw = String(formData.get("levels") ?? "[]");
  let levels: RawChainLevel[] = [];
  try {
    levels = JSON.parse(raw);
  } catch {}
  if (!name || levels.length === 0) return;
  const cleaned: ChainLevel[] = levels.slice(0, 5).map((l, i) => ({
    level_index: i + 1,
    approver_role: l.approver_role || undefined,
    approver_user_ids: l.approver_user_ids ?? [],
    resolution: l.resolution,
    time_limit_hours: Number(l.time_limit_hours) || 24,
    escalation_action: l.escalation_action,
  }));
  await api("/chains", { method: "POST", body: { name, levels: cleaned } });
  revalidatePath("/chains");
  redirect("/chains");
}

export async function assignChainAction(formData: FormData) {
  const body = {
    department_id: String(formData.get("department_id")),
    chain_template_id: String(formData.get("chain_template_id")),
  };
  await api("/chains/assign", { method: "POST", body });
  revalidatePath("/chains");
  revalidatePath("/departments");
}

// ──────────── Clients ────────────

export async function createClientAction(formData: FormData) {
  const body = {
    name: String(formData.get("name") ?? "").trim(),
    contact_name: String(formData.get("contact_name") ?? "") || undefined,
    contact_email: String(formData.get("contact_email") ?? "") || undefined,
    contact_phone: String(formData.get("contact_phone") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
  };
  if (!body.name) return;
  await api("/clients", { method: "POST", body });
  revalidatePath("/clients");
}

export async function updateClientAction(formData: FormData) {
  const id = String(formData.get("id"));
  const body: Record<string, unknown> = {};
  for (const k of ["name", "contact_name", "contact_email", "contact_phone", "notes"]) {
    const v = formData.get(k);
    if (v != null) body[k] = String(v) || null;
  }
  await api(`/clients/${id}`, { method: "PATCH", body });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteClientAction(formData: FormData) {
  const id = String(formData.get("id"));
  await api(`/clients/${id}`, { method: "DELETE" });
  revalidatePath("/clients");
}

// ──────────── Camps ────────────

export async function createCampAction(formData: FormData) {
  const body = {
    client_id: String(formData.get("client_id")),
    site_name: String(formData.get("site_name") ?? "").trim(),
    site_code: String(formData.get("site_code") ?? "").trim(),
    state: String(formData.get("state") ?? "") || undefined,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : undefined,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : undefined,
    address: String(formData.get("address") ?? "") || undefined,
  };
  if (!body.site_name || !body.site_code) return;
  await api("/camps", { method: "POST", body });
  revalidatePath("/camps");
}

export async function updateCampAction(formData: FormData) {
  const id = String(formData.get("id"));
  const body: Record<string, unknown> = {};
  for (const k of ["site_name", "site_code", "state", "address"]) {
    const v = formData.get(k);
    if (v != null) body[k] = String(v) || null;
  }
  for (const k of ["latitude", "longitude"]) {
    const v = formData.get(k);
    if (v != null && v !== "") body[k] = Number(v);
  }
  await api(`/camps/${id}`, { method: "PATCH", body });
  revalidatePath("/camps");
  redirect(`/camps/${id}`);
}

export async function deleteCampAction(formData: FormData) {
  const id = String(formData.get("id"));
  await api(`/camps/${id}`, { method: "DELETE" });
  revalidatePath("/camps");
  redirect("/camps");
}

export async function addCampMemberAction(formData: FormData) {
  const id = String(formData.get("camp_id"));
  const body = {
    user_id: String(formData.get("user_id")),
    role: String(formData.get("role") || "camper"),
  };
  await api(`/camps/${id}/members`, { method: "POST", body });
  revalidatePath(`/camps/${id}`);
}

export async function removeCampMemberAction(formData: FormData) {
  const id = String(formData.get("camp_id"));
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role") ?? "");
  const qs = role ? `?role=${role}` : "";
  await api(`/camps/${id}/members/${userId}${qs}`, { method: "DELETE" });
  revalidatePath(`/camps/${id}`);
}

// ──────────── Missions ────────────

export async function createMissionAction(formData: FormData) {
  const rawDate = String(formData.get("mission_date") ?? "");
  // Convert "2026-04-17" to RFC3339 "2026-04-17T09:00:00Z"
  const missionDate = rawDate ? (rawDate.includes("T") ? rawDate : `${rawDate}T09:00:00Z`) : undefined;
  const body = {
    camp_id: String(formData.get("camp_id")),
    mission_number: String(formData.get("mission_number") ?? "").trim(),
    mission_date: missionDate,
  };
  if (!body.mission_number || !body.camp_id) return;
  const m = await api<Mission>("/missions", { method: "POST", body });
  revalidatePath("/missions");
  redirect(`/missions/${m.id}`);
}

export async function updateMissionAction(formData: FormData) {
  const id = String(formData.get("id"));
  const body: Record<string, unknown> = {};
  for (const k of ["mission_number", "mission_date", "status"]) {
    const v = formData.get(k);
    if (v != null && v !== "") body[k] = String(v);
  }
  await api(`/missions/${id}`, { method: "PATCH", body });
  revalidatePath(`/missions/${id}`);
  revalidatePath("/missions");

  const status = String(formData.get("status") ?? "");
  if (status === "approved") redirect(`/missions/${id}?approved=1`);
  if (status === "rejected") redirect(`/missions/${id}?rejected=1`);
  if (status === "submitted") redirect(`/missions/${id}`);
}

export async function deleteMissionAction(formData: FormData) {
  const id = String(formData.get("id"));
  await api(`/missions/${id}`, { method: "DELETE" });
  revalidatePath("/missions");
  redirect("/missions");
}

// ──────────── SAC 16 ────────────

export async function saveSAC16Action(formData: FormData) {
  const missionId = String(formData.get("mission_id"));
  const raw = String(formData.get("payload") ?? "{}");
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(raw); } catch {}
  await api(`/missions/${missionId}/sac16`, { method: "PUT", body: payload });
  revalidatePath(`/missions/${missionId}`);
  redirect(`/missions/${missionId}`);
}

export async function signoffSAC16Action(formData: FormData) {
  const missionId = String(formData.get("mission_id"));
  const body = {
    comment: String(formData.get("comment") ?? "") || undefined,
    signature_id: String(formData.get("signature_id")),
  };
  await api(`/missions/${missionId}/sac16/signoff`, { method: "POST", body });
  revalidatePath(`/missions/${missionId}`);
  redirect(`/missions/${missionId}`);
}

// ──────────── SAC 17 ────────────

export async function saveSAC17Action(formData: FormData) {
  const missionId = String(formData.get("mission_id"));
  const raw = String(formData.get("payload") ?? "{}");
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(raw); } catch {}
  await api(`/missions/${missionId}/sac17`, { method: "PUT", body: payload });
  revalidatePath(`/missions/${missionId}`);
  redirect(`/missions/${missionId}`);
}

// ──────────── SAC 18 ────────────

export async function saveSAC18Action(formData: FormData) {
  const missionId = String(formData.get("mission_id"));
  const raw = String(formData.get("payload") ?? "{}");
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(raw); } catch {}
  await api(`/missions/${missionId}/sac18`, { method: "PUT", body: payload });
  revalidatePath(`/missions/${missionId}`);
  redirect(`/missions/${missionId}`);
}

export async function signSAC18Action(formData: FormData) {
  const missionId = String(formData.get("mission_id"));
  const endpoint = String(formData.get("endpoint")); // rp-sign | supervisor-sign | post-rp-sign | post-supervisor-sign
  const body = {
    signature_id: String(formData.get("signature_id")),
    comment: String(formData.get("comment") ?? "") || undefined,
  };
  await api(`/missions/${missionId}/sac18/${endpoint}`, { method: "POST", body });
  revalidatePath(`/missions/${missionId}`);
}

// ──────────── Signatures ────────────

export async function uploadSignatureAction(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file");
  const form = new FormData();
  form.append("file", file);
  const { apiUpload } = await import("@/lib/api");
  const res = await apiUpload<{ id: string }>("/signatures", form);
  return res.id;
}
