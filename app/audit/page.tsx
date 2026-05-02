import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";

interface AuditEntry {
  id: number;
  organisation_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    entity_type?: string;
    entity_id?: string;
    actor_id?: string;
    from?: string;
    to?: string;
    offset?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  const params = new URLSearchParams();
  for (const k of ["action", "entity_type", "entity_id", "actor_id", "from", "to"] as const) {
    if (sp[k]) params.set(k, sp[k]!);
  }
  const offset = Number(sp.offset || 0);
  params.set("limit", "50");
  params.set("offset", String(offset));

  const raw = await apiMaybe<unknown>(`/audit?${params.toString()}`);
  const items = extractItems<AuditEntry>(raw);
  const total =
    raw && typeof raw === "object" && "total" in raw
      ? (raw as { total: number }).total
      : items.length;

  const baseQuery = new URLSearchParams();
  for (const k of ["action", "entity_type", "entity_id", "actor_id", "from", "to"] as const) {
    if (sp[k]) baseQuery.set(k, sp[k]!);
  }
  const prevQuery = new URLSearchParams(baseQuery);
  if (offset > 0) prevQuery.set("offset", String(Math.max(0, offset - 50)));
  const nextQuery = new URLSearchParams(baseQuery);
  nextQuery.set("offset", String(offset + 50));

  return (
    <div>
      <h1 className="text-2xl font-bold">Audit log</h1>
      <p className="text-sm text-neutral-400 mt-1">
        Append-only record of org-wide actions. Enforced at the database layer.
      </p>

      <form method="GET" className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <input
          name="action"
          defaultValue={sp.action ?? ""}
          placeholder="action (e.g. report.approve)"
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
        <input
          name="entity_type"
          defaultValue={sp.entity_type ?? ""}
          placeholder="entity_type (report / mission / camp)"
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
        <input
          name="entity_id"
          defaultValue={sp.entity_id ?? ""}
          placeholder="entity_id (uuid)"
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
        <input
          name="actor_id"
          defaultValue={sp.actor_id ?? ""}
          placeholder="actor_id (uuid)"
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
        <input
          name="from"
          type="datetime-local"
          defaultValue={sp.from ?? ""}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
        <input
          name="to"
          type="datetime-local"
          defaultValue={sp.to ?? ""}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
        <button className="bg-neutral-900 border border-neutral-700 rounded px-3 py-1 text-xs hover:bg-neutral-800">
          Apply
        </button>
        <Link href="/audit" className="text-xs text-neutral-400 hover:text-white py-1">
          Clear filters
        </Link>
      </form>

      <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-3 py-2">When</th>
              <th className="text-left px-3 py-2">Actor</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Entity</th>
              <th className="text-left px-3 py-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-neutral-500">
                  No matching events.
                </td>
              </tr>
            )}
            {items.map((e) => (
              <tr key={e.id} className="border-t border-neutral-800 align-top">
                <td className="px-3 py-2 whitespace-nowrap text-neutral-400 font-mono text-xs">
                  {fmt(e.created_at)}
                </td>
                <td className="px-3 py-2">
                  {e.actor_name ?? <span className="text-neutral-500">system</span>}
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">{e.action}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-neutral-400">{e.entity_type}</span>
                  {e.entity_id && (
                    <span className="block font-mono text-[10px] text-neutral-600">
                      {e.entity_id.slice(0, 8)}…
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-neutral-400 max-w-md">
                  <code className="font-mono break-all">
                    {JSON.stringify(e.metadata)}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
        <span>
          Showing {items.length === 0 ? 0 : offset + 1}–{offset + items.length} of {total}
        </span>
        <div className="flex gap-2">
          {offset > 0 && (
            <Link
              href={`/audit?${prevQuery.toString()}`}
              className="px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
            >
              ← Prev
            </Link>
          )}
          {offset + items.length < total && (
            <Link
              href={`/audit?${nextQuery.toString()}`}
              className="px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
            >
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
