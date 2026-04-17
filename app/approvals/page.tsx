import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { bulkApproveAction } from "@/app/actions";
import type { Department, Report, ReportTemplate, User } from "@/lib/types";

type SortKey = "submitted" | "reporter" | "department" | "urgency";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: SortKey }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const sort: SortKey = (sp.sort ?? "submitted") as SortKey;

  const [queue, templates, users, departments] = await Promise.all([
    apiMaybe<Report[]>("/approvals/queue"),
    apiMaybe<ReportTemplate[]>("/templates"),
    apiMaybe<User[]>("/users"),
    apiMaybe<Department[]>("/departments"),
  ]);

  const list = queue ?? [];
  const tmap = new Map((templates ?? []).map((t) => [t.id, t]));
  const umap = new Map((users ?? []).map((u) => [u.id, u]));
  const dmap = new Map((departments ?? []).map((d) => [d.id, d]));

  const sorted = [...list].sort((a, b) => {
    if (sort === "reporter") {
      return (umap.get(a.reporter_id)?.full_name ?? "").localeCompare(
        umap.get(b.reporter_id)?.full_name ?? "",
      );
    }
    if (sort === "department") {
      return (dmap.get(a.department_id)?.name ?? "").localeCompare(
        dmap.get(b.department_id)?.name ?? "",
      );
    }
    if (sort === "urgency") {
      return (a.submitted_at ?? "").localeCompare(b.submitted_at ?? "");
    }
    return (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "");
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Approval Queue</h1>
        <form method="GET" className="flex items-center gap-2">
          <label className="text-xs text-neutral-400">Sort:</label>
          <select name="sort" defaultValue={sort} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm">
            <option value="submitted">Submission date (newest)</option>
            <option value="urgency">Submission date (oldest)</option>
            <option value="reporter">Reporter name</option>
            <option value="department">Department</option>
          </select>
          <button className="text-xs px-2 py-1 border border-neutral-700 rounded">Apply</button>
        </form>
      </div>
      <p className="text-sm text-neutral-400 mt-1">
        Reports waiting on your action at their current chain level.
      </p>

      <form action={bulkApproveAction} className="mt-6">
        <div className="space-y-3">
          {sorted.length === 0 && (
            <p className="text-neutral-500 text-sm">Nothing pending.</p>
          )}
          {sorted.map((r) => {
            const tpl = tmap.get(r.template_id);
            const reporter = umap.get(r.reporter_id);
            const dept = dmap.get(r.department_id);
            return (
              <div
                key={r.id}
                className="border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 flex items-start gap-3"
              >
                <input type="checkbox" name="ids" value={r.id} className="mt-1" />
                <Link href={`/reports/${r.id}`} className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        <span className="text-neutral-500 font-mono text-xs">#{r.id.slice(0, 8)}</span>{" "}
                        {tpl?.name ?? "—"}
                      </div>
                      <div className="text-xs text-neutral-400 mt-1">
                        {reporter?.full_name ?? r.reporter_id.slice(0, 8)} · {dept?.name ?? "—"} · level {r.current_level}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 whitespace-nowrap">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ""}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
        {sorted.length > 0 && (
          <button className="mt-4 px-4 py-2 bg-green-700 hover:bg-green-600 rounded font-medium text-sm">
            Bulk approve selected
          </button>
        )}
      </form>
    </div>
  );
}
