import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import type { Department, DepartmentMember, Report, User } from "@/lib/types";
import ReportsTable from "@/components/ReportsTable";

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

export default async function ReportsPage() {
  const user = await requireUser();
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
    const raw = await apiMaybe<unknown>("/reports?limit=500");
    const reports = extractItems<Report>(raw);
    const sorted = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at));

    const deptMap = new Map(allDepts.map((d) => [d.id, d]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const deptRecord: Record<string, { name: string }> = {};
    for (const [id, d] of deptMap) deptRecord[id] = { name: d.name };
    const userRecord: Record<string, { full_name: string }> = {};
    for (const [id, u] of userMap) userRecord[id] = { full_name: u.full_name };

    return (
      <Page
        title="All Reports"
        subtitle={`Showing ${sorted.length} reports across the organisation.`}
        reports={sorted}
        deptRecord={deptRecord}
        userRecord={userRecord}
        showReporterCol
        showDeptCol
        departments={allDepts}
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
    params.set("limit", "500");
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

  const userMap = new Map<string, { full_name: string }>();
  for (const { members } of myMemberships) {
    for (const m of members) {
      if (!userMap.has(m.user_id)) {
        userMap.set(m.user_id, { full_name: m.full_name });
      }
    }
  }
  const deptMap = new Map(allDepts.map((d) => [d.id, d]));

  const deptRecord: Record<string, { name: string }> = {};
  for (const [id, d] of deptMap) deptRecord[id] = { name: d.name };
  const userRecord: Record<string, { full_name: string }> = {};
  for (const [id, u] of userMap) userRecord[id] = { full_name: u.full_name };

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
      deptRecord={deptRecord}
      userRecord={userRecord}
      showReporterCol={!isViewer}
      showDeptCol={myDeptIds.length > 1}
      departments={allDepts.filter((d) => myDeptIds.includes(d.id))}
    />
  );
}

// ── Shared page wrapper ──

function Page({
  title,
  subtitle,
  reports,
  deptRecord,
  userRecord,
  showReporterCol,
  showDeptCol,
  departments,
}: {
  title: string;
  subtitle?: string;
  reports: Report[];
  deptRecord: Record<string, { name: string }>;
  userRecord: Record<string, { full_name: string }>;
  showReporterCol: boolean;
  showDeptCol: boolean;
  departments: Department[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/reports-export?status=approved"
            className="px-3 py-1.5 border border-neutral-700 hover:bg-neutral-800 rounded text-sm"
          >
            Export CSV
          </a>
          <Link
            href="/reports/print-batch?status=approved"
            className="px-3 py-1.5 border border-neutral-700 hover:bg-neutral-800 rounded text-sm"
          >
            Print range
          </Link>
          <Link href="/reports/new" className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium">
            New report
          </Link>
        </div>
      </div>
      {subtitle && <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>}

      <div className="mt-6">
        <ReportsTable
          reports={reports}
          deptRecord={deptRecord}
          userRecord={userRecord}
          departments={departments}
          showReporterCol={showReporterCol}
          showDeptCol={showDeptCol}
        />
      </div>
    </div>
  );
}
