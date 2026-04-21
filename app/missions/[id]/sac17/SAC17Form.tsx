"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MissionMap from "@/components/MissionMap";

function toRFC3339(v: string): string | undefined {
  if (!v) return undefined;
  if (v.includes("Z") || v.includes("+")) return v;
  return `${v}:00Z`.replace("T", "T");
}

export default function SAC17Form({
  missionId,
  existing,
}: {
  missionId: string;
  existing: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const e = existing ?? {};
  const otherPersons = (e.other_persons as Record<string, string> | undefined) ?? {};
  const observersArr = (e.observers as { name: string; contact: string }[] | undefined) ?? [];

  const [data, setData] = useState({
    mission_initiator_name: (e.mission_initiator_name as string) ?? "",
    mission_initiator_contact: (e.mission_initiator_contact as string) ?? "",
    unit_details: (e.unit_details as string) ?? "",
    remote_pilot_name: (e.remote_pilot_name as string) ?? "",
    remote_pilot_contact: (e.remote_pilot_contact as string) ?? "",
    remote_pilot_flyer_id: (e.remote_pilot_flyer_id as string) ?? "",
    observers_text: observersArr.map((o) => `${o.name}|${o.contact}`).join("\n"),
    other_military: otherPersons.military ?? "",
    other_civilian: otherPersons.civilian ?? "",
    other_agency: otherPersons.other_agency ?? "",
    takeoff_latitude: e.takeoff_latitude != null ? String(e.takeoff_latitude) : "",
    takeoff_longitude: e.takeoff_longitude != null ? String(e.takeoff_longitude) : "",
    landing_latitude: e.landing_latitude != null ? String(e.landing_latitude) : "",
    landing_longitude: e.landing_longitude != null ? String(e.landing_longitude) : "",
    date_from: (e.date_from as string) ?? "",
    date_to: (e.date_to as string) ?? "",
    times_notes: (e.times_notes as string) ?? "",
    permission_required: (e.permission_required as boolean) ?? false,
    permission_notes: (e.permission_notes as string) ?? "",
    mission_type: (e.mission_type as string) ?? "",
    flight_count: (e.flight_count as number) ?? 0,
    flight_duration: (e.flight_duration as string) ?? "",
    flight_id: (e.flight_id as string) ?? "",
    uav_model: (e.uav_model as string) ?? "",
    uav_serial: (e.uav_serial as string) ?? "",
    payload_requirements: (e.payload_requirements as string) ?? "",
    detailed_mission_report: (e.detailed_mission_report as string) ?? "",
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    (e.pre_flight_checklist as Record<string, boolean>) ?? {},
  );
  const [checklistKey, setChecklistKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    const observers = data.observers_text
      .split("\n").map((l) => l.trim()).filter(Boolean)
      .map((l) => {
        const [name, contact] = l.split("|");
        return { name: name?.trim() ?? "", contact: contact?.trim() ?? "" };
      });

    const payload: Record<string, unknown> = {
      mission_initiator_name: data.mission_initiator_name || undefined,
      mission_initiator_contact: data.mission_initiator_contact || undefined,
      unit_details: data.unit_details || undefined,
      remote_pilot_name: data.remote_pilot_name || undefined,
      remote_pilot_contact: data.remote_pilot_contact || undefined,
      remote_pilot_flyer_id: data.remote_pilot_flyer_id || undefined,
      pre_flight_checklist: Object.keys(checklist).length > 0 ? checklist : undefined,
      observers: observers.length > 0 ? observers : undefined,
      other_persons: {
        military: data.other_military || "",
        civilian: data.other_civilian || "",
        other_agency: data.other_agency || "",
      },
      takeoff_latitude: data.takeoff_latitude !== "" ? Number(data.takeoff_latitude) : undefined,
      takeoff_longitude: data.takeoff_longitude !== "" ? Number(data.takeoff_longitude) : undefined,
      landing_latitude: data.landing_latitude !== "" ? Number(data.landing_latitude) : undefined,
      landing_longitude: data.landing_longitude !== "" ? Number(data.landing_longitude) : undefined,
      date_from: toRFC3339(data.date_from),
      date_to: toRFC3339(data.date_to),
      times_notes: data.times_notes || undefined,
      permission_required: data.permission_required,
      permission_notes: data.permission_notes || undefined,
      mission_type: data.mission_type || undefined,
      flight_count: Number(data.flight_count) || undefined,
      flight_duration: data.flight_duration || undefined,
      flight_id: data.flight_id || undefined,
      uav_model: data.uav_model || undefined,
      uav_serial: data.uav_serial || undefined,
      payload_requirements: data.payload_requirements || undefined,
      detailed_mission_report: data.detailed_mission_report || undefined,
    };

    // Strip undefined keys so the JSON is clean.
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined),
    );

    try {
      const res = await fetch("/api/sac", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId, form: "sac17", payload: clean }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error ${res.status}`);
      }
      router.push(`/missions/${missionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const input = "mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm";

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="p-3 border border-red-800 bg-red-950/30 rounded text-sm text-red-300">{error}</div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Mission Initiator</h3>
        <div className="grid grid-cols-2 gap-3">
          <Inp label="Name" value={data.mission_initiator_name} onChange={(v) => set("mission_initiator_name", v)} className={input} />
          <Inp label="Contact" value={data.mission_initiator_contact} onChange={(v) => set("mission_initiator_contact", v)} className={input} />
          <Inp label="Unit Details" value={data.unit_details} onChange={(v) => set("unit_details", v)} className={input + " col-span-2"} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Remote Pilot</h3>
        <div className="grid grid-cols-3 gap-3">
          <Inp label="Name" value={data.remote_pilot_name} onChange={(v) => set("remote_pilot_name", v)} className={input} />
          <Inp label="Contact" value={data.remote_pilot_contact} onChange={(v) => set("remote_pilot_contact", v)} className={input} />
          <Inp label="Flyer ID" value={data.remote_pilot_flyer_id} onChange={(v) => set("remote_pilot_flyer_id", v)} className={input} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Pre-flight Checklist</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(checklist).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1 text-xs border border-neutral-800 rounded px-2 py-1">
              <input type="checkbox" checked={v} onChange={(ev) => setChecklist((c) => ({ ...c, [k]: ev.target.checked }))} />
              {k.replace(/_/g, " ")}
            </label>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input placeholder="Add item (e.g. props_secure)" value={checklistKey} onChange={(ev) => setChecklistKey(ev.target.value)} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs flex-1" />
          <button type="button" onClick={() => { if (checklistKey) { setChecklist((c) => ({ ...c, [checklistKey]: true })); setChecklistKey(""); } }} className="text-xs px-2 py-1 border border-neutral-700 rounded">+</button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Observers</h3>
        <textarea rows={3} value={data.observers_text} onChange={(ev) => set("observers_text", ev.target.value)} placeholder="Name|Contact (one per line)" className={input} />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Other Persons on Site</h3>
        <div className="grid grid-cols-3 gap-3">
          <Inp label="Military" value={data.other_military} onChange={(v) => set("other_military", v)} className={input} />
          <Inp label="Civilian" value={data.other_civilian} onChange={(v) => set("other_civilian", v)} className={input} />
          <Inp label="Other Agency" value={data.other_agency} onChange={(v) => set("other_agency", v)} className={input} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Coordinates &amp; Dates</h3>
        <div className="grid grid-cols-2 gap-3">
          <Inp label="Take-off Lat" value={String(data.takeoff_latitude)} onChange={(v) => set("takeoff_latitude", v)} className={input} type="number" />
          <Inp label="Take-off Long" value={String(data.takeoff_longitude)} onChange={(v) => set("takeoff_longitude", v)} className={input} type="number" />
          <Inp label="Landing Lat" value={String(data.landing_latitude)} onChange={(v) => set("landing_latitude", v)} className={input} type="number" />
          <Inp label="Landing Long" value={String(data.landing_longitude)} onChange={(v) => set("landing_longitude", v)} className={input} type="number" />
          <Inp label="Date From" value={data.date_from} onChange={(v) => set("date_from", v)} className={input} type="datetime-local" />
          <Inp label="Date To" value={data.date_to} onChange={(v) => set("date_to", v)} className={input} type="datetime-local" />
          <Inp label="Times/Notes" value={data.times_notes} onChange={(v) => set("times_notes", v)} className={input + " col-span-2"} />
        </div>
        <div className="col-span-2 mt-3">
          <MissionMap
            startLat={data.takeoff_latitude}
            startLng={data.takeoff_longitude}
            endLat={data.landing_latitude}
            endLng={data.landing_longitude}
            radius={500}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Permission &amp; Flight</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={data.permission_required} onChange={(ev) => set("permission_required", ev.target.checked)} />
            <span className="text-neutral-400">Permission required</span>
          </div>
          <Inp label="Permission Notes" value={data.permission_notes} onChange={(v) => set("permission_notes", v)} className={input} />
          <Inp label="Mission Type" value={data.mission_type} onChange={(v) => set("mission_type", v)} className={input} />
          <Inp label="Flight ID" value={data.flight_id} onChange={(v) => set("flight_id", v)} className={input} />
          <Inp label="Flight Count" value={String(data.flight_count)} onChange={(v) => set("flight_count", Number(v))} className={input} type="number" />
          <Inp label="Flight Duration" value={data.flight_duration} onChange={(v) => set("flight_duration", v)} className={input} />
          <Inp label="UAV Model" value={data.uav_model} onChange={(v) => set("uav_model", v)} className={input} />
          <Inp label="UAV Serial" value={data.uav_serial} onChange={(v) => set("uav_serial", v)} className={input} />
          <Inp label="Payload Requirements" value={data.payload_requirements} onChange={(v) => set("payload_requirements", v)} className={input + " col-span-2"} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Detailed Mission Report</h3>
        <textarea rows={8} value={data.detailed_mission_report} onChange={(ev) => set("detailed_mission_report", ev.target.value)} className={input} />
      </section>

      <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-white text-black font-medium rounded disabled:opacity-50">
        {saving ? "Saving…" : existing ? "Update SAC 17" : "Save SAC 17"}
      </button>
    </div>
  );
}

function Inp({ label, value, onChange, className, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; className: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-neutral-400">{label}</label>
      <input type={type} step={type === "number" ? "any" : undefined} value={value} onChange={(e) => onChange(e.target.value)} className={className} />
    </div>
  );
}
