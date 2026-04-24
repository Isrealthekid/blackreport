import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import type { Camp, ChainTemplate, Mission } from "@/lib/types";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function MissionApprovalsPage() {
  const user = await requireUser();

  const [missionsRaw, campsRaw, chainsRaw] = await Promise.all([
    apiMaybe<unknown>("/missions"),
    apiMaybe<unknown>("/camps"),
    apiMaybe<unknown>("/chains?kind=mission"),
  ]);
  const missions = extractItems<Mission>(missionsRaw).filter(
    (m) => m.status === "submitted",
  );
  const camps = extractItems<Camp>(campsRaw);
  const chains = extractItems<ChainTemplate>(chainsRaw);

  // Pull camp detail (with members) for each mission's camp.
  const campIds = Array.from(new Set(missions.map((m) => m.camp_id)));
  const campDetails = await Promise.all(
    campIds.map((id) => apiMaybe<Camp>(`/camps/${id}`)),
  );
  const campMap = new Map<string, Camp>();
  for (const c of campDetails) if (c) campMap.set(c.id, c);

  // Pull chain details (levels) for unique chain templates referenced.
  const chainIds = Array.from(
    new Set(missions.map((m) => m.chain_template_id).filter(Boolean) as string[]),
  );
  const chainDetails = await Promise.all(
    chainIds.map((id) => apiMaybe<ChainTemplate>(`/chains/${id}`)),
  );
  const chainMap = new Map<string, ChainTemplate>();
  for (const c of chainDetails) if (c) chainMap.set(c.id, c);

  // Filter to missions the caller can act on at the current level.
  const eligible = missions.filter((m) => {
    if (user.is_admin) return true;
    if (!m.chain_template_id) {
      // Legacy approval: supervisor at the camp.
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
        (mem) => mem.user_id === user.id && mem.role === lvl.approver_role,
      );
    }
    return false;
  });

  const sorted = [...eligible].sort((a, b) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );

  const campNameMap = new Map(camps.map((c) => [c.id, c.site_name]));
  const chainNameMap = new Map(chains.map((c) => [c.id, c.name]));

  return (
    <div>
      <h1 className="text-2xl font-bold">Mission approval queue</h1>
      <p className="text-sm text-neutral-400 mt-1">
        Missions waiting on your action at their current chain level.
      </p>

      <div className="mt-6 space-y-3">
        {sorted.length === 0 && (
          <p className="text-neutral-500 text-sm">Nothing pending for you.</p>
        )}
        {sorted.map((m) => (
          <Link
            key={m.id}
            href={`/missions/${m.id}`}
            className="block border border-neutral-800 hover:border-neutral-600 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold font-mono">{m.mission_number}</div>
                <div className="text-xs text-neutral-400 mt-1">
                  {campNameMap.get(m.camp_id) ?? m.camp_id.slice(0, 8)}
                  {m.chain_template_id ? (
                    <>
                      {" · "}
                      {chainNameMap.get(m.chain_template_id) ?? "chain"}
                      {" · level "}
                      {m.current_approval_level}
                    </>
                  ) : (
                    " · no chain (legacy)"
                  )}
                </div>
              </div>
              <div className="text-xs text-neutral-500 whitespace-nowrap">
                {m.created_at ? fmtDateTime(m.created_at) : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
