"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlightHour, SAC16 } from "@/lib/types";

export default function SAC16Form({
  missionId,
  existing,
}: {
  missionId: string;
  existing: SAC16 | null;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(existing?.mission_description ?? "");
  const [hours, setHours] = useState<FlightHour[]>(
    existing?.flight_hours ?? [{ hour: 1, mission_order: "", report: "" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateHour = (i: number, patch: Partial<FlightHour>) =>
    setHours((h) => h.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addHour = () => {
    if (hours.length >= 7) return;
    setHours((h) => [...h, { hour: h.length + 1, mission_order: "", report: "" }]);
  };
  const removeHour = (i: number) =>
    setHours((h) => h.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, hour: idx + 1 })));

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sac", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId,
          form: "sac16",
          payload: { mission_description: description, flight_hours: hours },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error ${res.status}`);
      }
      router.push(`/missions/${missionId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="p-3 border border-red-800 bg-red-950/30 rounded text-sm text-red-300">{error}</div>
      )}

      <div>
        <label className="text-sm text-neutral-400">Mission Description</label>
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2" placeholder="Describe the drone mission objectives and scope…" />
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

      <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-white text-black font-medium rounded disabled:opacity-50">
        {saving ? "Saving…" : existing ? "Update SAC 16" : "Save SAC 16"}
      </button>
    </div>
  );
}
