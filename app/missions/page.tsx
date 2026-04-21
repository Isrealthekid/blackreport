import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { getUserCamps } from "@/lib/scope";
import { createMissionAction } from "@/app/actions";
import type { Camp, Mission, User } from "@/lib/types";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  submitted: "bg-yellow-900 text-yellow-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
};

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ camp_id?: string; new?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const myCamps = await getUserCamps(user);
  const qs = sp.camp_id ? `?camp_id=${sp.camp_id}` : "";
  const [allMissions, allUsers] = await Promise.all([
    apiMaybe<Mission[]>(`/missions${qs}`).then((m) => m ?? []),
    apiMaybe<User[]>("/users").then((u) => u ?? []),
  ]);

  // Fetch camp detail for every camp referenced by a mission — the list
  // endpoint may return camps without their `members` array, but we need
  // member names to resolve each mission's reporter.
  const referencedCampIds = Array.from(
    new Set(allMissions.map((m) => m.camp_id).filter(Boolean)),
  );
  const campDetails = await Promise.all(
    referencedCampIds.map((cid) => apiMaybe<Camp>(`/camps/${cid}`)),
  );

  const campMap = new Map<string, Camp>();
  for (const c of myCamps) campMap.set(c.id, c);
  for (const c of campDetails) if (c) campMap.set(c.id, c);

  const userMap = new Map<string, string>();
  for (const u of allUsers) userMap.set(u.id, u.full_name);
  for (const c of campMap.values())
    for (const m of c.members ?? []) if (!userMap.has(m.user_id)) userMap.set(m.user_id, m.full_name);
  if (!userMap.has(user.id)) userMap.set(user.id, user.full_name);

  // For any reporter_id we still can't resolve, fetch the user by id.
  const unresolvedReporterIds = Array.from(
    new Set(
      allMissions
        .map((m) => m.reporter_id)
        .filter((id): id is string => !!id && !userMap.has(id)),
    ),
  );
  if (unresolvedReporterIds.length > 0) {
    const fetched = await Promise.all(
      unresolvedReporterIds.map((id) => apiMaybe<User>(`/users/${id}`)),
    );
    for (const u of fetched) if (u) userMap.set(u.id, u.full_name);
  }

  const userNameFor = (m: Mission): string => {
    if (!m.reporter_id) return "—";
    return userMap.get(m.reporter_id) ?? m.reporter_id.slice(0, 8);
  };

  // Determine user's camp role.
  const isAdmin = user.is_admin;
  const myCampIds = new Set(myCamps.map((c) => c.id));
  const isSupervisor =
    isAdmin ||
    myCamps.some((c) =>
      c.members?.some((m) => m.user_id === user.id && m.role === "supervisor"),
    );
  const isCamperOnly = !isAdmin && !isSupervisor;

  // Missions the current user reported themselves — shown in the "My Missions"
  // section with a Continue-filling action on drafts.
  const myMissions = [...allMissions]
    .filter((m) => m.reporter_id === user.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Scope missions shown in the main table by role.
  let missions: Mission[];
  if (isAdmin) {
    missions = allMissions;
  } else if (isSupervisor) {
    missions = allMissions.filter((m) => myCampIds.has(m.camp_id));
  } else {
    // Camper: same as My Missions, so the main table is hidden below.
    missions = myMissions;
  }

  const sorted = [...missions].sort((a, b) => b.created_at.localeCompare(a.created_at));

  // Pending approval queue (supervisors/admins see submitted missions from their camps).
  const pendingApproval = isAdmin
    ? allMissions.filter((m) => m.status === "submitted")
    : isSupervisor
      ? allMissions.filter((m) => m.status === "submitted" && myCampIds.has(m.camp_id))
      : [];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Missions</h1>
      </div>

      {/* ── Pending Approval queue (supervisor / admin) ── */}
      {isSupervisor && pendingApproval.length > 0 && (
        <div className="mt-6 border border-yellow-800 bg-yellow-950/20 rounded-lg p-5">
          <h2 className="font-semibold text-yellow-200">
            Pending Approval ({pendingApproval.length})
          </h2>
          <p className="text-xs text-yellow-300/60 mt-1">
            These missions have been submitted and are waiting for your review.
          </p>
          <div className="mt-3 space-y-2">
            {pendingApproval.map((m) => {
              const camp = campMap.get(m.camp_id);
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

      {/* ── Create new mission (always visible) ── */}
      <div className="mt-6 border border-indigo-800 bg-indigo-950/20 rounded-lg p-5">
        <h2 className="font-semibold text-indigo-200">Create New Mission</h2>
        <p className="text-xs text-indigo-300/60 mt-1">
          Select a camp, assign a unique mission number, and start filling SAC forms.
        </p>
        {myCamps.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">
            You&apos;re not assigned to any camp yet. Ask an admin to add you.
          </p>
        ) : (
          <form action={createMissionAction} className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-400">Camp</label>
              <select name="camp_id" required defaultValue={myCamps[0]?.id ?? ""} className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2">
                <option value="" disabled>Select camp…</option>
                {myCamps.map((c) => (
                  <option key={c.id} value={c.id}>{c.site_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400">Mission Number (unique)</label>
              <input
                name="mission_number"
                required
                placeholder="e.g. MIS-001"
                className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400">Mission Date</label>
              <input
                name="mission_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
              />
            </div>
            <button className="col-span-3 bg-white text-black font-semibold rounded px-4 py-2 hover:bg-neutral-200">
              Create Mission
            </button>
          </form>
        )}
      </div>

      {/* ── Filter ── */}
      {myCamps.length > 1 && (
        <form method="GET" className="mt-4 flex gap-2">
          <select name="camp_id" defaultValue={sp.camp_id ?? ""} className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
            <option value="">All camps</option>
            {myCamps.map((c) => (
              <option key={c.id} value={c.id}>{c.site_name}</option>
            ))}
          </select>
          <button className="text-xs px-3 py-2 border border-neutral-700 rounded">Filter</button>
        </form>
      )}

      {/* ── My Missions ── */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">My Missions</h2>
          <span className="text-xs text-neutral-500">{myMissions.length} total</span>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          Missions you created or filled. Drafts can be continued from here.
        </p>
        {myMissions.length === 0 ? (
          <div className="border border-neutral-800 rounded p-5 text-sm text-neutral-500">
            You haven&apos;t created any missions yet. Use the form above to start one.
          </div>
        ) : (
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-900 text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-2">Mission #</th>
                  <th className="text-left px-4 py-2">Camp</th>
                  <th className="text-left px-4 py-2">Created</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">SAC Forms</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myMissions.map((m) => {
                  const camp = campMap.get(m.camp_id);
                  const isDraft = m.status === "draft";
                  return (
                    <tr key={m.id} className="border-t border-neutral-800 hover:bg-neutral-900">
                      <td className="px-4 py-2">
                        <Link href={`/missions/${m.id}`} className="hover:underline font-mono font-medium">
                          {m.mission_number}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-neutral-400">{camp?.site_name ?? "—"}</td>
                      <td className="px-4 py-2 text-neutral-400">{fmtDateTime(m.created_at)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[m.status] ?? "bg-neutral-800"}`}>
                          {statusLabels[m.status] ?? m.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 text-xs">
                          <span className={m.has_sac16 ? "text-green-400" : "text-neutral-600"}>16{m.has_sac16 ? "✓" : ""}</span>
                          <span className={m.has_sac17 ? "text-green-400" : "text-neutral-600"}>17{m.has_sac17 ? "✓" : ""}</span>
                          <span className={m.has_sac18 ? "text-green-400" : "text-neutral-600"}>18{m.has_sac18 ? "✓" : ""}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          {isDraft ? (
                            <Link
                              href={`/missions/${m.id}`}
                              className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                            >
                              Continue filling →
                            </Link>
                          ) : (
                            <>
                              <Link
                                href={`/missions/${m.id}`}
                                className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                              >
                                View
                              </Link>
                              <Link
                                href={`/missions/${m.id}/print`}
                                target="_blank"
                                className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                              >
                                Print
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── All missions list (admins / supervisors only — campers already see their own above) ── */}
      {!isCamperOnly && (
      <>
      <h2 className="text-lg font-semibold mt-8 mb-2">All Missions</h2>

      {/* ── Mission list ── */}
      <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">Mission #</th>
              <th className="text-left px-4 py-2">Camp</th>
              <th className="text-left px-4 py-2">User</th>
              <th className="text-left px-4 py-2">Created</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">SAC Forms</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-neutral-500">
                  No missions yet. Create one above to get started.
                </td>
              </tr>
            )}
            {sorted.map((m) => {
              const camp = campMap.get(m.camp_id);
              return (
                <tr key={m.id} className="border-t border-neutral-800 hover:bg-neutral-900">
                  <td className="px-4 py-2">
                    <Link href={`/missions/${m.id}`} className="hover:underline font-mono font-medium">
                      {m.mission_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{camp?.site_name ?? "—"}</td>
                  <td className="px-4 py-2 text-neutral-400">{userNameFor(m)}</td>
                  <td className="px-4 py-2 text-neutral-400">{fmtDateTime(m.created_at)}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[m.status] ?? "bg-neutral-800"}`}>
                      {statusLabels[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 text-xs">
                      <span className={m.has_sac16 ? "text-green-400" : "text-neutral-600"}>
                        16{m.has_sac16 ? "✓" : ""}
                      </span>
                      <span className={m.has_sac17 ? "text-green-400" : "text-neutral-600"}>
                        17{m.has_sac17 ? "✓" : ""}
                      </span>
                      <span className={m.has_sac18 ? "text-green-400" : "text-neutral-600"}>
                        18{m.has_sac18 ? "✓" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/missions/${m.id}`}
                        className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/missions/${m.id}/print`}
                        target="_blank"
                        className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                      >
                        Print
                      </Link>
                      {m.status === "draft" && m.reporter_id === user.id && (
                        <Link
                          href={`/missions/${m.id}`}
                          className="text-xs px-2 py-1 border border-indigo-700 text-indigo-300 rounded hover:bg-indigo-950"
                        >
                          Fill forms
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
