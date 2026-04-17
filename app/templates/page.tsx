import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import {
  assignTemplateAction,
  deleteTemplateAction,
  publishTemplateAction,
  unassignTemplateAction,
} from "@/app/actions";
import type { AssignedTemplate, Department, ReportTemplate } from "@/lib/types";

export default async function TemplatesPage() {
  await requireAdmin();

  const [templates, departmentsList] = await Promise.all([
    apiMaybe<ReportTemplate[]>("/templates"),
    apiMaybe<Department[]>("/departments"),
  ]);
  const list = templates ?? [];
  const allDepts = departmentsList ?? [];
  const activeDepts = allDepts.filter((d) => !d.is_archived);

  // Fetch full detail for every active dept to get assigned_templates.
  const deptsDetail = await Promise.all(
    activeDepts.map((d) =>
      apiMaybe<Department>(`/departments/${d.id}`).then((full) => full ?? d),
    ),
  );

  // Build map: templateId → [{dept, assignment}]
  const assignmentMap = new Map<
    string,
    { dept: Department; assignment: AssignedTemplate }[]
  >();
  for (const d of deptsDetail) {
    for (const a of d.assigned_templates ?? []) {
      const arr = assignmentMap.get(a.template_id) ?? [];
      arr.push({ dept: d, assignment: a });
      assignmentMap.set(a.template_id, arr);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Report Templates</h1>
        <Link
          href="/templates/new"
          className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium"
        >
          New template
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {list.length === 0 && (
          <p className="text-neutral-500 text-sm">No templates yet.</p>
        )}
        {list.map((t) => {
          const assignments = assignmentMap.get(t.id) ?? [];
          const assignedDeptIds = new Set(assignments.map((a) => a.dept.id));
          const unassignedDepts = activeDepts.filter(
            (d) => !assignedDeptIds.has(d.id),
          );

          return (
            <div
              key={t.id}
              className="border border-neutral-800 rounded-lg p-4"
            >
              {/* ── Header ── */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">
                    {t.name}{" "}
                    <span className="text-xs text-neutral-500">
                      v{t.version}
                    </span>
                    {t.is_published ? (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-green-900 text-green-200">
                        published
                      </span>
                    ) : (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-900 text-yellow-200">
                        draft
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {t.schema.length} fields · ID {t.id.slice(0, 8)}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {!t.is_published && (
                    <form action={publishTemplateAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800">
                        Publish
                      </button>
                    </form>
                  )}
                  <form action={deleteTemplateAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-xs px-2 py-1 border border-red-900 text-red-400 rounded hover:bg-red-950">
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              {/* ── Existing assignments (editable) ── */}
              {assignments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs text-neutral-400 uppercase tracking-wider">
                    Assigned departments
                  </div>
                  {assignments.map(({ dept, assignment }) => (
                    <div
                      key={`${dept.id}-${assignment.schedule}-${assignment.deadline_time}`}
                      className="border border-neutral-800 rounded p-2"
                    >
                      <form
                        action={assignTemplateAction}
                        className="flex flex-wrap gap-2 items-center"
                      >
                        <input
                          type="hidden"
                          name="template_id"
                          value={t.id}
                        />
                        <input
                          type="hidden"
                          name="department_id"
                          value={dept.id}
                        />

                        <span className="text-sm text-neutral-200 font-medium min-w-24">
                          {dept.name}
                        </span>

                        <select
                          name="schedule"
                          defaultValue={assignment.schedule}
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs"
                        >
                          <option value="adhoc">Ad-hoc</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="fortnightly">Fortnightly</option>
                          <option value="monthly">Monthly</option>
                        </select>

                        <input
                          type="time"
                          step="1"
                          name="deadline_time"
                          defaultValue={assignment.deadline_time ?? "17:00:00"}
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs"
                        />

                        <button className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800">
                          Save
                        </button>
                      </form>

                      <form
                        action={unassignTemplateAction}
                        className="mt-1"
                      >
                        <input
                          type="hidden"
                          name="department_id"
                          value={dept.id}
                        />
                        <input
                          type="hidden"
                          name="template_id"
                          value={t.id}
                        />
                        <button className="text-xs text-red-400 hover:text-red-300">
                          Unassign from {dept.name}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              {assignments.length === 0 && (
                <p className="mt-3 text-xs text-orange-400">
                  Not assigned to any department — reporters can&apos;t see it.
                </p>
              )}

              {/* ── Add new assignment (only unassigned depts) ── */}
              {unassignedDepts.length > 0 && (
                <form
                  action={assignTemplateAction}
                  className="mt-3 flex gap-2 flex-wrap items-end border-t border-neutral-800 pt-3"
                >
                  <input type="hidden" name="template_id" value={t.id} />
                  <div className="flex-1 min-w-48">
                    <label className="text-xs text-neutral-400">
                      Add to department
                    </label>
                    <select
                      name="department_id"
                      className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                    >
                      {unassignedDepts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Schedule</label>
                    <select
                      name="schedule"
                      defaultValue="adhoc"
                      className="mt-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                    >
                      <option value="adhoc">Ad-hoc</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400">Deadline</label>
                    <input
                      name="deadline_time"
                      type="time"
                      step="1"
                      defaultValue="17:00:00"
                      className="mt-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <button className="text-xs px-3 py-1.5 border border-neutral-700 rounded hover:bg-neutral-800">
                    Assign
                  </button>
                </form>
              )}

              {unassignedDepts.length === 0 && assignments.length > 0 && (
                <p className="mt-3 text-xs text-neutral-500 border-t border-neutral-800 pt-3">
                  Assigned to all departments.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
