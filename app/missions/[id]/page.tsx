import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import {
  actOnMissionAction,
  deleteMissionAction,
  updateMissionAction,
} from "@/app/actions";
import BackButton from "@/components/BackButton";
import SubmitMission from "./SubmitMission";
import type {
  Camp,
  ChainTemplate,
  Mission,
  MissionApprovalEntry,
  User,
} from "@/lib/types";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

const actionLabels: Record<string, string> = {
  approve: "Approved",
  reject: "Rejected",
  request_changes: "Requested changes",
  escalate: "Escalated",
  auto_approve: "Auto-approved",
};

export default async function MissionDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    approved?: string;
    rejected?: string;
    submitted?: string;
    act_error?: string;
  }>;
}) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const mission = await apiMaybe<Mission>(`/missions/${id}`);
  if (!mission) notFound();
  const [camp, sac16, sac18, approvalsRaw, chainTemplate] = await Promise.all([
    apiMaybe<Camp>(`/camps/${mission.camp_id}`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac16`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac18`),
    apiMaybe<unknown>(`/missions/${id}/approvals`),
    mission.chain_template_id
      ? apiMaybe<ChainTemplate>(`/chains/${mission.chain_template_id}`)
      : Promise.resolve(null),
  ]);
  const approvals = extractItems<MissionApprovalEntry>(approvalsRaw);

  let approverName: string | null = mission.approved_by_name ?? null;
  if (!approverName && mission.approved_by) {
    const approver = await apiMaybe<User>(`/users/${mission.approved_by}`);
    approverName = approver?.full_name ?? null;
  }
  const approvedAtLabel = mission.approved_at ? fmtDateTime(mission.approved_at) : null;

  let rejecterName: string | null = null;
  if (mission.rejected_by) {
    const rejecter = await apiMaybe<User>(`/users/${mission.rejected_by}`);
    rejecterName = rejecter?.full_name ?? null;
  }
  const rejectedAtLabel = mission.rejected_at ? fmtDateTime(mission.rejected_at) : null;

  // Collect signature IDs from SAC forms.
  const signatures: { label: string; id: string }[] = [];
  if (sac16?.signoff_signature_id)
    signatures.push({ label: "SAC 16 Signoff", id: String(sac16.signoff_signature_id) });
  if (sac18?.rp_signature_id)
    signatures.push({ label: "RP Signature", id: String(sac18.rp_signature_id) });
  if (sac18?.supervisor_signature_id)
    signatures.push({ label: "Supervisor Signature", id: String(sac18.supervisor_signature_id) });
  if (sac18?.post_rp_signature_id)
    signatures.push({ label: "Post-flight RP", id: String(sac18.post_rp_signature_id) });
  if (sac18?.post_supervisor_signature_id)
    signatures.push({ label: "Post-flight Supervisor", id: String(sac18.post_supervisor_signature_id) });

  const forms = [
    { key: "sac16", label: "SAC 16", title: "Drone Mission Report", desc: "Mission description and hourly flight logs", done: mission.has_sac16 },
    { key: "sac17", label: "SAC 17", title: "Mission Plan & Risk Assessment", desc: "Pilot info, coordinates, UAV details, pre-flight checklist", done: mission.has_sac17 },
    { key: "sac18", label: "SAC 18", title: "Site / Drone Operation Risk Assessment", desc: "Risk checklist, overflown areas, post-flight debrief", done: mission.has_sac18 },
  ];
  const allDone = forms.every((f) => f.done);

  // Eligibility for the current chain level.
  const currentLevel = mission.current_approval_level ?? 0;
  const currentLevelDef = chainTemplate?.levels?.find((l) => l.level_index === currentLevel) ?? null;
  const isSupervisor = !!camp?.members?.some((m) => m.user_id === user.id && m.role === "supervisor");
  const isCampMember = !!camp?.members?.some((m) => m.user_id === user.id);
  const namedAtLevel = !!currentLevelDef?.approver_user_ids?.includes(user.id);
  const roleMatchAtLevel =
    !!currentLevelDef?.approver_role &&
    !!camp?.members?.some(
      (m) => m.user_id === user.id && m.role === currentLevelDef.approver_role,
    );
  const canActOnLevel =
    mission.status === "submitted" &&
    (user.is_admin || namedAtLevel || roleMatchAtLevel);

  // Fallback for missions without a chain: legacy supervisor/admin approval.
  const canApproveLegacy =
    mission.status === "submitted" &&
    !mission.chain_template_id &&
    (user.is_admin || isSupervisor);

  return (
    <div className="max-w-3xl">
      <BackButton fallback="/missions" />
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
          ✓ Mission submitted successfully. It is now flowing through the approval chain.
        </div>
      )}
      {sp.act_error && (
        <div className="mb-6 border border-red-800 bg-red-950/30 rounded-lg p-4 text-sm text-red-200">
          Could not record action: {decodeURIComponent(sp.act_error)}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-mono">{mission.mission_number}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {camp?.site_name ?? "—"} · {fmtDate(mission.mission_date)}
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

      {/* ── Chain-of-command status (when in flight) ── */}
      {mission.status === "submitted" && chainTemplate && (
        <div className="mt-6 border border-neutral-800 rounded-lg p-4 text-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="text-neutral-400">Approval chain:</span>{" "}
              <span className="font-medium">{chainTemplate.name}</span>
            </div>
            <div className="text-xs text-neutral-400">
              At level {currentLevel} of {chainTemplate.levels?.length ?? "?"}
            </div>
          </div>
          {chainTemplate.levels && chainTemplate.levels.length > 0 && (
            <ol className="mt-3 space-y-1">
              {chainTemplate.levels.map((l) => {
                const done = l.level_index < currentLevel;
                const active = l.level_index === currentLevel;
                return (
                  <li
                    key={l.level_index}
                    className={`flex items-center gap-2 text-xs ${
                      done
                        ? "text-green-400"
                        : active
                        ? "text-yellow-300"
                        : "text-neutral-500"
                    }`}
                  >
                    <span className="w-5">{done ? "✓" : active ? "▶" : "○"}</span>
                    <span>
                      Level {l.level_index} —{" "}
                      {l.approver_role
                        ? `role: ${l.approver_role}`
                        : `${l.approver_user_ids?.length ?? 0} named approver(s)`}
                      {l.resolution === "all" ? " · all required" : " · any one"}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* ── Pending approval banner ── */}
      {mission.status === "submitted" && !canActOnLevel && !canApproveLegacy && (
        <div className="mt-6 border border-yellow-800 bg-yellow-950/30 rounded-lg p-4 text-sm text-yellow-200">
          {chainTemplate
            ? `Waiting on level ${currentLevel} approver${
                currentLevelDef?.approver_role
                  ? ` (${currentLevelDef.approver_role})`
                  : ""
              }.`
            : "Waiting on a camp supervisor or admin."}
        </div>
      )}

      {/* ── Chain action panel (current-level approver) ── */}
      {canActOnLevel && (
        <div className="mt-6 border border-indigo-800 bg-indigo-950/20 rounded-lg p-5">
          <h2 className="font-semibold text-indigo-200">
            Your action — level {currentLevel}
          </h2>
          <p className="text-xs text-indigo-300/60 mt-1">
            You are an approver at this level. Approving advances the mission to
            the next level (or finalises it). Rejecting closes the mission.
          </p>
          <form action={actOnMissionAction} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={mission.id} />
            <textarea
              name="comment"
              rows={2}
              placeholder="Optional comment (recommended for reject / request changes)"
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
            />
            <div className="flex gap-2 flex-wrap">
              <button
                type="submit"
                name="decision"
                value="approve"
                className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded font-medium text-sm"
              >
                Approve
              </button>
              <button
                type="submit"
                name="decision"
                value="reject"
                className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded font-medium text-sm"
              >
                Reject
              </button>
              <button
                type="submit"
                name="decision"
                value="request_changes"
                className="px-4 py-2 bg-orange-800 hover:bg-orange-700 rounded font-medium text-sm"
              >
                Request changes
              </button>
              <button
                type="submit"
                name="decision"
                value="escalate"
                className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 rounded font-medium text-sm"
              >
                Escalate
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Legacy approve/reject (no chain attached) ── */}
      {canApproveLegacy && (
        <div className="mt-6 border border-indigo-800 bg-indigo-950/20 rounded-lg p-5">
          <h2 className="font-semibold text-indigo-200">Review this mission</h2>
          <p className="text-xs text-indigo-300/60 mt-1">
            No approval chain is attached to this camp — you can approve or
            reject directly.
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

      {/* ── Approval audit trail ── */}
      {approvals.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Approval history</h2>
          <ul className="mt-3 space-y-2">
            {approvals.map((a, i) => (
              <li
                key={`${a.created_at}-${i}`}
                className="border border-neutral-800 rounded p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium">
                      {actionLabels[String(a.action)] ?? a.action}
                    </span>{" "}
                    <span className="text-neutral-400">at level {a.level_index}</span>
                  </div>
                  <div className="text-xs text-neutral-500 whitespace-nowrap">
                    {fmtDateTime(a.created_at)}
                  </div>
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  by {a.actor_name}
                </div>
                {a.comment && (
                  <div className="text-xs text-neutral-300 mt-1 italic">
                    “{a.comment}”
                  </div>
                )}
              </li>
            ))}
          </ul>
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
          <div
            key={f.key}
            className={`border rounded-lg p-5 transition ${
              f.done
                ? "border-green-800 bg-green-950/20"
                : "border-neutral-700 bg-neutral-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <Link href={`/missions/${id}/${f.key}`} className="flex-1 min-w-0 hover:opacity-80">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{f.label}</span>
                  <span className="text-neutral-400 text-sm">— {f.title}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{f.desc}</p>
              </Link>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {f.done && (
                  <a
                    href={`/missions/${id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                  >
                    PDF
                  </a>
                )}
                <Link href={`/missions/${id}/${f.key}`}>
                  {f.done ? (
                    <span className="text-green-400 text-sm font-medium px-3 py-1 bg-green-900/40 rounded">
                      ✓ Completed
                    </span>
                  ) : (
                    <span className="text-indigo-300 text-sm font-medium px-3 py-1 bg-indigo-900/40 rounded">
                      Fill form →
                    </span>
                  )}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Signatures ── */}
      {signatures.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Verification Signatures</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {signatures.map((sig) => (
              <div key={sig.id} className="border border-neutral-800 rounded-lg p-3">
                <div className="text-xs text-neutral-400 mb-2">{sig.label}</div>
                <img
                  src={`/api/file/${sig.id}`}
                  alt={sig.label}
                  className="max-w-full max-h-40 rounded border border-neutral-700 object-contain"
                />
                <a
                  href={`/api/file/${sig.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-blue-400 hover:underline"
                >
                  View full image
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Submit (only for draft) ── */}
      {mission.status === "draft" && isCampMember && (
        <div className="mt-8 border-t border-neutral-800 pt-6">
          <SubmitMission missionId={mission.id} allFormsComplete={allDone} />
        </div>
      )}

      {mission.status === "approved" && (
        <div className="mt-8 border border-green-800 bg-green-950/30 rounded-lg p-4 text-sm text-green-200">
          <div>✓ This mission has been approved.</div>
          {approverName && (
            <div className="mt-1 text-xs text-green-300/80">
              Approved by {approverName}
              {approvedAtLabel ? ` on ${approvedAtLabel}` : ""}
            </div>
          )}
        </div>
      )}

      {mission.status === "rejected" && (
        <div className="mt-8 border border-red-800 bg-red-950/30 rounded-lg p-4 text-sm text-red-200">
          <div>This mission was rejected.</div>
          {(rejecterName || rejectedAtLabel) && (
            <div className="mt-1 text-xs text-red-300/80">
              Rejected
              {rejecterName ? ` by ${rejecterName}` : ""}
              {rejectedAtLabel ? ` on ${rejectedAtLabel}` : ""}
            </div>
          )}
          {mission.rejection_reason && (
            <div className="mt-2 text-xs text-red-200/90 italic">
              Reason: {mission.rejection_reason}
            </div>
          )}
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
