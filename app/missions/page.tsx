import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { getUserCamps } from "@/lib/scope";
import { createMissionAction } from "@/app/actions";
import type { Camp, Mission } from "@/lib/types";

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
  const allMissions = (await apiMaybe<Mission[]>(`/missions${qs}`)) ?? [];
  const campMap = new Map(myCamps.map((c) => [c.id, c]));

  // Determine user's camp role.
  const isAdmin = user.is_admin;
  const myCampIds = new Set(myCamps.map((c) => c.id));
  const isSupervisor =
    isAdmin ||
    myCamps.some((c) =>
      c.members?.some((m) => m.user_id === user.id && m.role === "supervisor"),
    );
  const isCamperOnly = !isAdmin && !isSupervisor;

  // Scope missions by role:
  // Admin → all missions (already fetched).
  // Supervisor → all missions in their camps.
  // Camper → only missions they created.
  let missions: Mission[];
  if (isAdmin) {
    missions = allMissions;
  } else if (isSupervisor) {
    // Supervisor sees all missions in camps they belong to.
    missions = allMissions.filter((m) => myCampIds.has(m.camp_id));
  } else {
    // Camper: only their own. Check created_by first, fall back to filtering
    // out missions that DON'T match (strict — if field is missing, hide it).
    missions = allMissions.filter((m) => m.created_by === user.id);
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

      {/* ── Mission list ── */}
      <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">Mission #</th>
              <th className="text-left px-4 py-2">Camp</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">SAC Forms</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-neutral-500">
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
                  <td className="px-4 py-2 text-neutral-400">{m.mission_date}</td>
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
                      {m.status === "draft" && m.created_by === user.id && (
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
    </div>
  );
}
