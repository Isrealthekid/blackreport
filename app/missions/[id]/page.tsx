import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { updateMissionAction, deleteMissionAction } from "@/app/actions";
import type { Camp, Mission } from "@/lib/types";

const statusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  submitted: "bg-blue-900 text-blue-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
};

export default async function MissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
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

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-mono">{mission.mission_number}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {camp?.site_name ?? "—"} · {mission.mission_date}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${statusColors[mission.status] ?? "bg-neutral-800"}`}>
          {mission.status}
        </span>
      </div>

      {/* ── SAC Forms ── */}
      <h2 className="text-lg font-semibold mt-8">SAC Forms</h2>
      <p className="text-xs text-neutral-500 mt-1">
        Fill all three forms, then submit the mission for approval.
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
          </Link>
        ))}
      </div>

      {/* ── Submit mission ─�� */}
      {mission.status === "draft" && (
        <div className="mt-8 border-t border-neutral-800 pt-6">
          {allDone ? (
            <form action={updateMissionAction}>
              <input type="hidden" name="id" value={mission.id} />
              <input type="hidden" name="status" value="submitted" />
              <button className="w-full px-4 py-3 bg-white text-black font-semibold rounded hover:bg-neutral-200 text-lg">
                Submit Mission for Approval
              </button>
            </form>
          ) : (
            <div className="text-center">
              <button
                disabled
                className="w-full px-4 py-3 bg-neutral-800 text-neutral-500 font-semibold rounded cursor-not-allowed text-lg"
              >
                Submit Mission for Approval
              </button>
              <p className="text-xs text-neutral-500 mt-2">
                Complete all three SAC forms above before submitting.
              </p>
            </div>
          )}
        </div>
      )}

      {mission.status === "submitted" && (
        <div className="mt-8 border border-blue-800 bg-blue-950/30 rounded-lg p-4 text-sm text-blue-200">
          This mission has been submitted and is awaiting approval.
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
        </div>
      )}

      {/* ── Admin delete ── */}
      {user.is_admin && (
        <div className="mt-10 border-t border-neutral-800 pt-6">
          <form action={deleteMissionAction}>
            <input type="hidden" name="id" value={mission.id} />
            <button className="text-xs text-red-400 hover:text-red-300">Delete mission</button>
          </form>
        </div>
      )}
    </div>
  );
}
