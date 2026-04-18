import { notFound } from "next/navigation";
import { requireUser, getOrganisation } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Camp, Mission } from "@/lib/types";
import PrintButton from "./PrintButton";

export const metadata = { title: "Mission — Print" };

export default async function MissionPrint({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [mission, org] = await Promise.all([
    apiMaybe<Mission>(`/missions/${id}`),
    getOrganisation(),
  ]);
  if (!mission) notFound();

  const [camp, sac16, sac17, sac18] = await Promise.all([
    apiMaybe<Camp>(`/camps/${mission.camp_id}`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac16`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac17`),
    apiMaybe<Record<string, unknown>>(`/missions/${id}/sac18`),
  ]);

  const hours = (sac16?.flight_hours as Array<{ hour: number; mission_order: string; report: string }>) ?? [];

  return (
    <div className="printable bg-white text-black font-serif max-w-3xl mx-auto p-8 rounded shadow-lg">
      <div className="flex justify-end print:hidden mb-4">
        <PrintButton />
      </div>

      <header className="border-b-2 border-black pb-3 mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-600">{org?.name ?? "Black Report"}</div>
        <h1 className="text-2xl font-bold">Mission {mission.mission_number}</h1>
        <div className="text-sm text-neutral-700">
          {camp?.site_name} · {mission.mission_date} · Status: {mission.status}
        </div>
      </header>

      {/* ── SAC 16 ── */}
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
                <th className="border border-neutral-300 px-2 py-1 text-left">Hour</th>
                <th className="border border-neutral-300 px-2 py-1 text-left">Mission Order</th>
                <th className="border border-neutral-300 px-2 py-1 text-left">Report</th>
              </tr></thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h.hour}>
                    <td className="border border-neutral-300 px-2 py-1">{h.hour}</td>
                    <td className="border border-neutral-300 px-2 py-1">{h.mission_order}</td>
                    <td className="border border-neutral-300 px-2 py-1">{h.report}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ── SAC 17 ── */}
      {sac17 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-neutral-300 pb-1 mb-3">SAC 17 — Mission Plan &amp; Risk Assessment</h2>
          {[
            ["Mission Initiator", sac17.mission_initiator_name],
            ["Contact", sac17.mission_initiator_contact],
            ["Unit", sac17.unit_details],
            ["Remote Pilot", sac17.remote_pilot_name],
            ["Pilot Contact", sac17.remote_pilot_contact],
            ["Flyer ID", sac17.remote_pilot_flyer_id],
            ["Mission Type", sac17.mission_type],
            ["UAV Model", sac17.uav_model],
            ["UAV Serial", sac17.uav_serial],
            ["Flight ID", sac17.flight_id],
            ["Flight Count", sac17.flight_count],
            ["Flight Duration", sac17.flight_duration],
            ["Payload", sac17.payload_requirements],
          ].map(([label, val]) => val ? (
            <div key={String(label)} className="mb-1">
              <span className="text-xs uppercase text-neutral-600">{String(label)}: </span>
              <span className="text-sm">{String(val)}</span>
            </div>
          ) : null)}
          {sac17.detailed_mission_report ? (
            <div className="mt-3">
              <div className="text-xs uppercase text-neutral-600">Detailed Mission Report</div>
              <div className="text-sm whitespace-pre-wrap mt-1 border border-neutral-200 p-2">{String(sac17.detailed_mission_report)}</div>
            </div>
          ) : null}
        </section>
      )}

      {/* ── SAC 18 ── */}
      {sac18 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-neutral-300 pb-1 mb-3">SAC 18 — Site / Drone Operation Risk Assessment</h2>
          {sac18.risk_checklist != null && typeof sac18.risk_checklist === "object" ? (
            <div className="mb-3">
              <div className="text-xs uppercase text-neutral-600 mb-1">Risk Checklist</div>
              <table className="w-full text-xs border border-neutral-300">
                <thead><tr className="bg-neutral-100">
                  <th className="border border-neutral-300 px-2 py-1 text-left">Item</th>
                  <th className="border border-neutral-300 px-2 py-1 w-16">Value</th>
                  <th className="border border-neutral-300 px-2 py-1 text-left">Notes</th>
                </tr></thead>
                <tbody>
                  {Object.entries(sac18.risk_checklist as Record<string, { value: string; notes?: string }>).map(([k, v]) => (
                    <tr key={k}>
                      <td className="border border-neutral-300 px-2 py-1">{k.replace(/_/g, " ")}</td>
                      <td className="border border-neutral-300 px-2 py-1 text-center">{v.value}</td>
                      <td className="border border-neutral-300 px-2 py-1">{v.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {[
            ["RP Observations", sac18.rp_observations],
            ["Pre-flight Checks By", sac18.pre_flight_checks_by],
            ["Num Flights", sac18.num_flights],
            ["Flight Durations", sac18.flight_durations],
            ["Issues or Alerts", sac18.issues_or_alerts],
            ["Further Action", sac18.further_action_required],
          ].map(([label, val]) => val ? (
            <div key={String(label)} className="mb-1">
              <span className="text-xs uppercase text-neutral-600">{String(label)}: </span>
              <span className="text-sm">{String(val)}</span>
            </div>
          ) : null)}
        </section>
      )}

      <div className="mt-10 text-[10px] text-neutral-500 text-center">
        Generated {new Date().toLocaleString()} · Use Print → Save as PDF
      </div>
    </div>
  );
}
