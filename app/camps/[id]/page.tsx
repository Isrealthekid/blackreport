import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { addCampMemberAction, deleteCampAction, removeCampMemberAction, updateCampAction } from "@/app/actions";
import BackButton from "@/components/BackButton";
import type { Camp, User } from "@/lib/types";

export default async function CampDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [camp, users] = await Promise.all([
    apiMaybe<Camp>(`/camps/${id}`),
    apiMaybe<User[]>("/users"),
  ]);
  if (!camp) notFound();
  const members = camp.members ?? [];

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

          <div className="mt-10 border-t border-neutral-800 pt-6">
            <form action={deleteCampAction}>
              <input type="hidden" name="id" value={camp.id} />
              <button className="text-xs text-red-400 hover:text-red-300">Delete camp permanently</button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
