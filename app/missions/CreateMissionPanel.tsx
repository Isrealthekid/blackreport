"use client";

import { useState } from "react";
import { createMissionAction } from "@/app/actions";

interface CampOption {
  id: string;
  site_name: string;
}

export default function CreateMissionPanel({
  camps,
  defaultOpen = false,
}: {
  camps: CampOption[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (camps.length === 0) {
    return (
      <button
        type="button"
        disabled
        title="You're not assigned to any camp yet."
        className="px-3 py-1.5 bg-neutral-900 text-neutral-500 rounded text-sm font-medium cursor-not-allowed border border-neutral-800"
      >
        + New mission
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium hover:bg-neutral-200"
      >
        + New mission
      </button>
    );
  }

  return (
    <div className="w-full mt-4 border border-neutral-800 bg-neutral-950 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Create new mission</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-neutral-500 hover:text-white text-sm leading-none px-1"
        >
          ✕
        </button>
      </div>
      <form
        action={createMissionAction}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        <div>
          <label className="text-xs text-neutral-400">Camp</label>
          <select
            name="camp_id"
            required
            defaultValue={camps[0]?.id ?? ""}
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select camp…
            </option>
            {camps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.site_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-400">Mission #</label>
          <input
            name="mission_number"
            required
            placeholder="e.g. MIS-001"
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Mission date</label>
          <input
            name="mission_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-3 flex justify-end">
          <button className="bg-white text-black font-medium rounded px-4 py-2 text-sm hover:bg-neutral-200">
            Create mission
          </button>
        </div>
      </form>
    </div>
  );
}
