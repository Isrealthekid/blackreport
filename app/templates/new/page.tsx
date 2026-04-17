import { requireAdmin } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { createTemplateAction } from "@/app/actions";
import type { Department } from "@/lib/types";
import TemplateBuilder from "./TemplateBuilder";

export default async function NewTemplatePage() {
  await requireAdmin();
  const departments = (await apiMaybe<Department[]>("/departments")) ?? [];
  const activeDepts = departments.filter((d) => !d.is_archived);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">New Template</h1>
      <p className="text-sm text-neutral-400 mt-1">
        Build the schema. Templates are auto-published on save.
      </p>
      <form action={createTemplateAction} className="mt-6 space-y-6">
        <div>
          <label className="text-sm text-neutral-400">Template name</label>
          <input
            name="name"
            required
            placeholder="e.g. Daily Work Report"
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </div>

        <TemplateBuilder />

        {/* ── Assign to departments ── */}
        <section className="border-t border-neutral-800 pt-6">
          <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            Assign to departments (optional)
          </h3>
          <p className="text-xs text-neutral-500 mb-3">
            Select one or more departments that will use this template.
            Reporters in those departments will see it when filing a new report.
          </p>

          {activeDepts.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No departments exist yet. You can assign later from the department
              page.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {activeDepts.map((d) => (
                <label
                  key={d.id}
                  className="flex items-start gap-2 text-sm border border-neutral-800 rounded px-3 py-2 cursor-pointer hover:border-neutral-600"
                >
                  <input
                    type="checkbox"
                    name="assign_department_ids"
                    value={d.id}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.name}</div>
                    {d.description && (
                      <div className="text-xs text-neutral-500 truncate">
                        {d.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          {activeDepts.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-neutral-400">Schedule</label>
                <select
                  name="assign_schedule"
                  defaultValue="adhoc"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                >
                  <option value="adhoc">Ad-hoc</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-400">Deadline time</label>
                <input
                  type="time"
                  step="1"
                  name="assign_deadline_time"
                  defaultValue="17:00:00"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
                />
              </div>
            </div>
          )}
        </section>

        <button className="w-full bg-white text-black font-semibold rounded px-4 py-2.5 hover:bg-neutral-200">
          Create &amp; publish template
        </button>
      </form>
    </div>
  );
}
