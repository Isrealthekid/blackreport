import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import { getUserCamps } from "@/lib/scope";
import type { Camp, ChainTemplate, Mission, User } from "@/lib/types";
import MissionsTable from "@/components/MissionsTable";
import CreateMissionPanel from "./CreateMissionPanel";
import MissionsTabs, { type View } from "./MissionsTabs";

interface StatChipProps {
  label: string;
  value: number;
  tone?: "default" | "yellow" | "green" | "red";
}

function StatChip({ label, value, tone = "default" }: StatChipProps) {
  const toneClass = {
    default: "border-neutral-800 text-neutral-300",
    yellow: "border-yellow-900 text-yellow-200 bg-yellow-950/30",
    green: "border-green-900 text-green-200 bg-green-950/30",
    red: "border-red-900 text-red-200 bg-red-950/30",
  }[tone];
  return (
    <div className={`border rounded-lg px-3 py-2 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-xl font-semibold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: View }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const myCamps = await getUserCamps(user);

  const [allMissions, allUsers] = await Promise.all([
    apiMaybe<Mission[]>("/missions").then((m) => m ?? []),
    apiMaybe<User[]>("/users").then((u) => u ?? []),
  ]);

  // Pull camp detail for every camp referenced — list endpoint doesn't include members.
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
    for (const m of c.members ?? [])
      if (!userMap.has(m.user_id)) userMap.set(m.user_id, m.full_name);
  if (!userMap.has(user.id)) userMap.set(user.id, user.full_name);

  // Resolve any reporter we still don't know about.
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

  // Pull chain templates referenced by submitted missions to compute per-level eligibility.
  const chainIds = Array.from(
    new Set(
      allMissions
        .filter((m) => m.status === "submitted")
        .map((m) => m.chain_template_id)
        .filter(Boolean) as string[],
    ),
  );
  const chainDetails = await Promise.all(
    chainIds.map((id) => apiMaybe<ChainTemplate>(`/chains/${id}`)),
  );
  const chainMap = new Map<string, ChainTemplate>();
  for (const c of chainDetails) if (c) chainMap.set(c.id, c);

  const isAdmin = user.is_admin;
  const myCampIds = new Set(myCamps.map((c) => c.id));
  const isSupervisor =
    isAdmin ||
    myCamps.some((c) =>
      c.members?.some((m) => m.user_id === user.id && m.role === "supervisor"),
    );

  // ── Scope sets ─────────────────────────────────────────────
  // What this user is allowed to see at all (admin = everything; otherwise own camps).
  const scoped = isAdmin
    ? allMissions
    : allMissions.filter(
        (m) => myCampIds.has(m.camp_id) || m.reporter_id === user.id,
      );

  const myMissions = scoped.filter((m) => m.reporter_id === user.id);

  // Missions awaiting THIS user's action at the current chain level.
  const awaitingReview = scoped.filter((m) => {
    if (m.status !== "submitted") return false;
    if (isAdmin) return true;
    if (!m.chain_template_id) {
      // Legacy / no chain — supervisors at the camp can review.
      const camp = campMap.get(m.camp_id);
      return !!camp?.members?.some(
        (mem) => mem.user_id === user.id && mem.role === "supervisor",
      );
    }
    const chain = chainMap.get(m.chain_template_id);
    const lvl = chain?.levels?.find(
      (l) => l.level_index === (m.current_approval_level ?? 0),
    );
    if (!lvl) return false;
    if (lvl.approver_user_ids?.includes(user.id)) return true;
    if (lvl.approver_role) {
      const camp = campMap.get(m.camp_id);
      return !!camp?.members?.some(
        (mem) =>
          mem.user_id === user.id && mem.role === lvl.approver_role,
      );
    }
    return false;
  });

  // ── View selection ─────────────────────────────────────────
  const showAllTab = isAdmin || isSupervisor;
  const requestedView: View = sp.view ?? (showAllTab ? "all" : "mine");
  // Guard against requesting a view the user can't see.
  const view: View =
    requestedView === "all" && !showAllTab
      ? "mine"
      : requestedView === "review" && awaitingReview.length === 0
      ? "mine"
      : requestedView;

  const visible =
    view === "mine"
      ? myMissions
      : view === "review"
      ? awaitingReview
      : scoped;

  const sorted = [...visible].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  // ── Stat chips (computed against everything in scope, not the active view) ──
  const stats = {
    total: scoped.length,
    drafts: scoped.filter((m) => m.status === "draft").length,
    submitted: scoped.filter((m) => m.status === "submitted").length,
    approved: scoped.filter((m) => m.status === "approved").length,
    rejected: scoped.filter((m) => m.status === "rejected").length,
  };

  // ── Build plain-object records for the client table ───────
  const campRecord: Record<string, { site_name: string }> = {};
  for (const [id, c] of campMap) campRecord[id] = { site_name: c.site_name };
  const userNameRecord: Record<string, string> = {};
  for (const [id, name] of userMap) userNameRecord[id] = name;
  const allCampsForFilter = Array.from(campMap.values()).map((c) => ({
    id: c.id,
    site_name: c.site_name,
  }));

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Missions</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Drone operations across your camps.
          </p>
        </div>
        <CreateMissionPanel camps={myCamps.map((c) => ({ id: c.id, site_name: c.site_name }))} />
      </div>

      {/* ── Stat chips ── */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatChip label="Total" value={stats.total} />
        <StatChip label="Drafts" value={stats.drafts} />
        <StatChip
          label="Pending"
          value={stats.submitted}
          tone={stats.submitted > 0 ? "yellow" : "default"}
        />
        <StatChip label="Approved" value={stats.approved} tone="green" />
        <StatChip
          label="Rejected"
          value={stats.rejected}
          tone={stats.rejected > 0 ? "red" : "default"}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="mt-6">
        <MissionsTabs
          current={view}
          counts={{
            all: scoped.length,
            mine: myMissions.length,
            review: awaitingReview.length,
          }}
          showAll={showAllTab}
          showReview={awaitingReview.length > 0}
        />

        <MissionsTable
          missions={sorted}
          campRecord={campRecord}
          userNameRecord={userNameRecord}
          camps={allCampsForFilter}
          currentUserId={user.id}
          showUserCol={view !== "mine"}
        />
      </div>
    </div>
  );
}
