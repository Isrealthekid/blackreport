import { notFound } from "next/navigation";
import { requireUser, getOrganisation } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import type { Camp, Mission } from "@/lib/types";
import PrintButton from "@/app/missions/[id]/print/PrintButton";
import MissionPrintBlock from "@/components/MissionPrintBlock";

export const metadata = { title: "Camp missions — Print batch" };

const STATUSES = ["draft", "submitted", "approved", "rejected"] as const;

function inRange(iso: string | undefined, from: string, to: string): boolean {
  if (!iso) return false;
  const v = iso.slice(0, 10); // YYYY-MM-DD compare
  if (from && v < from) return false;
  if (to && v > to) return false;
  return true;
}

export default async function CampMissionsPrint({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  await requireUser();
  const [{ id }, sp, org] = await Promise.all([
    params,
    searchParams,
    getOrganisation(),
  ]);
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const statusFilter = sp.status ?? "";

  const [camp, missionsRaw] = await Promise.all([
    apiMaybe<Camp>(`/camps/${id}`),
    apiMaybe<unknown>(`/missions?camp_id=${id}`),
  ]);
  if (!camp) notFound();

  const all = extractItems<Mission>(missionsRaw);

  const filtered = all
    .filter((m) => inRange(m.mission_date, from, to))
    .filter((m) => (statusFilter ? m.status === statusFilter : true))
    .sort((a, b) =>
      (a.mission_date ?? "").localeCompare(b.mission_date ?? ""),
    );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="printable bg-white text-black font-serif max-w-3xl mx-auto p-8 rounded shadow-lg">
      {/* Toolbar — print-hidden */}
      <div className="print:hidden flex items-center justify-between gap-3 mb-6 border-b border-neutral-300 pb-3">
        <div>
          <h1 className="text-xl font-bold">
            {camp.site_name} — Missions print
          </h1>
          <p className="text-xs text-neutral-700 mt-1">
            {filtered.length} mission{filtered.length === 1 ? "" : "s"} matched.
            Use your browser&apos;s Print dialog to save the bundle as a single PDF.
          </p>
        </div>
        <PrintButton fileName={`${camp.site_code}_missions`} />
      </div>

      {/* Filter form — print-hidden */}
      <form
        method="GET"
        className="print:hidden grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-sm"
      >
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">From</label>
          <input
            name="from"
            type="date"
            defaultValue={from}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">To</label>
          <input
            name="to"
            type="date"
            defaultValue={to}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">Status</label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className="text-xs px-3 py-1.5 border border-neutral-400 rounded hover:bg-neutral-100 text-neutral-700">
            Apply
          </button>
        </div>
      </form>

      {/* Bundle cover */}
      <div className="border-b-2 border-black pb-3 mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-600">
          {org?.name ?? "Black Report"}
        </div>
        <h1 className="text-2xl font-bold">{camp.site_name} — Missions bundle</h1>
        <div className="text-sm text-neutral-700 mt-1">
          Site code {camp.site_code}
          {from ? ` · From ${fmtDate(from)}` : ""}
          {to ? ` · To ${fmtDate(to)}` : ""}
          {statusFilter ? ` · Status: ${statusFilter}` : ""}
        </div>
        <div className="text-xs text-neutral-600 mt-1">
          {filtered.length} mission{filtered.length === 1 ? "" : "s"}.
          Generated {new Date().toLocaleString()}.
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-neutral-700">
          No missions match the current filters.
        </p>
      )}

      {filtered.map((m, idx) => (
        <section
          key={m.id}
          className="mb-10"
          style={{ pageBreakAfter: "always", breakAfter: "page" }}
        >
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">
            Mission {idx + 1} of {filtered.length}
          </div>
          <MissionPrintBlock missionId={m.id} orgName={org?.name} />
        </section>
      ))}

      <div className="mt-10 text-[10px] text-neutral-500 text-center">
        End of bundle · Generated {new Date().toLocaleString()}
      </div>
    </div>
  );
}
