import { requireAdmin } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { assignChainAction, createChainAction } from "@/app/actions";
import type { ChainTemplate, Department } from "@/lib/types";
import ChainTemplateBuilder from "./ChainTemplateBuilder";

export default async function ChainsPage() {
  await requireAdmin();
  const [chains, departments] = await Promise.all([
    apiMaybe<ChainTemplate[]>("/chains"),
    apiMaybe<Department[]>("/departments"),
  ]);
  const list = chains ?? [];
  const depts = (departments ?? []).filter((d) => !d.is_archived);

  return (
    <div>
      <h1 className="text-2xl font-bold">Chain Templates</h1>
      <p className="text-sm text-neutral-400 mt-1">
        Define reusable approval chains. Assign one to a department to make its reports flow through it.
      </p>

      <div className="mt-6 space-y-3">
        {list.length === 0 && (
          <p className="text-neutral-500 text-sm">No chain templates yet.</p>
        )}
        {list.map((ct) => (
          <div key={ct.id} className="border border-neutral-800 rounded-lg p-4">
            <div className="font-semibold">{ct.name}</div>
            {ct.levels && (
              <ol className="mt-2 text-sm text-neutral-400 space-y-1">
                {ct.levels.map((l, i) => (
                  <li key={i}>
                    <span className="text-neutral-500">{l.level_index ?? i + 1}.</span>{" "}
                    {l.approver_role ?? (l.approver_user_ids?.length ? `${l.approver_user_ids.length} specific users` : "—")}{" "}
                    · {l.resolution} · {l.time_limit_hours}h · {l.escalation_action.replace("_", " ")}
                  </li>
                ))}
              </ol>
            )}

            <form action={assignChainAction} className="mt-3 flex gap-2">
              <input type="hidden" name="chain_template_id" value={ct.id} />
              <select name="department_id" className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm">
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button className="text-xs px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-800">
                Assign to department
              </button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-10">New chain template</h2>
      <form action={createChainAction} className="mt-3 space-y-3 max-w-3xl">
        <input
          name="name"
          required
          placeholder="Chain template name"
          className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
        />
        <ChainTemplateBuilder />
        <button className="px-4 py-2 bg-white text-black font-medium rounded">Save template</button>
      </form>
    </div>
  );
}
