"use client";

import { useState, useRef } from "react";
import { saveSAC16Action } from "@/app/actions";
import type { FlightHour, SAC16 } from "@/lib/types";

export default function SAC16Form({
  missionId,
  existing,
}: {
  missionId: string;
  existing: SAC16 | null;
}) {
  const [description, setDescription] = useState(existing?.mission_description ?? "");
  const [hours, setHours] = useState<FlightHour[]>(
    existing?.flight_hours ?? [{ hour: 1, mission_order: "", report: "" }],
  );
  const formRef = useRef<HTMLFormElement>(null);
  const payloadRef = useRef<HTMLInputElement>(null);

  const updateHour = (i: number, patch: Partial<FlightHour>) =>
    setHours((h) => h.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addHour = () => {
    if (hours.length >= 7) return;
    setHours((h) => [...h, { hour: h.length + 1, mission_order: "", report: "" }]);
  };
  const removeHour = (i: number) =>
    setHours((h) => h.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, hour: idx + 1 })));

  const handleSubmit = () => {
    if (payloadRef.current) {
      payloadRef.current.value = JSON.stringify({
        mission_description: description,
        flight_hours: hours,
      });
    }
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={saveSAC16Action} className="mt-6 space-y-6">
      <input type="hidden" name="mission_id" value={missionId} />
      <input type="hidden" name="payload" ref={payloadRef} defaultValue="{}" />

      <div>
        <label className="text-sm text-neutral-400">Mission Description</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          placeholder="Describe the drone mission objectives and scope…"
        />
      </div>

      <div>
        <label className="text-sm text-neutral-400">Flight Hours (up to 7)</label>
        <div className="mt-2 space-y-2">
          {hours.map((h, i) => (
            <div key={i} className="border border-neutral-800 rounded p-3 grid grid-cols-12 gap-2 items-start">
              <div className="col-span-1 text-center text-neutral-500 text-sm pt-2">Hr {h.hour}</div>
              <div className="col-span-5">
                <input placeholder="Mission order" value={h.mission_order} onChange={(e) => updateHour(i, { mission_order: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm" />
              </div>
              <div className="col-span-5">
                <input placeholder="Report / observations" value={h.report} onChange={(e) => updateHour(i, { report: e.target.value })} className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm" />
              </div>
              <button type="button" onClick={() => removeHour(i)} className="col-span-1 text-red-400 text-sm pt-1">✕</button>
            </div>
          ))}
        </div>
        {hours.length < 7 && (
          <button type="button" onClick={addHour} className="mt-2 text-xs px-3 py-1 border border-neutral-700 rounded">+ Add flight hour</button>
        )}
      </div>

      <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-white text-black font-medium rounded">
        {existing ? "Update SAC 16" : "Save SAC 16"}
      </button>
    </form>
  );
}
