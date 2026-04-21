import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import { getUserCamps } from "@/lib/scope";
import type {
  Camp,
  Client,
  Department,
  DepartmentMember,
  Mission,
  Notification,
  Report,
  ReportTemplate,
  User,
} from "@/lib/types";

export default async function DashboardPage() {
  const user = await requireUser();

  // ── Common fetches ──
  const [mineRaw, queueRaw, notifsRaw, myCamps] = await Promise.all([
    apiMaybe<unknown>("/reports/mine"),
    apiMaybe<unknown>("/approvals/queue"),
    apiMaybe<unknown>("/notifications"),
    getUserCamps(user),
  ]);
  const mineList = extractItems<Report>(mineRaw);
  const queueList = extractItems<Report>(queueRaw);
  const notifs = extractItems<Notification>(notifsRaw);
  const unread = notifs.filter((n) => !n.read).length;

  // ── Detect roles ──
  const isCamper = myCamps.length > 0;
  const isSupervisor =
    user.is_admin ||
    myCamps.some((c) =>
      c.members?.some((m) => m.user_id === user.id && m.role === "supervisor"),
    );

  // Check if user is manager/dept_head in any department
  let managedDeptIds: string[] = [];
  let managedDepts: Department[] = [];
  if (!user.is_admin) {
    const depts = extractItems<Department>(await apiMaybe<unknown>("/departments"));
    const checks = await Promise.all(
      depts.filter((d) => !d.is_archived).map(async (d) => {
        const members = extractItems<DepartmentMember>(
          await apiMaybe<unknown>(`/departments/${d.id}/members`),
        );
        const mine = members.find((m) => m.user_id === user.id);
        if (mine && ["manager", "department_head"].includes(mine.role)) return d;
        return null;
      }),
    );
    managedDepts = checks.filter((x): x is Department => x !== null);
    managedDeptIds = managedDepts.map((d) => d.id);
  }
  const isManager = managedDeptIds.length > 0;

  // ════════════════════════════════════════
  // ADMIN DASHBOARD
  // ════════════════════════════════════════
  if (user.is_admin) {
    const [allReportsRaw, usersRaw, deptsRaw, templatesRaw, campsRaw, missionsRaw, clientsRaw] =
      await Promise.all([
        apiMaybe<unknown>("/reports?limit=200"),
        apiMaybe<unknown>("/users"),
        apiMaybe<unknown>("/departments"),
        apiMaybe<unknown>("/templates"),
        apiMaybe<unknown>("/camps"),
        apiMaybe<unknown>("/missions"),
        apiMaybe<unknown>("/clients"),
      ]);

    const allReports = extractItems<Report>(allReportsRaw);
    const allUsers = extractItems<User>(usersRaw);
    const allDepts = extractItems<Department>(deptsRaw);
    const allTemplates = extractItems<ReportTemplate>(templatesRaw);
    const allCamps = extractItems<Camp>(campsRaw);
    const allMissions = extractItems<Mission>(missionsRaw);
    const allClients = extractItems<Client>(clientsRaw);

    const pendingReports = allReports.filter((r) => r.status === "pending");
    const approvedReports = allReports.filter((r) => r.status === "approved");
    const rejectedReports = allReports.filter((r) => r.status === "rejected");
    const pendingMissions = allMissions.filter((m) => m.status === "submitted");

    return (
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-neutral-400 mt-1">{user.full_name} · {user.email}</p>

        {/* ── Org overview ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          <Card label="Total Reports" value={allReports.length} href="/reports" />
          <Card label="Pending Approval" value={pendingReports.length} href="/approvals" tone={pendingReports.length ? "text-yellow-400" : ""} />
          <Card label="Approved" value={approvedReports.length} tone="text-green-400" />
          <Card label="Rejected" value={rejectedReports.length} tone={rejectedReports.length ? "text-red-400" : ""} />
          <Card label="Users" value={allUsers.length} href="/users" />
          <Card label="Departments" value={allDepts.length} href="/departments" />
          <Card label="Templates" value={allTemplates.length} href="/templates" />
          <Card label="Unread" value={unread} href="/notifications" tone={unread ? "text-red-400" : ""} />
        </div>

        {/* ── Drone ops summary ── */}
        <h2 className="text-lg font-semibold mt-10">Drone Operations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          <Card label="Clients" value={allClients.length} href="/clients" />
          <Card label="Camps" value={allCamps.length} href="/camps" />
          <Card label="Missions" value={allMissions.length} href="/missions" />
          <Card label="Missions Pending" value={pendingMissions.length} tone={pendingMissions.length ? "text-yellow-400" : ""} href="/missions" />
        </div>

        {/* ── Approval queue ── */}
        {queueList.length > 0 && (
          <div className="mt-8 border border-yellow-800 bg-yellow-950/20 rounded-lg p-4">
            <div className="font-semibold text-yellow-200">Reports awaiting your approval ({queueList.length})</div>
            <Link href="/approvals" className="mt-2 inline-block text-sm text-yellow-300 hover:underline">Open queue →</Link>
          </div>
        )}

        {/* ── Per-department breakdown ── */}
        {allDepts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Department Breakdown</h2>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {allDepts.filter((d) => !d.is_archived).map((d) => {
                const dr = allReports.filter((r) => r.department_id === d.id);
                const dPending = dr.filter((r) => r.status === "pending").length;
                const dApproved = dr.filter((r) => r.status === "approved").length;
                return (
                  <Link key={d.id} href={`/departments/${d.id}`} className="border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 transition">
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {dr.length} reports · {dPending} pending · {dApproved} approved
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-10 flex gap-3 flex-wrap">
          <Link href="/reports/new" className="px-4 py-2 bg-white text-black rounded font-medium">Submit a report</Link>
          <Link href="/templates/new" className="px-4 py-2 border border-neutral-700 rounded">Create template</Link>
          <Link href="/departments" className="px-4 py-2 border border-neutral-700 rounded">Manage departments</Link>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // MANAGER / DEPT HEAD DASHBOARD
  // ════════════════════════════════════════
  if (isManager && !isCamper) {
    // Fetch reports for managed departments
    const deptReportsResults = await Promise.all(
      managedDeptIds.map(async (deptId) => {
        const raw = await apiMaybe<unknown>(`/reports?department_id=${deptId}&limit=200`);
        return extractItems<Report>(raw);
      }),
    );
    const deptReports = deptReportsResults.flat();
    const uniqueReports = [...new Map(deptReports.map((r) => [r.id, r])).values()];

    const pending = uniqueReports.filter((r) => r.status === "pending");
    const approved = uniqueReports.filter((r) => r.status === "approved");
    const rejected = uniqueReports.filter((r) => r.status === "rejected");
    const revisionReq = uniqueReports.filter((r) => r.status === "revision_requested");

    // Unique reporters in these departments
    const reporterIds = new Set(uniqueReports.map((r) => r.reporter_id));

    const drafts = mineList.filter(
      (r) => r.status === "draft" || r.status === "revision_requested",
    );

    return (
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user.full_name}</h1>
        <p className="text-neutral-400 mt-1">
          {user.position ? `${user.position} · ` : ""}
          Managing: {managedDepts.map((d) => d.name).join(", ")}
        </p>

        {/* ── Team summary ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          <Card label="Team Reports" value={uniqueReports.length} href="/reports" />
          <Card label="Pending Approval" value={pending.length} href="/approvals" tone={pending.length ? "text-yellow-400" : ""} />
          <Card label="Approved" value={approved.length} tone="text-green-400" />
          <Card label="Rejected" value={rejected.length} tone={rejected.length ? "text-red-400" : ""} />
          <Card label="Needs Revision" value={revisionReq.length} tone={revisionReq.length ? "text-orange-400" : ""} />
          <Card label="Team Members" value={reporterIds.size} />
          <Card label="My Review Queue" value={queueList.length} href="/approvals" tone={queueList.length ? "text-blue-400" : ""} />
          <Card label="Unread" value={unread} href="/notifications" tone={unread ? "text-red-400" : ""} />
        </div>

        {/* ── Approval queue ── */}
        {queueList.length > 0 && (
          <div className="mt-8 border border-yellow-800 bg-yellow-950/20 rounded-lg p-4">
            <div className="font-semibold text-yellow-200">Pending your review ({queueList.length})</div>
            <ul className="mt-2 text-sm space-y-1">
              {queueList.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link href={`/reports/${r.id}`} className="hover:underline font-mono text-xs">{r.id.slice(0, 8)}</Link>
                  <span className="text-neutral-500"> · {r.data?.name ? String(r.data.name) : r.reporter_id.slice(0, 8)}</span>
                </li>
              ))}
              {queueList.length > 5 && (
                <li><Link href="/approvals" className="text-neutral-400 hover:underline">+{queueList.length - 5} more →</Link></li>
              )}
            </ul>
          </div>
        )}

        {/* ── My own reports ── */}
        <div className="mt-8">
          <h2 className="font-semibold">My Reports</h2>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <Card label="Submitted" value={mineList.length} href="/reports" />
            <Card label="Drafts" value={drafts.length} tone={drafts.length ? "text-orange-400" : ""} />
            <Card label="Approved" value={mineList.filter((r) => r.status === "approved").length} tone="text-green-400" />
          </div>
        </div>

        <div className="mt-10 flex gap-3 flex-wrap">
          <Link href="/reports/new" className="px-4 py-2 bg-white text-black rounded font-medium">Submit a report</Link>
          <Link href="/approvals" className="px-4 py-2 border border-neutral-700 rounded">Approval queue</Link>
          <Link href="/reports" className="px-4 py-2 border border-neutral-700 rounded">All team reports</Link>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // CAMPER / SUPERVISOR DASHBOARD
  // ════════════════════════════════════════
  if (isCamper) {
    let allCampMissions: Mission[] = [];
    const results = await Promise.all(
      myCamps.map((c) => apiMaybe<Mission[]>(`/missions?camp_id=${c.id}`)),
    );
    allCampMissions = results.flatMap((r) => r ?? []);

    const myMissions = user.is_admin
      ? allCampMissions
      : isSupervisor
        ? allCampMissions
        : allCampMissions.filter((m) => m.reporter_id === user.id);

    const draftMissions = myMissions.filter((m) => m.status === "draft");
    const approvedMissions = myMissions.filter((m) => m.status === "approved");
    const rejectedMissions = myMissions.filter((m) => m.status === "rejected");
    const submittedMissions = allCampMissions.filter((m) => m.status === "submitted");

    return (
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user.full_name}</h1>
        <p className="text-neutral-400 mt-1">
          {user.position ? `${user.position} · ` : ""}
          {isSupervisor ? "Supervisor" : "Camper"} · {myCamps.map((c) => c.site_name).join(", ")}
        </p>

        {/* ── Quick actions ── */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/missions?new=1" className="border-2 border-dashed border-indigo-700 bg-indigo-950/20 hover:bg-indigo-950/40 rounded-lg p-6 text-center transition">
            <div className="text-3xl">+</div>
            <div className="font-semibold text-indigo-200 mt-2">Create New Mission</div>
            <p className="text-xs text-indigo-300/60 mt-1">Start a drone mission and fill SAC forms</p>
          </Link>
          <Link href="/missions" className="border border-neutral-800 hover:border-neutral-600 rounded-lg p-6 text-center transition">
            <div className="text-3xl font-bold">{myMissions.length}</div>
            <div className="font-semibold text-neutral-200 mt-2">My Missions</div>
            <p className="text-xs text-neutral-500 mt-1">View all missions across your camps</p>
          </Link>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <Card label="Draft" value={draftMissions.length} tone={draftMissions.length ? "text-orange-400" : ""} />
          <Card label="Pending" value={submittedMissions.length} tone={submittedMissions.length ? "text-yellow-400" : ""} />
          <Card label="Approved" value={approvedMissions.length} tone="text-green-400" />
          <Card label="Rejected" value={rejectedMissions.length} tone={rejectedMissions.length ? "text-red-400" : ""} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
          <Card label="Camps" value={myCamps.length} href="/camps" />
          <Card label="Unread" value={unread} href="/notifications" tone={unread ? "text-red-400" : ""} />
          {isSupervisor && <Card label="Awaiting Review" value={submittedMissions.length} tone={submittedMissions.length ? "text-yellow-400" : ""} />}
        </div>

        {/* ── Pending Approval (supervisor) ── */}
        {isSupervisor && submittedMissions.length > 0 && (
          <div className="mt-6 border border-yellow-800 bg-yellow-950/20 rounded-lg p-4">
            <div className="font-semibold text-yellow-200">Pending Your Approval ({submittedMissions.length})</div>
            <div className="mt-3 space-y-2">
              {submittedMissions.map((m) => {
                const camp = myCamps.find((c) => c.id === m.camp_id);
                return (
                  <Link key={m.id} href={`/missions/${m.id}`} className="block border border-neutral-800 hover:border-yellow-700 rounded p-3 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium">{m.mission_number}</span>
                        <span className="text-neutral-500 text-sm ml-2">{camp?.site_name} · {m.mission_date}</span>
                      </div>
                      <span className="text-xs text-yellow-300 px-2 py-1 bg-yellow-900/40 rounded">Review →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Draft missions ── */}
        {draftMissions.length > 0 && (
          <div className="mt-6 border border-orange-900 bg-orange-950/20 rounded-lg p-4">
            <div className="font-semibold text-orange-200">Incomplete Missions</div>
            <div className="mt-3 space-y-2">
              {draftMissions.map((m) => {
                const camp = myCamps.find((c) => c.id === m.camp_id);
                return (
                  <Link key={m.id} href={`/missions/${m.id}`} className="block border border-neutral-800 hover:border-neutral-600 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium">{m.mission_number}</span>
                        <span className="text-neutral-500 text-sm ml-2">{camp?.site_name} · {m.mission_date}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className={m.has_sac16 ? "text-green-400" : "text-red-400"}>16{m.has_sac16 ? "✓" : "✗"}</span>
                        <span className={m.has_sac17 ? "text-green-400" : "text-red-400"}>17{m.has_sac17 ? "✓" : "✗"}</span>
                        <span className={m.has_sac18 ? "text-green-400" : "text-red-400"}>18{m.has_sac18 ? "✓" : "✗"}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── My camps ── */}
        <div className="mt-8">
          <h2 className="font-semibold">My Camps</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {myCamps.map((c) => (
              <Link key={c.id} href={`/camps/${c.id}`} className="border border-neutral-800 hover:border-neutral-600 rounded-lg p-4">
                <div className="font-medium">{c.site_name}</div>
                <div className="text-xs text-neutral-500 mt-1">{c.site_code}{c.state ? ` · ${c.state}` : ""}</div>
              </Link>
            ))}
          </div>
        </div>

        {unread > 0 && (
          <div className="mt-6">
            <Link href="/notifications" className="text-sm text-neutral-400 hover:underline">{unread} unread notification{unread !== 1 ? "s" : ""} →</Link>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // REPORTER DASHBOARD
  // ════════════════════════════════════════
  const drafts = mineList.filter(
    (r) => r.status === "draft" || r.status === "revision_requested",
  );
  const myPending = mineList.filter((r) => r.status === "pending");
  const myApproved = mineList.filter((r) => r.status === "approved");
  const myRejected = mineList.filter((r) => r.status === "rejected");

  const today = new Date().toISOString().slice(0, 10);
  const submittedToday = mineList.some(
    (r) =>
      r.status !== "draft" &&
      r.status !== "recalled" &&
      (r.submitted_at ?? r.created_at).slice(0, 10) === today,
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Welcome, {user.full_name}</h1>
      <p className="text-neutral-400 mt-1">
        {user.position ? `${user.position} · ` : ""}
        {user.email}
      </p>

      {!submittedToday && (
        <div className="mt-6 border border-blue-800 bg-blue-950/30 rounded-lg p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-blue-200 text-lg">Report due today</div>
            <p className="text-sm text-blue-300/80 mt-1">Submit your daily report.</p>
          </div>
          <Link href="/reports/new" className="shrink-0 px-5 py-2.5 bg-white text-black font-semibold rounded hover:bg-neutral-200">Start Report</Link>
        </div>
      )}

      {submittedToday && (
        <div className="mt-6 border border-green-800 bg-green-950/30 rounded-lg p-4 text-sm text-green-200">
          ✓ You&apos;ve submitted a report today.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        <Card label="Total Reports" value={mineList.length} href="/reports" />
        <Card label="Pending" value={myPending.length} tone={myPending.length ? "text-yellow-400" : ""} />
        <Card label="Approved" value={myApproved.length} tone="text-green-400" />
        <Card label="Rejected" value={myRejected.length} tone={myRejected.length ? "text-red-400" : ""} />
        <Card label="Drafts / Revise" value={drafts.length} href="/reports" tone={drafts.length ? "text-orange-400" : ""} />
        <Card label="Unread" value={unread} href="/notifications" tone={unread ? "text-red-400" : ""} />
      </div>

      {drafts.length > 0 && (
        <div className="mt-8 border border-neutral-800 rounded-lg p-4">
          <div className="font-semibold">Resume a draft</div>
          <ul className="mt-2 text-sm space-y-1">
            {drafts.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}/edit`} className="hover:underline font-mono text-xs">{r.id.slice(0, 8)}</Link>
                <span className="text-neutral-500"> — {r.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {myPending.length > 0 && (
        <div className="mt-6 border border-neutral-800 rounded-lg p-4">
          <div className="font-semibold">Awaiting approval</div>
          <ul className="mt-2 text-sm space-y-1">
            {myPending.map((r) => (
              <li key={r.id}>
                <Link href={`/reports/${r.id}`} className="hover:underline font-mono text-xs">{r.id.slice(0, 8)}</Link>
                <span className="text-neutral-500"> · submitted {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 flex gap-3 flex-wrap">
        <Link href="/reports/new" className="px-4 py-2 bg-white text-black rounded font-medium">Submit a report</Link>
      </div>
    </div>
  );
}

function Card({ label, value, href, tone }: { label: string; value: number | string; href?: string; tone?: string }) {
  const inner = (
    <div className="border border-neutral-800 rounded-lg p-5 bg-neutral-950 hover:border-neutral-600 transition">
      <div className="text-neutral-400 text-sm">{label}</div>
      <div className={`text-4xl font-bold mt-2 ${tone ?? ""}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}
