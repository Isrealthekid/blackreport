import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { getUserCamps } from "@/lib/scope";
import type { Camp, Mission, Notification, Report } from "@/lib/types";

export default async function DashboardPage() {
  const user = await requireUser();

  const [mine, queue, notifs, myCamps] = await Promise.all([
    apiMaybe<Report[]>("/reports/mine"),
    apiMaybe<Report[]>("/approvals/queue"),
    apiMaybe<Notification[]>("/notifications"),
    getUserCamps(user),
  ]);

  const mineList = mine ?? [];
  const queueList = queue ?? [];
  const unread = (notifs ?? []).filter((n) => !n.read).length;
  const isCamper = myCamps.length > 0;

  // Fetch missions for camper's camps
  let allCampMissions: Mission[] = [];
  if (isCamper) {
    const results = await Promise.all(
      myCamps.map((c) => apiMaybe<Mission[]>(`/missions?camp_id=${c.id}`)),
    );
    allCampMissions = results.flatMap((r) => r ?? []);
  }

  const isSupervisor =
    user.is_admin ||
    myCamps.some((c) => c.members?.some((m) => m.user_id === user.id && m.role === "supervisor"));

  // Campers see only their own missions; supervisors/admins see all.
  const myMissions = isSupervisor
    ? allCampMissions
    : allCampMissions.filter((m) => m.created_by === user.id);

  const draftMissions = myMissions.filter((m) => m.status === "draft");
  const approvedMissions = myMissions.filter((m) => m.status === "approved");

  // Supervisors see ALL submitted missions (including others') for review.
  const submittedMissions = allCampMissions.filter((m) => m.status === "submitted");

  // ── Camper Dashboard ──
  if (isCamper) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user.full_name}</h1>
        <p className="text-neutral-400 mt-1">
          {user.position ? `${user.position} · ` : ""}
          {user.email}
        </p>

        {/* ── Quick actions ── */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/missions?new=1"
            className="border-2 border-dashed border-indigo-700 bg-indigo-950/20 hover:bg-indigo-950/40 rounded-lg p-6 text-center transition"
          >
            <div className="text-3xl">+</div>
            <div className="font-semibold text-indigo-200 mt-2">Create New Mission</div>
            <p className="text-xs text-indigo-300/60 mt-1">Start a drone mission and fill SAC forms</p>
          </Link>

          <Link
            href="/missions"
            className="border border-neutral-800 hover:border-neutral-600 rounded-lg p-6 text-center transition"
          >
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
          <Card label="Camps" value={myCamps.length} href="/camps" />
        </div>

        {/* ── Pending Approval (supervisor / admin) ── */}
        {isSupervisor && submittedMissions.length > 0 && (
          <div className="mt-6 border border-yellow-800 bg-yellow-950/20 rounded-lg p-4">
            <div className="font-semibold text-yellow-200">
              Pending Your Approval ({submittedMissions.length})
            </div>
            <p className="text-xs text-yellow-300/60 mt-1">
              These missions need your review.
            </p>
            <div className="mt-3 space-y-2">
              {submittedMissions.map((m) => {
                const camp = myCamps.find((c) => c.id === m.camp_id);
                return (
                  <Link
                    key={m.id}
                    href={`/missions/${m.id}`}
                    className="block border border-neutral-800 hover:border-yellow-700 rounded p-3 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium">{m.mission_number}</span>
                        <span className="text-neutral-500 text-sm ml-2">
                          {camp?.site_name} · {m.mission_date}
                        </span>
                      </div>
                      <span className="text-xs text-yellow-300 px-2 py-1 bg-yellow-900/40 rounded">
                        Review →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Draft missions needing SAC forms ── */}
        {draftMissions.length > 0 && (
          <div className="mt-8 border border-orange-900 bg-orange-950/20 rounded-lg p-4">
            <div className="font-semibold text-orange-200">Pending SAC Forms</div>
            <p className="text-xs text-orange-300/60 mt-1">
              These missions have incomplete forms. Fill them to submit.
            </p>
            <div className="mt-3 space-y-2">
              {draftMissions.map((m) => {
                const camp = myCamps.find((c) => c.id === m.camp_id);
                return (
                  <Link
                    key={m.id}
                    href={`/missions/${m.id}`}
                    className="block border border-neutral-800 hover:border-neutral-600 rounded p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium">{m.mission_number}</span>
                        <span className="text-neutral-500 text-sm ml-2">{camp?.site_name} · {m.mission_date}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className={m.has_sac16 ? "text-green-400" : "text-red-400"}>
                          SAC16 {m.has_sac16 ? "✓" : "✗"}
                        </span>
                        <span className={m.has_sac17 ? "text-green-400" : "text-red-400"}>
                          SAC17 {m.has_sac17 ? "✓" : "✗"}
                        </span>
                        <span className={m.has_sac18 ? "text-green-400" : "text-red-400"}>
                          SAC18 {m.has_sac18 ? "✓" : "✗"}
                        </span>
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
              <Link
                key={c.id}
                href={`/camps/${c.id}`}
                className="border border-neutral-800 hover:border-neutral-600 rounded-lg p-4"
              >
                <div className="font-medium">{c.site_name}</div>
                <div className="text-xs text-neutral-500 mt-1">
                  {c.site_code}{c.state ? ` · ${c.state}` : ""}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Notifications ── */}
        {unread > 0 && (
          <div className="mt-6">
            <Link href="/notifications" className="text-sm text-neutral-400 hover:underline">
              {unread} unread notification{unread !== 1 ? "s" : ""} →
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Standard (non-camper) Dashboard ──
  const drafts = mineList.filter(
    (r) => r.status === "draft" || r.status === "revision_requested",
  );
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
        {user.is_admin ? "Admin · " : ""}
        {user.position ? `${user.position} · ` : ""}
        {user.email}
      </p>

      {!submittedToday && (
        <div className="mt-6 border border-blue-800 bg-blue-950/30 rounded-lg p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-blue-200 text-lg">Report due today</div>
            <p className="text-sm text-blue-300/80 mt-1">Submit your daily report.</p>
          </div>
          <Link href="/reports/new" className="shrink-0 px-5 py-2.5 bg-white text-black font-semibold rounded hover:bg-neutral-200">
            Start Report
          </Link>
        </div>
      )}

      {submittedToday && (
        <div className="mt-6 border border-green-800 bg-green-950/30 rounded-lg p-4 text-sm text-green-200">
          ✓ You&apos;ve submitted a report today.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <Card label="My Reports" value={mineList.length} href="/reports" />
        <Card label="Drafts / Revise" value={drafts.length} href="/reports" tone={drafts.length ? "text-orange-400" : ""} />
        <Card label="Pending My Review" value={queueList.length} href="/approvals" tone={queueList.length ? "text-blue-400" : ""} />
        <Card label="Approved" value={mineList.filter((r) => r.status === "approved").length} />
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

      <div className="mt-10 flex gap-3 flex-wrap">
        <Link href="/reports/new" className="px-4 py-2 bg-white text-black rounded font-medium">Submit a report</Link>
        {user.is_admin && <Link href="/templates/new" className="px-4 py-2 border border-neutral-700 rounded">Create template</Link>}
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
