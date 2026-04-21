"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SAC18, SAC18ChecklistItem, SAC18OverflownEntry, SAC18RiskRow } from "@/lib/types";

const emptyRiskRow = (): SAC18RiskRow => ({
  something_seen: "", who_harmed: "", what_you_did: "", further_actions: "", action_by: "",
});
const emptyOverflown = (): SAC18OverflownEntry => ({
  name: "", contact_details: "", permission_given: "NO",
});

export default function SAC18Form({
  missionId, existing, checklistKeys,
}: {
  missionId: string; existing: SAC18 | null; checklistKeys: string[];
}) {
  const router = useRouter();
  const e: Partial<SAC18> = existing ?? {};
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeKeys = Array.isArray(checklistKeys) ? checklistKeys : [];
  const [checklist, setChecklist] = useState<Record<string, SAC18ChecklistItem>>(() => {
    const base: Record<string, SAC18ChecklistItem> = {};
    for (const key of safeKeys) base[key] = e.risk_checklist?.[key] ?? { value: "YES", notes: "" };
    return base;
  });
  const [riskTable, setRiskTable] = useState<SAC18RiskRow[]>(e.risk_table ?? [emptyRiskRow()]);
  const [sites, setSites] = useState<SAC18OverflownEntry[]>(e.overflown_sites ?? []);
  const [areas, setAreas] = useState<SAC18OverflownEntry[]>(e.overflown_areas ?? []);
  const [atzs, setAtzs] = useState<SAC18OverflownEntry[]>(e.overflown_atzs ?? []);
  const [post, setPost] = useState({
    rp_observations: e.rp_observations ?? "",
    pre_flight_checks_by: e.pre_flight_checks_by ?? "",
    pre_flight_checks_at: e.pre_flight_checks_at ?? "",
    permissions_given: e.permissions_given ?? "YES",
    permissions_at: e.permissions_at ?? "",
    pre_flight_briefing_by: e.pre_flight_briefing_by ?? "",
    pre_flight_briefing_at: e.pre_flight_briefing_at ?? "",
    num_flights: e.num_flights ?? 0,
    flight_durations: e.flight_durations ?? "",
    any_incidents: e.any_incidents ?? false,
    incident_notes: e.incident_notes ?? "",
    issues_or_alerts: e.issues_or_alerts ?? "",
    further_action_required: e.further_action_required ?? "",
    other_information: e.other_information ?? "",
  });
  const setP = (k: string, v: unknown) => setPost((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    // Convert datetime-local ("2026-04-17T07:30") → RFC3339 ("2026-04-17T07:30:00Z")
    const toRFC = (v: string): string | undefined => {
      if (!v) return undefined;
      if (v.includes("Z") || v.includes("+")) return v;
      // "2026-04-17T07:30" → "2026-04-17T07:30:00Z"
      const parts = v.split("T");
      if (parts.length === 2) {
        const time = parts[1].length <= 5 ? `${parts[1]}:00Z` : `${parts[1]}Z`;
        return `${parts[0]}T${time}`;
      }
      return `${v}T00:00:00Z`;
    };

    // Build a clean payload — omit empty strings so the API doesn't reject them.
    const raw: Record<string, unknown> = {
      risk_checklist: Object.keys(checklist).length > 0 ? checklist : undefined,
      risk_table: riskTable.length > 0 ? riskTable : undefined,
      overflown_sites: sites.length > 0 ? sites : undefined,
      overflown_areas: areas.length > 0 ? areas : undefined,
      overflown_atzs: atzs.length > 0 ? atzs : undefined,
      rp_observations: post.rp_observations || undefined,
      pre_flight_checks_by: post.pre_flight_checks_by || undefined,
      pre_flight_checks_at: toRFC(post.pre_flight_checks_at),
      permissions_given: post.permissions_given || undefined,
      permissions_at: toRFC(post.permissions_at),
      pre_flight_briefing_by: post.pre_flight_briefing_by || undefined,
      pre_flight_briefing_at: toRFC(post.pre_flight_briefing_at),
      num_flights: post.num_flights || undefined,
      flight_durations: post.flight_durations || undefined,
      any_incidents: post.any_incidents,
      incident_notes: post.incident_notes || undefined,
      issues_or_alerts: post.issues_or_alerts || undefined,
      further_action_required: post.further_action_required || undefined,
      other_information: post.other_information || undefined,
    };

    const payload = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined),
    );

    try {
      const res = await fetch("/api/sac", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId, form: "sac18", payload }),
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

  const input = "w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm";

  return (
    <div className="mt-6 space-y-8">
      {error && <div className="p-3 border border-red-800 bg-red-950/30 rounded text-sm text-red-300">{error}</div>}

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Risk Checklist</h3>
        <div className="space-y-2">
          {safeKeys.map((key) => (
            <div key={key} className="border border-neutral-800 rounded p-2 flex flex-wrap gap-2 items-center">
              <span className="text-sm flex-1 min-w-48">{key.replace(/_/g, " ")}</span>
              <select value={checklist[key]?.value ?? "YES"} onChange={(ev) => setChecklist((c) => ({ ...c, [key]: { ...c[key], value: ev.target.value as "YES" | "N/A" } }))} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs w-20">
                <option value="YES">YES</option><option value="N/A">N/A</option>
              </select>
              <input placeholder="Notes" value={checklist[key]?.notes ?? ""} onChange={(ev) => setChecklist((c) => ({ ...c, [key]: { ...c[key], notes: ev.target.value } }))} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs flex-1 min-w-32" />
            </div>
          ))}
          {safeKeys.length === 0 && <p className="text-neutral-500 text-xs">No checklist keys from API.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Risk Table</h3>
        <div className="space-y-2">
          {riskTable.map((r, i) => (
            <div key={i} className="border border-neutral-800 rounded p-2 grid grid-cols-6 gap-2">
              {(["something_seen","who_harmed","what_you_did","further_actions","action_by"] as const).map((k) => (
                <input key={k} placeholder={k.replace(/_/g," ")} value={r[k]} onChange={(ev) => { const c = [...riskTable]; c[i] = { ...c[i], [k]: ev.target.value }; setRiskTable(c); }} className={input} />
              ))}
              <button type="button" onClick={() => setRiskTable((t) => t.filter((_, j) => j !== i))} className="text-red-400 text-xs">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRiskTable((t) => [...t, emptyRiskRow()])} className="mt-2 text-xs px-3 py-1 border border-neutral-700 rounded">+ Row</button>
      </section>

      {(["sites","areas","atzs"] as const).map((section) => {
        const arr = section === "sites" ? sites : section === "areas" ? areas : atzs;
        const setArr = section === "sites" ? setSites : section === "areas" ? setAreas : setAtzs;
        return (
          <section key={section}>
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Overflown {section}</h3>
            <div className="space-y-2">
              {arr.map((entry, i) => (
                <div key={i} className="border border-neutral-800 rounded p-2 grid grid-cols-4 gap-2">
                  <input placeholder="Name" value={entry.name} onChange={(ev) => { const c = [...arr]; c[i] = { ...c[i], name: ev.target.value }; setArr(c); }} className={input} />
                  <input placeholder="Contact" value={entry.contact_details} onChange={(ev) => { const c = [...arr]; c[i] = { ...c[i], contact_details: ev.target.value }; setArr(c); }} className={input} />
                  <select value={entry.permission_given} onChange={(ev) => { const c = [...arr]; c[i] = { ...c[i], permission_given: ev.target.value as "YES"|"NO"|"NA" }; setArr(c); }} className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs">
                    <option value="YES">YES</option><option value="NO">NO</option><option value="NA">N/A</option>
                  </select>
                  <button type="button" onClick={() => setArr((a) => a.filter((_, j) => j !== i))} className="text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setArr((a) => [...a, emptyOverflown()])} className="mt-2 text-xs px-3 py-1 border border-neutral-700 rounded">+ Add</button>
          </section>
        );
      })}

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Onsite &amp; Pre-flight</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-neutral-400">RP Observations</label><textarea rows={2} value={post.rp_observations} onChange={(ev) => setP("rp_observations", ev.target.value)} className={input} /></div>
          <div><label className="text-xs text-neutral-400">Pre-flight Checks By</label><input value={post.pre_flight_checks_by} onChange={(ev) => setP("pre_flight_checks_by", ev.target.value)} className={input} /></div>
          <div><label className="text-xs text-neutral-400">Checks At</label><input type="datetime-local" value={post.pre_flight_checks_at} onChange={(ev) => setP("pre_flight_checks_at", ev.target.value)} className={input} /></div>
          <div><label className="text-xs text-neutral-400">Permissions Given</label><select value={post.permissions_given} onChange={(ev) => setP("permissions_given", ev.target.value)} className={"bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm w-full"}><option value="YES">YES</option><option value="NO">NO</option></select></div>
          <div><label className="text-xs text-neutral-400">Permissions At</label><input type="datetime-local" value={post.permissions_at} onChange={(ev) => setP("permissions_at", ev.target.value)} className={input} /></div>
          <div><label className="text-xs text-neutral-400">Briefing By</label><input value={post.pre_flight_briefing_by} onChange={(ev) => setP("pre_flight_briefing_by", ev.target.value)} className={input} /></div>
          <div><label className="text-xs text-neutral-400">Briefing At</label><input type="datetime-local" value={post.pre_flight_briefing_at} onChange={(ev) => setP("pre_flight_briefing_at", ev.target.value)} className={input} /></div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-3">Post-flight</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-neutral-400">Num Flights</label><input type="number" value={post.num_flights} onChange={(ev) => setP("num_flights", Number(ev.target.value))} className={input} /></div>
          <div><label className="text-xs text-neutral-400">Durations</label><input value={post.flight_durations} onChange={(ev) => setP("flight_durations", ev.target.value)} className={input} /></div>
          <div className="col-span-2"><label className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" checked={post.any_incidents} onChange={(ev) => setP("any_incidents", ev.target.checked)} /> Any incidents?</label></div>
          {post.any_incidents && <div className="col-span-2"><label className="text-xs text-neutral-400">Incident Notes</label><textarea rows={2} value={post.incident_notes} onChange={(ev) => setP("incident_notes", ev.target.value)} className={input} /></div>}
          <div className="col-span-2"><label className="text-xs text-neutral-400">Issues or Alerts</label><textarea rows={2} value={post.issues_or_alerts} onChange={(ev) => setP("issues_or_alerts", ev.target.value)} className={input} /></div>
          <div className="col-span-2"><label className="text-xs text-neutral-400">Further Action</label><input value={post.further_action_required} onChange={(ev) => setP("further_action_required", ev.target.value)} className={input} /></div>
          <div className="col-span-2"><label className="text-xs text-neutral-400">Other Info</label><textarea rows={2} value={post.other_information} onChange={(ev) => setP("other_information", ev.target.value)} className={input} /></div>
        </div>
      </section>

      <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-white text-black font-medium rounded disabled:opacity-50">
        {saving ? "Saving…" : existing ? "Update SAC 18" : "Save SAC 18"}
      </button>
    </div>
  );
}
