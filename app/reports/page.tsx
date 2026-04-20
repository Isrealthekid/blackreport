import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import type { Department, DepartmentMember, Report, User } from "@/lib/types";

const statusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  pending: "bg-yellow-900 text-yellow-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
  revision_requested: "bg-orange-900 text-orange-200",
  escalated: "bg-purple-900 text-purple-200",
  recalled: "bg-neutral-800 text-neutral-500",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Approval",
  revision_requested: "Revision Requested",
};

// Hierarchy from highest (0) to lowest (5).
const HIERARCHY: Record<string, number> = {
  admin: 0,
  department_head: 1,
  manager: 2,
  reviewer: 3,
  reporter: 4,
  viewer: 5,
};

/** Returns all roles strictly below the given role in the hierarchy. */
function rolesBelow(role: string): string[] {
  const rank = HIERARCHY[role];
  if (rank == null) return [];
  return Object.entries(HIERARCHY)
    .filter(([, r]) => r > rank)
    .map(([name]) => name);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    department_id?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const isAdmin = user.is_admin;

  // ── Fetch org data ──
  const [deptsRaw, usersRaw] = await Promise.all([
    apiMaybe<unknown>("/departments"),
    isAdmin ? apiMaybe<unknown>("/users") : Promise.resolve(null),
  ]);
  const allDepts = extractItems<Department>(deptsRaw);
  const allUsers = extractItems<User>(usersRaw);

  // ── Admin: sees everything ──
  if (isAdmin) {
    const params = new URLSearchParams();
    if (sp.status) params.set("status", sp.status);
    if (sp.department_id) params.set("department_id", sp.department_id);
    params.set("limit", "200");

    const raw = await apiMaybe<unknown>(`/reports?${params}`);
    const reports = extractItems<Report>(raw);
    const sorted = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at));

    const deptMap = new Map(allDepts.map((d) => [d.id, d]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return (
      <Page
        title="All Reports"
        subtitle={`Showing ${sorted.length} reports across the organisation.`}
        reports={sorted}
        deptMap={deptMap}
        userMap={userMap}
        showReporterCol
        showDeptCol
        departments={allDepts}
        sp={sp}
      />
    );
  }

  // ── Non-admin: determine per-department role + hierarchical visibility ──
  // Step 1: find the user's role in each department.
  const activeDepts = allDepts.filter((d) => !d.is_archived);
  const myMemberships: { dept: Department; role: string; members: DepartmentMember[] }[] = [];

  await Promise.all(
    activeDepts.map(async (d) => {
      const members = extractItems<DepartmentMember>(
        await apiMaybe<unknown>(`/departments/${d.id}/members`),
      );
      const mine = members.find((m) => m.user_id === user.id);
      if (mine) {
        myMemberships.push({ dept: d, role: mine.role, members });
      }
    }),
  );

  // Step 2: for each department the user is in, find reports from roles below.
  const visibleReports: Report[] = [];
  const seenIds = new Set<string>();

  for (const { dept, role, members } of myMemberships) {
    const below = rolesBelow(role);
    if (below.length === 0) continue; // viewer sees nothing downward

    // Find user IDs of members with roles below mine in this department.
    const subordinateIds = members
      .filter((m) => below.includes(m.role) && m.user_id !== user.id)
      .map((m) => m.user_id);

    if (subordinateIds.length === 0) continue;

    // Fetch reports for this department.
    const params = new URLSearchParams();
    params.set("department_id", dept.id);
    if (sp.status) params.set("status", sp.status);
    params.set("limit", "200");
    const raw = await apiMaybe<unknown>(`/reports?${params}`);
    const deptReports = extractItems<Report>(raw);

    // Filter to only reports by subordinates.
    for (const r of deptReports) {
      if (subordinateIds.includes(r.reporter_id) && !seenIds.has(r.id)) {
        visibleReports.push(r);
        seenIds.add(r.id);
      }
    }
  }

  // Step 3: also include own reports.
  const mineRaw = await apiMaybe<unknown>("/reports/mine");
  const mine = extractItems<Report>(mineRaw);
  for (const r of mine) {
    if (!seenIds.has(r.id)) {
      visibleReports.push(r);
      seenIds.add(r.id);
    }
  }

  const sorted = visibleReports.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Build user lookup from membership data.
  const userMap = new Map<string, { full_name: string }>();
  for (const { members } of myMemberships) {
    for (const m of members) {
      if (!userMap.has(m.user_id)) {
        userMap.set(m.user_id, { full_name: m.full_name });
      }
    }
  }
  const deptMap = new Map(allDepts.map((d) => [d.id, d]));

  const myDeptIds = myMemberships.map((m) => m.dept.id);
  const highestRole = myMemberships.reduce(
    (best, m) => {
      const rank = HIERARCHY[m.role] ?? 99;
      return rank < best.rank ? { role: m.role, rank } : best;
    },
    { role: "viewer", rank: 99 },
  );

  const isViewer = highestRole.role === "viewer";
  const roleName =
    highestRole.role === "department_head"
      ? "Department Head"
      : highestRole.role.charAt(0).toUpperCase() + highestRole.role.slice(1);

  return (
    <Page
      title={isViewer ? "My Reports" : `${roleName} — Reports`}
      subtitle={
        isViewer
          ? undefined
          : `Reports from roles below you in ${myMemberships.map((m) => m.dept.name).join(", ")} + your own.`
      }
      reports={sorted}
      deptMap={deptMap}
      userMap={userMap as Map<string, User>}
      showReporterCol={!isViewer}
      showDeptCol={myDeptIds.length > 1}
      departments={allDepts.filter((d) => myDeptIds.includes(d.id))}
      sp={sp}
    />
  );
}

// ── Shared table component ──

function Page({
  title,
  subtitle,
  reports,
  deptMap,
  userMap,
  showReporterCol,
  showDeptCol,
  departments,
  sp,
}: {
  title: string;
  subtitle?: string;
  reports: Report[];
  deptMap: Map<string, Department>;
  userMap: Map<string, { full_name: string }>;
  showReporterCol: boolean;
  showDeptCol: boolean;
  departments: Department[];
  sp: { status?: string; department_id?: string };
}) {
  const cols = 4 + (showReporterCol ? 1 : 0) + (showDeptCol ? 1 : 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Link href="/reports/new" className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium">
          New report
        </Link>
      </div>
      {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}

      <form method="GET" className="mt-4 flex gap-2 flex-wrap">
        <select name="status" defaultValue={sp.status ?? ""} className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["draft", "pending", "approved", "rejected", "revision_requested", "escalated", "recalled"].map((s) => (
            <option key={s} value={s}>{statusLabels[s] ?? s.replace("_", " ")}</option>
          ))}
        </select>
        {showDeptCol && (
          <select name="department_id" defaultValue={sp.department_id ?? ""} className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
        <button className="text-xs px-3 py-2 border border-neutral-700 rounded">Filter</button>
      </form>

      <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">ID</th>
              {showReporterCol && <th className="text-left px-4 py-2">Reporter</th>}
              {showDeptCol && <th className="text-left px-4 py-2">Department</th>}
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Submitted</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr><td colSpan={cols} className="text-center py-10 text-neutral-500">No reports found.</td></tr>
            )}
            {reports.map((r) => {
              const reporter =
                userMap.get(r.reporter_id)?.full_name ??
                (r.data?.name ? String(r.data.name) : r.reporter_id.slice(0, 8));
              const dept = deptMap.get(r.department_id)?.name ?? "—";
              return (
                <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-900">
                  <td className="px-4 py-2">
                    <Link href={`/reports/${r.id}`} className="hover:underline font-mono text-xs">{r.id.slice(0, 8)}</Link>
                  </td>
                  {showReporterCol && <td className="px-4 py-2 text-neutral-300">{reporter}</td>}
                  {showDeptCol && <td className="px-4 py-2 text-neutral-400">{dept}</td>}
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[r.status] ?? "bg-neutral-800"}`}>
                      {statusLabels[r.status] ?? r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/reports/${r.id}`}
                        className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/reports/${r.id}/print`}
                        target="_blank"
                        className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                      >
                        Print
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
