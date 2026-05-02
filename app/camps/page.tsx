import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import { createCampAction } from "@/app/actions";
import type { Camp, Client } from "@/lib/types";

export default async function CampsPage() {
  const user = await requireUser();
  const [campsRaw, clientsRaw] = await Promise.all([
    apiMaybe<unknown>("/camps?limit=200"),
    apiMaybe<unknown>("/clients?limit=200"),
  ]);
  const list = extractItems<Camp>(campsRaw);
  const clientList = extractItems<Client>(clientsRaw);

  return (
    <div>
      <h1 className="text-2xl font-bold">Camps</h1>
      <p className="text-sm text-neutral-400 mt-1">Drone operation sites.</p>

      <div className="mt-6 space-y-3">
        {list.length === 0 && <p className="text-neutral-500 text-sm">No camps yet.</p>}
        {list.map((c) => (
          <Link
            key={c.id}
            href={`/camps/${c.id}`}
            className="block border border-neutral-800 hover:border-neutral-600 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{c.site_name}</div>
                <div className="text-xs text-neutral-500 mt-1">
                  Code: {c.site_code}
                  {c.client_name && ` · Client: ${c.client_name}`}
                  {c.state && ` · ${c.state}`}
                </div>
                {c.address && <div className="text-xs text-neutral-500 mt-0.5">{c.address}</div>}
              </div>
              {c.latitude && c.longitude && (
                <div className="text-xs text-neutral-600">{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {user.is_admin && (
        <>
          <h2 className="text-lg font-semibold mt-10">Add camp</h2>
          <form action={createCampAction} className="mt-3 grid grid-cols-2 gap-3 max-w-2xl">
            <div className="col-span-2">
              <label className="text-sm text-neutral-400">Client</label>
              <select name="client_id" required className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2">
                <option value="">Select client…</option>
                {clientList.map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </select>
            </div>
            <input name="site_name" placeholder="Site name" required className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <input name="site_code" placeholder="Site code (unique)" required className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <input name="state" placeholder="State" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <input name="address" placeholder="Address" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <input name="latitude" type="number" step="any" placeholder="Latitude" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <input name="longitude" type="number" step="any" placeholder="Longitude" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
            <button className="col-span-2 bg-white text-black font-medium rounded px-3 py-2">Create camp</button>
          </form>
        </>
      )}
    </div>
  );
}
