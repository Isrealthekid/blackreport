import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import BackButton from "@/components/BackButton";
import { apiMaybe } from "@/lib/api";
import {
  addDeptMemberAction,
  deleteDepartmentAction,
  removeDeptMemberAction,
  updateDepartmentAction,
} from "@/app/actions";
import type {
  Department,
  DepartmentMember,
  Role,
  User,
} from "@/lib/types";

const ROLES: Role[] = [
  "admin",
  "department_head",
  "manager",
  "reviewer",
  "reporter",
  "viewer",
];

export default async function DepartmentEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [dept, departments, members, users] = await Promise.all([
    apiMaybe<Department>(`/departments/${id}`),
    apiMaybe<Department[]>("/departments"),
    apiMaybe<DepartmentMember[]>(`/departments/${id}/members`),
    apiMaybe<User[]>("/users"),
  ]);
  if (!dept) notFound();

  const otherDepts = (departments ?? []).filter((d) => d.id !== dept!.id);

  return (
    <div className="max-w-3xl">
      <BackButton fallback="/departments" />
      <h1 className="text-2xl font-bold">{dept!.name}</h1>
      <p className="text-sm text-neutral-400 mt-1">
        Configure department identity, hierarchy and membership.
      </p>

      <form action={updateDepartmentAction} className="mt-6 space-y-4">
        <input type="hidden" name="id" value={dept!.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-neutral-400">Name</label>
            <input
              name="name"
              defaultValue={dept!.name}
              className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm text-neutral-400">Parent</label>
            <select
              name="parent_id"
              defaultValue={dept!.parent_id ?? ""}
              className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
            >
              <option value="">Top-level</option>
              {otherDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm text-neutral-400">Description</label>
          <textarea
            name="description"
            rows={2}
            defaultValue={dept!.description ?? ""}
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm text-neutral-400">Department Head</label>
          <select
            name="head_user_id"
            defaultValue={dept!.head_user_id ?? ""}
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          >
            <option value="">No head</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white text-black font-medium rounded">Save</button>
          <Link href="/chains" className="px-4 py-2 border border-neutral-700 rounded text-sm">
            Configure chain-of-command →
          </Link>
        </div>
      </form>

      <h2 className="text-lg font-semibold mt-10">Members ({(members ?? []).length})</h2>
      <div className="mt-3 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(!members || members.length === 0) && (
              <tr><td colSpan={4} className="text-center py-6 text-neutral-500">No members.</td></tr>
            )}
            {(members ?? []).map((m) => (
              <tr key={`${m.user_id}:${m.role}`} className="border-t border-neutral-800">
                <td className="px-4 py-2">{m.full_name}</td>
                <td className="px-4 py-2 text-neutral-400">{m.email}</td>
                <td className="px-4 py-2">{m.role}</td>
                <td className="px-4 py-2">
                  <form action={removeDeptMemberAction}>
                    <input type="hidden" name="department_id" value={dept!.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-sm font-semibold mt-6">Add member</h3>
      <form action={addDeptMemberAction} className="mt-2 flex gap-2 max-w-xl">
        <input type="hidden" name="department_id" value={dept!.id} />
        <select name="user_id" className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
          {(users ?? []).map((u) => (
            <option key={u.id} value={u.id}>{u.full_name} — {u.email}</option>
          ))}
        </select>
        <select name="role" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
        <button className="text-xs px-3 py-2 border border-neutral-700 rounded hover:bg-neutral-800">Add</button>
      </form>

      <div className="mt-10 border-t border-neutral-800 pt-6">
        <form action={deleteDepartmentAction}>
          <input type="hidden" name="id" value={dept!.id} />
          <button className="text-xs text-red-400 hover:text-red-300">Permanently delete department</button>
        </form>
      </div>
    </div>
  );
}
