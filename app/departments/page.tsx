import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import {
  createDepartmentAction,
  toggleArchiveDepartmentAction,
} from "@/app/actions";
import type { Department, ReportTemplate, User } from "@/lib/types";
import InlineChainBuilder from "@/components/InlineChainBuilder";

function tree(all: Department[], parent: string | null): Department[] {
  return all.filter((d) => (d.parent_id ?? null) === parent);
}

function Node({
  d,
  all,
  depth,
}: {
  d: Department;
  all: Department[];
  depth: number;
}) {
  const children = tree(all, d.id);
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className={`border rounded-lg px-4 py-3 mb-2 flex items-center gap-3 ${
          d.is_archived
            ? "border-neutral-900 opacity-50"
            : "border-neutral-800 hover:border-neutral-600"
        }`}
      >
        <Link href={`/departments/${d.id}`} className="flex-1 min-w-0">
          <div className="font-semibold truncate">
            {d.name}
            {d.is_archived && (
              <span className="ml-2 text-xs text-neutral-500">archived</span>
            )}
          </div>
          {d.description && (
            <div className="text-xs text-neutral-500 mt-0.5 truncate">
              {d.description}
            </div>
          )}
        </Link>
        <form action={toggleArchiveDepartmentAction}>
          <input type="hidden" name="id" value={d.id} />
          <input
            type="hidden"
            name="archived"
            value={d.is_archived ? "true" : "false"}
          />
          <button className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800">
            {d.is_archived ? "Restore" : "Archive"}
          </button>
        </form>
      </div>
      {children.map((c) => (
        <Node key={c.id} d={c} all={all} depth={depth + 1} />
      ))}
    </div>
  );
}

export default async function DepartmentsPage() {
  await requireAdmin();
  const [departments, users, templates] = await Promise.all([
    apiMaybe<Department[]>("/departments"),
    apiMaybe<User[]>("/users"),
    apiMaybe<ReportTemplate[]>("/templates"),
  ]);
  const all = departments ?? [];
  const roots = tree(all, null);
  const publishedTemplates = (templates ?? []).filter((t) => t.is_published);

  return (
    <div>
      <h1 className="text-2xl font-bold">Departments</h1>
      <p className="text-sm text-neutral-400 mt-1">
        Nested org structure. Click a department to manage members.
      </p>

      <div className="mt-6">
        {roots.length === 0 && (
          <p className="text-neutral-500 text-sm">No departments yet. Create one below.</p>
        )}
        {roots.map((d) => (
          <Node key={d.id} d={d} all={all} depth={0} />
        ))}
      </div>

      {/* ── Unified Create Department ── */}
      <div className="mt-12 border-t border-neutral-800 pt-8">
        <h2 className="text-xl font-bold">Create New Department</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Set up identity, approval chain, and assign report templates in one step.
        </p>

        <form
          action={createDepartmentAction}
          className="mt-6 space-y-8 max-w-3xl"
        >
          {/* ── Step 1-3: Identity ── */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">
              1 · Identity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm text-neutral-400">
                  Department name
                </label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Engineering"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-neutral-400">Description</label>
                <input
                  name="description"
                  placeholder="What this department does"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">
                  Parent department
                </label>
                <select
                  name="parent_id"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                >
                  <option value="">Top-level (none)</option>
                  {all.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400">
                  Department Head
                </label>
                <select
                  name="head_user_id"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                >
                  <option value="">None — assign later</option>
                  {(users ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Step 4-5: Chain of Command ── */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              2 · Chain of Command
            </h3>
            <p className="text-xs text-neutral-500 mb-3">
              Up to 5 approval levels. Each level has a role, resolution mode,
              time limit, and escalation action.
            </p>
            <InlineChainBuilder name="chain_levels" />
          </section>

          {/* ── Step 6: Templates ── */}
          <section>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              3 · Report Templates &amp; Schedule
            </h3>
            <p className="text-xs text-neutral-500 mb-3">
              Choose which report forms people in this department fill in.
            </p>

            {publishedTemplates.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No published templates yet.{" "}
                <Link href="/templates/new" className="underline">
                  Create one first
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {publishedTemplates.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-start gap-2 text-sm border border-neutral-800 rounded px-3 py-2 cursor-pointer hover:border-neutral-600"
                  >
                    <input
                      type="checkbox"
                      name="template_ids"
                      value={t.id}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium">
                        {t.name}{" "}
                        <span className="text-neutral-500 text-xs">
                          v{t.version}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500">
                        {t.schema.length} fields
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-neutral-400">
                  Submission schedule
                </label>
                <select
                  name="schedule"
                  defaultValue="daily"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="adhoc">Ad-hoc</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400">
                  Deadline time
                </label>
                <input
                  type="time"
                  step="1"
                  name="deadline_time"
                  defaultValue="17:00:00"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                />
              </div>
            </div>
          </section>

          <button className="w-full bg-white text-black font-semibold rounded px-4 py-2.5 hover:bg-neutral-200">
            Publish Department
          </button>
        </form>
      </div>
    </div>
  );
}
