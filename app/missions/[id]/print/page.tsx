import { notFound } from "next/navigation";
import { requireUser, getOrganisation } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Camp, Mission, User } from "@/lib/types";
import PrintButton from "./PrintButton";
import MissionMap from "@/components/MissionMap";

export const metadata = { title: "Mission — Print" };

function Field({ label, val }: { label: string; val: unknown }) {
  if (val == null || val === "" || val === 0) return null;
  return (
    <div className="mb-1">
      <span className="text-xs uppercase text-neutral-600">{label}: </span>
      <span className="text-sm">{String(val)}</span>
    </div>
  );
}

function fmtUTC(v: unknown): string | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}

export default async function MissionPrint({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [mission, org] = await Promise.all([
    apiMaybe<Mission>(`/missions/${id}`),
    getOrganisation(),
  ]);
  if (!mission) notFound();

  const [camp, sac16, sac17, sac18, users] = await Promise.all([
    apiMaybe<Camp>(`/camps/${mission.camp_id}`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac16`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac17`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac18`),
    apiMaybe<User[]>("/users"),
  ]);

  const camperName = mission.created_by
    ? camp?.members?.find((m) => m.user_id === mission.created_by)?.full_name
      ?? users?.find((u) => u.id === mission.created_by)?.full_name
      ?? mission.created_by.slice(0, 8)
    : null;

  const hours = (sac16?.flight_hours as Array<{ hour: number; mission_order: string; report: string }>) ?? [];
  const observers = (sac17?.observers as Array<{ name: string; contact: string }>) ?? [];
  const otherPersons = (sac17?.other_persons as Record<string, string>) ?? {};
  const preFlightChecklist = (sac17?.pre_flight_checklist as Record<string, boolean>) ?? {};
  const riskChecklist = (sac18?.risk_checklist as Record<string, { value: string; notes?: string }>) ?? {};
  const riskTable = (sac18?.risk_table as Array<{ something_seen: string; who_harmed: string; what_you_did: string; further_actions: string; action_by: string }>) ?? [];
  const overflownSites = (sac18?.overflown_sites as Array<{ name: string; contact_details: string; permission_given: string }>) ?? [];
  const overflownAreas = (sac18?.overflown_areas as Array<{ name: string; contact_details: string; permission_given: string }>) ?? [];
  const overflownAtzs = (sac18?.overflown_atzs as Array<{ name: string; contact_details: string; permission_given: string }>) ?? [];

  const signatures: { label: string; id: string }[] = [];
  if (sac16?.signoff_signature_id) signatures.push({ label: "SAC 16 Signoff", id: String(sac16.signoff_signature_id) });
  if (sac18?.rp_signature_id) signatures.push({ label: "RP Signature", id: String(sac18.rp_signature_id) });
  if (sac18?.supervisor_signature_id) signatures.push({ label: "Supervisor Signature", id: String(sac18.supervisor_signature_id) });
  if (sac18?.post_rp_signature_id) signatures.push({ label: "Post-flight RP", id: String(sac18.post_rp_signature_id) });
  if (sac18?.post_supervisor_signature_id) signatures.push({ label: "Post-flight Supervisor", id: String(sac18.post_supervisor_signature_id) });

  const tCell = "border border-neutral-300 px-2 py-1";

  return (
    <div className="printable bg-white text-black font-serif max-w-3xl mx-auto p-8 rounded shadow-lg">
      <div className="flex justify-end print:hidden mb-4">
        <PrintButton />
      </div>

      <header className="border-b-2 border-black pb-3 mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-600">{org?.name ?? "Black Report"}</div>
        {camperName && (
          <div className="text-sm font-semibold text-neutral-800">Camper: {camperName}</div>
        )}
        <h1 className="text-2xl font-bold">Mission {mission.mission_number}</h1>
        <div className="text-sm text-neutral-700">
          {camp?.site_name} · {mission.mission_date} · Status: {mission.status}
        </div>
      </header>

      {/* ════════ SAC 16 ════════ */}
      {sac16 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-neutral-300 pb-1 mb-3">SAC 16 — Drone Mission Report</h2>
          <div className="mb-3">
            <div className="text-xs uppercase text-neutral-600">Mission Description</div>
            <div className="text-sm whitespace-pre-wrap mt-1">{String(sac16.mission_description ?? "—")}</div>
          </div>
          {hours.length > 0 && (
            <table className="w-full text-sm border border-neutral-300">
              <thead><tr className="bg-neutral-100">
                <th className={`${tCell} text-left`}>Hour</th>
                <th className={`${tCell} text-left`}>Mission Order</th>
                <th className={`${tCell} text-left`}>Report</th>
              </tr></thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.hour}>
                    <td className={tCell}>{h.hour}</td>
                    <td className={tCell}>{h.mission_order}</td>
                    <td className={tCell}>{h.report}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Field label="Signed off by" val={sac16.signed_off_by} />
          <Field label="Signed off at" val={fmtUTC(sac16.signed_off_at)} />
        </section>
      )}

      {/* ════════ SAC 17 ════════ */}
      {sac17 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-neutral-300 pb-1 mb-3">SAC 17 — Mission Plan &amp; Risk Assessment</h2>

          <h3 className="text-sm font-bold mt-3 mb-1">Mission Initiator</h3>
          <Field label="Name" val={sac17.mission_initiator_name} />
          <Field label="Contact" val={sac17.mission_initiator_contact} />
          <Field label="Unit" val={sac17.unit_details} />

          <h3 className="text-sm font-bold mt-3 mb-1">Remote Pilot</h3>
          <Field label="Name" val={sac17.remote_pilot_name} />
          <Field label="Contact" val={sac17.remote_pilot_contact} />
          <Field label="Flyer ID" val={sac17.remote_pilot_flyer_id} />

          {Object.keys(preFlightChecklist).length > 0 && (
            <>
              <h3 className="text-sm font-bold mt-3 mb-1">Pre-flight Checklist</h3>
              <div className="text-sm">
                {Object.entries(preFlightChecklist).map(([k, v]) => (
                  <span key={k} className="inline-block mr-3 mb-1">
                    {v ? "✓" : "✗"} {k.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </>
          )}

          {observers.length > 0 && (
            <>
              <h3 className="text-sm font-bold mt-3 mb-1">Observers</h3>
              <table className="w-full text-xs border border-neutral-300 mb-2">
                <thead><tr className="bg-neutral-100">
                  <th className={`${tCell} text-left`}>Name</th>
                  <th className={`${tCell} text-left`}>Contact</th>
                </tr></thead>
                <tbody>
                  {observers.map((o, i) => (
                    <tr key={i}><td className={tCell}>{o.name}</td><td className={tCell}>{o.contact}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h3 className="text-sm font-bold mt-3 mb-1">Other Persons on Site</h3>
          <Field label="Military" val={otherPersons.military} />
          <Field label="Civilian" val={otherPersons.civilian} />
          <Field label="Other Agency" val={otherPersons.other_agency} />

          <h3 className="text-sm font-bold mt-3 mb-1">Coordinates &amp; Dates</h3>
          <Field label="Take-off" val={sac17.takeoff_latitude != null ? `${sac17.takeoff_latitude}, ${sac17.takeoff_longitude}` : null} />
          <Field label="Landing" val={sac17.landing_latitude != null ? `${sac17.landing_latitude}, ${sac17.landing_longitude}` : null} />
          <Field label="Date From" val={fmtUTC(sac17.date_from)} />
          <Field label="Date To" val={fmtUTC(sac17.date_to)} />
          <Field label="Times / Notes" val={sac17.times_notes} />
          {sac17.takeoff_latitude != null &&
            sac17.takeoff_longitude != null &&
            sac17.landing_latitude != null &&
            sac17.landing_longitude != null && (
              <div className="mt-2 mission-map-print">
                <MissionMap
                  startLat={sac17.takeoff_latitude as number}
                  startLng={sac17.takeoff_longitude as number}
                  endLat={sac17.landing_latitude as number}
                  endLng={sac17.landing_longitude as number}
                  radius={500}
                  height="18rem"
                  readOnly
                />
              </div>
            )}

          <h3 className="text-sm font-bold mt-3 mb-1">Permission &amp; Flight</h3>
          <Field label="Permission Required" val={sac17.permission_required ? "Yes" : "No"} />
          <Field label="Permission Notes" val={sac17.permission_notes} />
          <Field label="Mission Type" val={sac17.mission_type} />
          <Field label="Flight ID" val={sac17.flight_id} />
          <Field label="Flight Count" val={sac17.flight_count} />
          <Field label="Flight Duration" val={sac17.flight_duration} />
          <Field label="UAV Model" val={sac17.uav_model} />
          <Field label="UAV Serial" val={sac17.uav_serial} />
          <Field label="Payload" val={sac17.payload_requirements} />

          {sac17.detailed_mission_report ? (
            <>
              <h3 className="text-sm font-bold mt-3 mb-1">Detailed Mission Report</h3>
              <div className="text-sm whitespace-pre-wrap border border-neutral-200 p-2">{String(sac17.detailed_mission_report)}</div>
            </>
          ) : null}
        </section>
      )}

      {/* ════════ SAC 18 ════════ */}
      {sac18 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-neutral-300 pb-1 mb-3">SAC 18 — Site / Drone Operation Risk Assessment</h2>

          {/* Risk checklist */}
          {Object.keys(riskChecklist).length > 0 && (
            <>
              <h3 className="text-sm font-bold mt-3 mb-1">Risk Checklist</h3>
              <table className="w-full text-xs border border-neutral-300 mb-3">
                <thead><tr className="bg-neutral-100">
                  <th className={`${tCell} text-left`}>Item</th>
                  <th className={`${tCell} w-16`}>Value</th>
                  <th className={`${tCell} text-left`}>Notes</th>
                </tr></thead>
                <tbody>
                  {Object.entries(riskChecklist).map(([k, v]) => (
                    <tr key={k}>
                      <td className={tCell}>{k.replace(/_/g, " ")}</td>
                      <td className={`${tCell} text-center`}>{v.value}</td>
                      <td className={tCell}>{v.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Risk table */}
          {riskTable.length > 0 && (
            <>
              <h3 className="text-sm font-bold mt-3 mb-1">Risk Table</h3>
              <table className="w-full text-xs border border-neutral-300 mb-3">
                <thead><tr className="bg-neutral-100">
                  <th className={`${tCell} text-left`}>Something Seen</th>
                  <th className={`${tCell} text-left`}>Who Harmed</th>
                  <th className={`${tCell} text-left`}>What You Did</th>
                  <th className={`${tCell} text-left`}>Further Actions</th>
                  <th className={`${tCell} text-left`}>Action By</th>
                </tr></thead>
                <tbody>
                  {riskTable.map((r, i) => (
                    <tr key={i}>
                      <td className={tCell}>{r.something_seen}</td>
                      <td className={tCell}>{r.who_harmed}</td>
                      <td className={tCell}>{r.what_you_did}</td>
                      <td className={tCell}>{r.further_actions}</td>
                      <td className={tCell}>{r.action_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Overflown sites/areas/ATZs */}
          {[
            { label: "Overflown Sites", data: overflownSites },
            { label: "Overflown Areas", data: overflownAreas },
            { label: "Overflown ATZs", data: overflownAtzs },
          ].map(({ label, data }) => data.length > 0 ? (
            <div key={label} className="mb-3">
              <h3 className="text-sm font-bold mt-3 mb-1">{label}</h3>
              <table className="w-full text-xs border border-neutral-300">
                <thead><tr className="bg-neutral-100">
                  <th className={`${tCell} text-left`}>Name</th>
                  <th className={`${tCell} text-left`}>Contact</th>
                  <th className={`${tCell} w-20`}>Permission</th>
                </tr></thead>
                <tbody>
                  {data.map((entry, i) => (
                    <tr key={i}>
                      <td className={tCell}>{entry.name}</td>
                      <td className={tCell}>{entry.contact_details}</td>
                      <td className={`${tCell} text-center`}>{entry.permission_given}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null)}

          {/* Onsite / pre-flight */}
          <h3 className="text-sm font-bold mt-3 mb-1">Onsite &amp; Pre-flight</h3>
          <Field label="RP Observations" val={sac18.rp_observations} />
          <Field label="Pre-flight Checks By" val={sac18.pre_flight_checks_by} />
          <Field label="Pre-flight Checks At" val={fmtUTC(sac18.pre_flight_checks_at)} />
          <Field label="Permissions Given" val={sac18.permissions_given} />
          <Field label="Permissions At" val={fmtUTC(sac18.permissions_at)} />
          <Field label="Pre-flight Briefing By" val={sac18.pre_flight_briefing_by} />
          <Field label="Pre-flight Briefing At" val={fmtUTC(sac18.pre_flight_briefing_at)} />

          {/* Post-flight */}
          <h3 className="text-sm font-bold mt-3 mb-1">Post-flight</h3>
          <Field label="Number of Flights" val={sac18.num_flights} />
          <Field label="Flight Durations" val={sac18.flight_durations} />
          <Field label="Any Incidents" val={sac18.any_incidents ? "Yes" : "No"} />
          {sac18.any_incidents ? <Field label="Incident Notes" val={sac18.incident_notes} /> : null}
          <Field label="Issues or Alerts" val={sac18.issues_or_alerts} />
          <Field label="Further Action Required" val={sac18.further_action_required} />
          <Field label="Other Information" val={sac18.other_information} />

          {/* Sign-off timestamps */}
          <h3 className="text-sm font-bold mt-3 mb-1">Sign-off Status</h3>
          <Field label="RP Signed At" val={fmtUTC(sac18.rp_signed_at)} />
          <Field label="Supervisor Signed At" val={fmtUTC(sac18.supervisor_signed_at)} />
          <Field label="Post-flight RP Signed At" val={fmtUTC(sac18.post_rp_signed_at)} />
          <Field label="Post-flight Supervisor Signed At" val={fmtUTC(sac18.post_supervisor_signed_at)} />
        </section>
      )}

      {/* ════════ Signatures ════════ */}
      {signatures.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-neutral-300 pb-1 mb-3">Verification Signatures</h2>
          <div className="grid grid-cols-2 gap-4">
            {signatures.map((sig) => (
              <div key={sig.id} className="border border-neutral-300 rounded p-3">
                <div className="text-xs uppercase text-neutral-600 mb-2">{sig.label}</div>
                <img
                  src={`/api/file/${sig.id}`}
                  alt={sig.label}
                  className="max-w-full max-h-32 object-contain"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 text-[10px] text-neutral-500 text-center">
        Generated {fmtUTC(new Date().toISOString())} · Use Print → Save as PDF
      </div>
    </div>
  );
}
