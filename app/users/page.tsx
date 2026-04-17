import { requireAdmin } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import {
  createUserAction,
  deactivateUserAction,
  importUsersCsvAction,
} from "@/app/actions";
import type { Camp, Department, Role, User } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

const POSITIONS: { v: string; l: string }[] = [
  { v: "", l: "— No position —" },
  { v: "admin", l: "Admin" },
  { v: "department_head", l: "Department Head" },
  { v: "manager", l: "Manager" },
  { v: "reviewer", l: "Reviewer" },
  { v: "reporter", l: "Reporter" },
  { v: "viewer", l: "Viewer" },
];

const CAMP_ROLES: { v: string; l: string }[] = [
  { v: "", l: "— None —" },
  { v: "camper", l: "Camper" },
  { v: "supervisor", l: "Supervisor" },
];

export default async function UsersPage() {
  await requireAdmin();
  const [users, departments, camps] = await Promise.all([
    apiMaybe<User[]>("/users"),
    apiMaybe<Department[]>("/departments"),
    apiMaybe<Camp[]>("/camps"),
  ]);
  const userList = users ?? [];
  const activeDepts = (departments ?? []).filter((d) => !d.is_archived);
  const campList = camps ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>

      <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Position</th>
              <th className="text-left px-4 py-2">Admin</th>
              <th className="text-left px-4 py-2">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {userList.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-neutral-500">No users yet.</td></tr>
            )}
            {userList.map((u) => (
              <tr
                key={u.id}
                className={`border-t border-neutral-800 ${u.is_active === false ? "opacity-50" : ""}`}
              >
                <td className="px-4 py-2">{u.full_name}</td>
                <td className="px-4 py-2 text-neutral-400">{u.email}</td>
                <td className="px-4 py-2 text-neutral-400">{u.position ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-neutral-400">
                  {u.is_admin ? "yes" : "—"}
                </td>
                <td className="px-4 py-2 text-xs">
                  {u.is_active !== false ? (
                    <span className="text-green-400">active</span>
                  ) : (
                    <span className="text-neutral-500">inactive</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {u.is_active !== false && (
                    <form action={deactivateUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="text-xs text-neutral-400 hover:text-white">Deactivate</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
        <div>
          <h2 className="text-lg font-semibold">Invite user</h2>
          <form action={createUserAction} className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input name="full_name" placeholder="Full name *" required className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
              <input name="email" type="email" placeholder="Email *" required className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
              <input name="password" placeholder="Temporary password *" required minLength={8} className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
              <div>
                <label className="text-xs text-neutral-400">Position (org role)</label>
                <select name="role" defaultValue="" className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2">
                  {POSITIONS.map((p) => (
                    <option key={p.v} value={p.v}>{p.l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400">Department</label>
                <select name="department_id" className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2">
                  <option value="">None</option>
                  {activeDepts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-600 mt-1">For dept roles (manager, reporter, etc.)</p>
              </div>
              <div>
                <label className="text-xs text-neutral-400">Camp Role</label>
                <select name="camp_role" defaultValue="" className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2">
                  {CAMP_ROLES.map((r) => (
                    <option key={r.v} value={r.v}>{r.l}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-neutral-400">Camp</label>
                <select name="camp_id" className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2">
                  <option value="">None</option>
                  {campList.map((c) => (
                    <option key={c.id} value={c.id}>{c.site_name} ({c.site_code})</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-600 mt-1">Required when Camp Role is Camper or Supervisor</p>
              </div>
            </div>

            <button className="w-full bg-white text-black font-medium rounded px-3 py-2">Invite</button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Bulk import (CSV)</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Headers: <code>full_name,email,position</code>
          </p>
          <form action={importUsersCsvAction} className="mt-3 space-y-2">
            <textarea
              name="csv"
              rows={6}
              placeholder={`full_name,email,position\nJane Doe,jane@acme.test,Engineer\nJohn Bloggs,john@acme.test,Analyst`}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 font-mono text-xs"
            />
            <button className="px-3 py-2 bg-white text-black font-medium rounded">Import</button>
          </form>
        </div>
      </div>
    </div>
  );
}
