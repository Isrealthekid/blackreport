import { requireAdmin } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { createClientAction, deleteClientAction } from "@/app/actions";
import type { Client } from "@/lib/types";

export default async function ClientsPage() {
  await requireAdmin();
  const clients = (await apiMaybe<Client[]>("/clients")) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Clients</h1>
      <p className="text-sm text-neutral-400 mt-1">Organisation-scoped client records for drone operations.</p>

      <div className="mt-6 space-y-3">
        {clients.length === 0 && <p className="text-neutral-500 text-sm">No clients yet.</p>}
        {clients.map((c) => (
          <div key={c.id} className="border border-neutral-800 rounded-lg p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-neutral-500 mt-1">
                {c.contact_name && <span>{c.contact_name} · </span>}
                {c.contact_email && <span>{c.contact_email} · </span>}
                {c.contact_phone && <span>{c.contact_phone}</span>}
              </div>
              {c.notes && <div className="text-xs text-neutral-500 mt-1">{c.notes}</div>}
            </div>
            <form action={deleteClientAction}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
            </form>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-10">Add client</h2>
      <form action={createClientAction} className="mt-3 grid grid-cols-2 gap-3 max-w-2xl">
        <input name="name" placeholder="Client name" required className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 col-span-2" />
        <input name="contact_name" placeholder="Contact name" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        <input name="contact_email" type="email" placeholder="Contact email" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        <input name="contact_phone" placeholder="Contact phone" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        <input name="notes" placeholder="Notes" className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2" />
        <button className="col-span-2 bg-white text-black font-medium rounded px-3 py-2">Create client</button>
      </form>
    </div>
  );
}
