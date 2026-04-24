"use client";

import { useEffect, useRef, useState } from "react";
import { createMissionAction } from "@/app/actions";

interface CampOption {
  id: string;
  site_name: string;
}

export default function CreateMissionPanel({
  camps,
}: {
  camps: CampOption[];
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  // Esc to close + body scroll lock + focus the first field on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Focus first field after mount
    setTimeout(() => firstFieldRef.current?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium hover:bg-neutral-200"
      >
        + New mission
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-mission-title"
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <div
            ref={dialogRef}
            className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl mt-12 sm:mt-0"
          >
            <div className="flex items-start justify-between p-5 border-b border-neutral-800">
              <div>
                <h2 id="new-mission-title" className="text-base font-semibold">
                  Create new mission
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Pick a camp, give it a unique mission number, then start filling
                  the SAC forms.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-neutral-500 hover:text-white text-lg leading-none px-2 -mt-1"
              >
                ✕
              </button>
            </div>

            <form action={createMissionAction} className="p-5 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-neutral-400">
                  Camp
                </label>
                <select
                  ref={firstFieldRef}
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
                <label className="text-xs uppercase tracking-wider text-neutral-400">
                  Mission number
                </label>
                <input
                  name="mission_number"
                  required
                  placeholder="e.g. MIS-001"
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm font-mono"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Must be unique within your organisation.
                </p>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-neutral-400">
                  Mission date
                </label>
                <input
                  name="mission_date"
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800 -mx-5 px-5 -mb-5 pb-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm border border-neutral-700 rounded hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm bg-white text-black font-medium rounded hover:bg-neutral-200"
                >
                  Create mission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
