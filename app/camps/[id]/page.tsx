import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import {
  addCampMemberAction,
  assignCampChainAction,
  deleteCampAction,
  removeCampMemberAction,
  updateCampAction,
} from "@/app/actions";
import BackButton from "@/components/BackButton";
import type {
  Camp,
  ChainTemplate,
  Mission,
  PastCampMember,
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

const missionStatusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  submitted: "bg-yellow-900 text-yellow-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
};

export default async function CampDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [camp, users, chainsRaw, missionsRaw, pastRaw] = await Promise.all([
    apiMaybe<Camp & { chain_template_id?: string | null; chain_template_name?: string | null }>(`/camps/${id}`),
    apiMaybe<User[]>("/users"),
    user.is_admin ? apiMaybe<unknown>("/chains") : Promise.resolve(null),
    apiMaybe<unknown>(`/missions?camp_id=${id}`),
    apiMaybe<unknown>(`/camps/${id}/members/history`),
  ]);
  if (!camp) notFound();
  const members = camp.members ?? [];
  const chains = extractItems<ChainTemplate>(chainsRaw);
  const currentChain = chains.find((c) => c.id === camp.chain_template_id);
  const missions = extractItems<Mission>(missionsRaw).sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
  const past = extractItems<PastCampMember>(pastRaw);

  const userNameMap = new Map((users ?? []).map((u) => [u.id, u.full_name]));

  return (
    <div className="max-w-3xl">
      <BackButton fallback="/camps" />
      <h1 className="text-2xl font-bold">{camp.site_name}</h1>
      <p className="text-sm text-neutral-400 mt-1">
        Code: {camp.site_code}
        {camp.client_name && ` · Client: ${camp.client_name}`}
        {camp.state && ` · ${camp.state}`}
      </p>

      {user.is_admin && (
        <form action={updateCampAction} className="mt-6 space-y-3">
          <input type="hidden" name="id" value={camp.id} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-neutral-400">Site name</label>
              <input name="site_name" defaultValue={camp.site_name} className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            </div>
            <div>
              <label className="text-sm text-neutral-400">Site code</label>
              <input name="site_code" defaultValue={camp.site_code} className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            </div>
            <input name="state" defaultValue={camp.state ?? ""} placeholder="State" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <input name="address" defaultValue={camp.address ?? ""} placeholder="Address" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
          </div>
          <button className="px-4 py-2 bg-white text-black font-medium rounded">Save</button>
        </form>
      )}

      {/* ── Mission approval chain ── */}
      <h2 className="text-lg font-semibold mt-10">Mission approval chain</h2>
      <p className="text-xs text-neutral-500 mt-1">
        Reuses your organisation&apos;s chain templates. Mission submissions in this
        camp follow this chain. Levels can name approvers explicitly or use the
        camp role <code className="text-neutral-300">supervisor</code>.
      </p>
      {camp.chain_template_id ? (
        <div className="mt-3 border border-neutral-800 rounded-lg p-3 text-sm">
          <span className="text-neutral-400">Current chain:</span>{" "}
          <span className="font-medium">
            {currentChain?.name ?? camp.chain_template_name ?? camp.chain_template_id.slice(0, 8)}
          </span>
        </div>
      ) : (
        <p className="mt-3 text-xs text-orange-400">
          No chain attached — submitted missions will be auto-approved.
        </p>
      )}
      {user.is_admin && (
        <form action={assignCampChainAction} className="mt-3 flex flex-wrap gap-2 items-end max-w-xl">
          <input type="hidden" name="camp_id" value={camp.id} />
          <div className="flex-1 min-w-48">
            <label className="text-xs text-neutral-400">
              {camp.chain_template_id ? "Replace chain" : "Attach chain"}
            </label>
            <select
              name="chain_template_id"
              defaultValue={camp.chain_template_id ?? ""}
              className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
            >
              {chains.length === 0 && <option value="">No chains defined</option>}
              {chains.length > 0 && <option value="">— select a chain —</option>}
              {chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            disabled={chains.length === 0}
            className="text-xs px-3 py-1.5 border border-neutral-700 rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            Save
          </button>
        </form>
      )}

      <h2 className="text-lg font-semibold mt-10">Members ({members.length})</h2>
      <div className="mt-3 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Camp Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-neutral-500">No members.</td></tr>}
            {members.map((m) => (
              <tr key={`${m.user_id}:${m.role}`} className="border-t border-neutral-800">
                <td className="px-4 py-2">{m.full_name}</td>
                <td className="px-4 py-2 text-neutral-400">{m.email}</td>
                <td className="px-4 py-2">{m.role}</td>
                <td className="px-4 py-2">
                  {user.is_admin && (
                    <form action={removeCampMemberAction}>
                      <input type="hidden" name="camp_id" value={camp.id} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <input type="hidden" name="role" value={m.role} />
                      <button className="text-xs text-red-400 hover:text-red-300">Remove</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {user.is_admin && (
        <>
          <h3 className="text-sm font-semibold mt-6">Add member</h3>
          <form action={addCampMemberAction} className="mt-2 flex gap-2 max-w-xl">
            <input type="hidden" name="camp_id" value={camp.id} />
            <select name="user_id" className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
              {(users ?? []).map((u) => <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>)}
            </select>
            <select name="role" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
              <option value="camper">Camper</option>
              <option value="supervisor">Supervisor</option>
            </select>
            <button className="text-xs px-3 py-2 border border-neutral-700 rounded hover:bg-neutral-800">Add</button>
          </form>
        </>
      )}

      {/* ── Past staff ── */}
      <h2 className="text-lg font-semibold mt-10">Past staff ({past.length})</h2>
      <p className="text-xs text-neutral-500 mt-1">
        Members who were once part of this camp. History is kept indefinitely
        for audit.
      </p>
      <div className="mt-3 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2">Joined</th>
              <th className="text-left px-4 py-2">Removed</th>
              <th className="text-left px-4 py-2">Removed by</th>
            </tr>
          </thead>
          <tbody>
            {past.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-neutral-500">
                  No past members.
                </td>
              </tr>
            )}
            {past.map((p, i) => (
              <tr
                key={`${p.user_id}:${p.role}:${p.removed_at}:${i}`}
                className="border-t border-neutral-800"
              >
                <td className="px-4 py-2">{p.full_name}</td>
                <td className="px-4 py-2 text-neutral-400">{p.email}</td>
                <td className="px-4 py-2">{p.role}</td>
                <td className="px-4 py-2 text-neutral-400">{fmtDate(p.joined_at)}</td>
                <td className="px-4 py-2 text-neutral-400">{fmtDateTime(p.removed_at)}</td>
                <td className="px-4 py-2 text-neutral-400">
                  {p.removed_by ? (userNameMap.get(p.removed_by) ?? p.removed_by.slice(0, 8)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Missions ── */}
      <div className="flex items-center justify-between mt-10 gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Missions ({missions.length})</h2>
        <Link
          href={`/camps/${camp.id}/missions/print?status=approved`}
          target="_blank"
          className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
        >
          Print missions
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {missions.length === 0 && (
          <p className="text-sm text-neutral-500">No missions for this camp yet.</p>
        )}
        {missions.map((m) => (
          <Link
            key={m.id}
            href={`/missions/${m.id}`}
            className="flex items-center justify-between gap-3 border border-neutral-800 hover:border-neutral-600 rounded-lg p-3"
          >
            <div className="min-w-0">
              <div className="font-mono font-semibold">{m.mission_number}</div>
              <div className="text-xs text-neutral-400 mt-1">
                {fmtDate(m.mission_date)}
                {m.current_approval_level
                  ? ` · level ${m.current_approval_level}`
                  : ""}
              </div>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                missionStatusColors[m.status] ?? "bg-neutral-800"
              }`}
            >
              {m.status}
            </span>
          </Link>
        ))}
      </div>

      {user.is_admin && (
        <div className="mt-10 border-t border-neutral-800 pt-6">
          <form action={deleteCampAction}>
            <input type="hidden" name="id" value={camp.id} />
            <button className="text-xs text-red-400 hover:text-red-300">Delete camp permanently</button>
          </form>
        </div>
      )}
    </div>
  );
}
