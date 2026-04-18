import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { updateMissionAction, deleteMissionAction } from "@/app/actions";
import SubmitMission from "./SubmitMission";
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

export default async function MissionDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ approved?: string; rejected?: string; submitted?: string }>;
}) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const mission = await apiMaybe<Mission>(`/missions/${id}`);
  if (!mission) notFound();
  const camp = await apiMaybe<Camp>(`/camps/${mission.camp_id}`);

  const forms = [
    {
      key: "sac16",
      label: "SAC 16",
      title: "Drone Mission Report",
      desc: "Mission description and hourly flight logs",
      done: mission.has_sac16,
    },
    {
      key: "sac17",
      label: "SAC 17",
      title: "Mission Plan & Risk Assessment",
      desc: "Pilot info, coordinates, UAV details, pre-flight checklist",
      done: mission.has_sac17,
    },
    {
      key: "sac18",
      label: "SAC 18",
      title: "Site / Drone Operation Risk Assessment",
      desc: "Risk checklist, overflown areas, post-flight debrief",
      done: mission.has_sac18,
    },
  ];

  const allDone = forms.every((f) => f.done);

  // Check if current user is a supervisor for this camp or an admin.
  const isSupervisorOrAdmin =
    user.is_admin ||
    camp?.members?.some(
      (m) => m.user_id === user.id && m.role === "supervisor",
    );

  const canApprove = mission.status === "submitted" && isSupervisorOrAdmin;

  return (
    <div className="max-w-3xl">
      {sp.approved === "1" && (
        <div className="mb-6 border border-green-800 bg-green-950/30 rounded-lg p-4 text-sm text-green-200">
          ✓ Mission approved successfully.
        </div>
      )}
      {sp.rejected === "1" && (
        <div className="mb-6 border border-red-800 bg-red-950/30 rounded-lg p-4 text-sm text-red-200">
          Mission rejected.
        </div>
      )}
      {sp.submitted === "1" && (
        <div className="mb-6 border border-green-800 bg-green-950/30 rounded-lg p-4 text-sm text-green-200">
          ✓ Mission submitted successfully. It is now pending supervisor approval.
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-mono">{mission.mission_number}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {camp?.site_name ?? "—"} · {mission.mission_date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/missions/${id}/print`}
            target="_blank"
            className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
          >
            Download PDF
          </Link>
          <span
            className={`text-xs px-2 py-1 rounded ${statusColors[mission.status] ?? "bg-neutral-800"}`}
          >
            {statusLabels[mission.status] ?? mission.status}
          </span>
        </div>
      </div>

      {/* ── Pending approval banner ── */}
      {mission.status === "submitted" && !isSupervisorOrAdmin && (
        <div className="mt-6 border border-yellow-800 bg-yellow-950/30 rounded-lg p-4 text-sm text-yellow-200">
          This mission is pending approval from a camp supervisor or admin.
        </div>
      )}

      {/* ── Approve / Reject (supervisor or admin) ── */}
      {canApprove && (
        <div className="mt-6 border border-indigo-800 bg-indigo-950/20 rounded-lg p-5">
          <h2 className="font-semibold text-indigo-200">Review this mission</h2>
          <p className="text-xs text-indigo-300/60 mt-1">
            All three SAC forms have been submitted. Review and approve or reject.
          </p>
          <div className="mt-4 flex gap-3">
            <form action={updateMissionAction}>
              <input type="hidden" name="id" value={mission.id} />
              <input type="hidden" name="status" value="approved" />
              <button className="px-5 py-2 bg-green-700 hover:bg-green-600 rounded font-medium">
                Approve Mission
              </button>
            </form>
            <form action={updateMissionAction}>
              <input type="hidden" name="id" value={mission.id} />
              <input type="hidden" name="status" value="rejected" />
              <button className="px-5 py-2 bg-red-800 hover:bg-red-700 rounded font-medium">
                Reject Mission
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SAC Forms ── */}
      <h2 className="text-lg font-semibold mt-8">SAC Forms</h2>
      <p className="text-xs text-neutral-500 mt-1">
        {mission.status === "draft"
          ? "Fill all three forms, then submit the mission for approval."
          : "View the completed forms below."}
      </p>
      <div className="mt-4 space-y-3">
        {forms.map((f) => (
          <Link
            key={f.key}
            href={`/missions/${id}/${f.key}`}
            className={`block border rounded-lg p-5 transition ${
              f.done
                ? "border-green-800 bg-green-950/20 hover:border-green-600"
                : "border-neutral-700 bg-neutral-900 hover:border-indigo-600 hover:bg-indigo-950/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{f.label}</span>
                  <span className="text-neutral-400 text-sm">— {f.title}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{f.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {f.done && (
                  <Link
                    href={`/missions/${id}/print`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                  >
                    PDF
                  </Link>
                )}
                {f.done ? (
                  <span className="text-green-400 text-sm font-medium px-3 py-1 bg-green-900/40 rounded">
                    ✓ Completed
                  </span>
                ) : (
                  <span className="text-indigo-300 text-sm font-medium px-3 py-1 bg-indigo-900/40 rounded">
                    Fill form →
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Submit (only for draft) ── */}
      {mission.status === "draft" && (
        <div className="mt-8 border-t border-neutral-800 pt-6">
          <SubmitMission missionId={mission.id} allFormsComplete={allDone} />
        </div>
      )}

      {mission.status === "approved" && (
        <div className="mt-8 border border-green-800 bg-green-950/30 rounded-lg p-4 text-sm text-green-200">
          ✓ This mission has been approved.
        </div>
      )}

      {mission.status === "rejected" && (
        <div className="mt-8 border border-red-800 bg-red-950/30 rounded-lg p-4 text-sm text-red-200">
          This mission was rejected. Edit the SAC forms and resubmit.
          <form action={updateMissionAction} className="mt-3">
            <input type="hidden" name="id" value={mission.id} />
            <input type="hidden" name="status" value="draft" />
            <button className="px-3 py-1 border border-neutral-600 rounded text-xs hover:bg-neutral-800">
              Move back to draft for editing
            </button>
          </form>
        </div>
      )}

      {/* ── Admin delete ── */}
      {user.is_admin && (
        <div className="mt-10 border-t border-neutral-800 pt-6">
          <form action={deleteMissionAction}>
            <input type="hidden" name="id" value={mission.id} />
            <button className="text-xs text-red-400 hover:text-red-300">
              Delete mission
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
