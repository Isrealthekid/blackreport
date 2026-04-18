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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    department_id?: string;
    reporter_id?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  // Determine user's role: admin sees all, dept head/manager sees their department, others see own.
  const isAdmin = user.is_admin;

  // Fetch departments + check which ones the user manages.
  let managedDeptIds: string[] = [];
  let allDepts: Department[] = [];
  let allUsers: User[] = [];

  if (isAdmin) {
    const [depts, users] = await Promise.all([
      apiMaybe<Department[]>("/departments"),
      apiMaybe<User[]>("/users"),
    ]);
    allDepts = depts ?? [];
    allUsers = users ?? [];
  } else {
    const depts = (await apiMaybe<Department[]>("/departments")) ?? [];
    allDepts = depts;
    // Check which depts the user is a manager/dept_head in.
    const checks = await Promise.all(
      depts
        .filter((d) => !d.is_archived)
        .map(async (d) => {
          const members = await apiMaybe<DepartmentMember[]>(
            `/departments/${d.id}/members`,
          );
          const myMembership = members?.find((m) => m.user_id === user.id);
          if (
            myMembership &&
            ["manager", "department_head", "admin"].includes(myMembership.role)
          ) {
            return d.id;
          }
          return null;
        }),
    );
    managedDeptIds = checks.filter((x): x is string => x !== null);
  }

  const canSeeAll = isAdmin;
  const canSeeDept = managedDeptIds.length > 0;

  // Build query string for the API.
  const params = new URLSearchParams();
  if (sp.status) params.set("status", sp.status);
  if (sp.department_id) params.set("department_id", sp.department_id);
  if (sp.reporter_id) params.set("reporter_id", sp.reporter_id);
  params.set("limit", "200");

  let reports: Report[] = [];
  if (canSeeAll) {
    // Admin: use org-wide endpoint
    const raw = await apiMaybe<unknown>(`/reports?${params}`);
    reports = extractItems<Report>(raw);
  } else if (canSeeDept) {
    // Manager/Dept head: fetch reports for each managed department
    const results = await Promise.all(
      managedDeptIds.map(async (deptId) => {
        const deptParams = new URLSearchParams(params);
        if (!sp.department_id) deptParams.set("department_id", deptId);
        const raw = await apiMaybe<unknown>(`/reports?${deptParams}`);
        return extractItems<Report>(raw);
      }),
    );
    reports = results.flat();
    // Also include own reports
    const mineRaw = await apiMaybe<unknown>("/reports/mine");
    const mine = extractItems<Report>(mineRaw);
    const reportIds = new Set(reports.map((r) => r.id));
    for (const r of mine) {
      if (!reportIds.has(r.id)) reports.push(r);
    }
  } else {
    // Regular reporter: own reports only
    const raw = await apiMaybe<unknown>("/reports/mine");
    reports = extractItems<Report>(raw);
  }

  // De-duplicate and sort
  const deduped = [...new Map(reports.map((r) => [r.id, r])).values()];
  const sorted = deduped.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Build lookup maps
  const deptMap = new Map(allDepts.map((d) => [d.id, d]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {canSeeAll ? "All Reports" : canSeeDept ? "Department Reports" : "My Reports"}
        </h1>
        <Link
          href="/reports/new"
          className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium"
        >
          New report
        </Link>
      </div>
      {canSeeAll && (
        <p className="text-xs text-neutral-500 mt-1">
          Showing all {sorted.length} reports across the organisation.
        </p>
      )}
      {canSeeDept && !canSeeAll && (
        <p className="text-xs text-neutral-500 mt-1">
          Reports from departments you manage + your own.
        </p>
      )}

      {/* ── Filters ── */}
      <form method="GET" className="mt-4 flex gap-2 flex-wrap">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {[
            "draft",
            "pending",
            "approved",
            "rejected",
            "revision_requested",
            "escalated",
            "recalled",
          ].map((s) => (
            <option key={s} value={s}>
              {statusLabels[s] ?? s.replace("_", " ")}
            </option>
          ))}
        </select>
        {(canSeeAll || canSeeDept) && (
          <select
            name="department_id"
            defaultValue={sp.department_id ?? ""}
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {allDepts
              .filter((d) => canSeeAll || managedDeptIds.includes(d.id))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        )}
        <button className="text-xs px-3 py-2 border border-neutral-700 rounded">
          Filter
        </button>
      </form>

      {/* ── Table ── */}
      <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">ID</th>
              {(canSeeAll || canSeeDept) && (
                <th className="text-left px-4 py-2">Reporter</th>
              )}
              {(canSeeAll || canSeeDept) && (
                <th className="text-left px-4 py-2">Department</th>
              )}
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Submitted</th>
              <th className="text-left px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={(canSeeAll || canSeeDept) ? 6 : 4}
                  className="text-center py-10 text-neutral-500"
                >
                  No reports found.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const reporter =
                userMap.get(r.reporter_id)?.full_name ??
                (r.data?.name ? String(r.data.name) : r.reporter_id.slice(0, 8));
              const dept = deptMap.get(r.department_id)?.name ?? "—";
              return (
                <tr
                  key={r.id}
                  className="border-t border-neutral-800 hover:bg-neutral-900"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/reports/${r.id}`}
                      className="hover:underline font-mono text-xs"
                    >
                      {r.id.slice(0, 8)}
                    </Link>
                  </td>
                  {(canSeeAll || canSeeDept) && (
                    <td className="px-4 py-2 text-neutral-300">{reporter}</td>
                  )}
                  {(canSeeAll || canSeeDept) && (
                    <td className="px-4 py-2 text-neutral-400">{dept}</td>
                  )}
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${statusColors[r.status] ?? "bg-neutral-800"}`}
                    >
                      {statusLabels[r.status] ?? r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">
                    {r.submitted_at
                      ? new Date(r.submitted_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-neutral-400">
                    {new Date(r.created_at).toLocaleDateString()}
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
