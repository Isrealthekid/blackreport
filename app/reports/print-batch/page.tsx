import { requireUser, getOrganisation } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import type {
  Department,
  Report,
  ReportStatus,
  ReportTemplate,
  TemplateField,
  User,
} from "@/lib/types";
import PrintButton from "../[id]/print/PrintButton";

export const metadata = { title: "Reports — Print batch" };

const ALL_STATUSES: ReportStatus[] = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "revision_requested",
  "escalated",
  "recalled",
];

function renderValue(f: TemplateField, raw: unknown, users: User[]): string {
  if (raw == null || raw === "") return "—";
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (f.type === "user_reference") {
    return users.find((u) => u.id === raw)?.full_name ?? String(raw);
  }
  return String(raw);
}

function toRfc3339(date: string, end: boolean): string {
  // date format YYYY-MM-DD; if end=true, push to next-day midnight UTC.
  const d = new Date(date + "T00:00:00Z");
  if (end) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

export default async function PrintBatchPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string | string[];
    department_id?: string;
    template_id?: string;
    reporter_id?: string;
  }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const org = await getOrganisation();

  const params = new URLSearchParams();
  if (sp.from) params.set("from", toRfc3339(sp.from, false));
  if (sp.to) params.set("to", toRfc3339(sp.to, true));
  if (sp.department_id) params.set("department_id", sp.department_id);
  if (sp.template_id) params.set("template_id", sp.template_id);
  if (sp.reporter_id) params.set("reporter_id", sp.reporter_id);
  // status: support repeated or comma-separated
  const rawStatuses = Array.isArray(sp.status)
    ? sp.status
    : sp.status
    ? sp.status.split(",")
    : [];
  for (const s of rawStatuses.filter(Boolean)) params.append("status", s);
  params.set("limit", "200");

  const raw = await apiMaybe<unknown>(`/reports?${params.toString()}`);
  const reports = extractItems<Report>(raw).sort((a, b) =>
    (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at),
  );

  const [templatesRaw, usersRaw, deptsRaw] = await Promise.all([
    apiMaybe<unknown>("/templates"),
    apiMaybe<unknown>("/users"),
    apiMaybe<unknown>("/departments"),
  ]);
  const templates = extractItems<ReportTemplate>(templatesRaw);
  const users = extractItems<User>(usersRaw);
  const depts = extractItems<Department>(deptsRaw);
  const tmap = new Map(templates.map((t) => [t.id, t]));
  const umap = new Map(users.map((u) => [u.id, u]));
  const dmap = new Map(depts.map((d) => [d.id, d]));

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
          <h1 className="text-xl font-bold">Reports — Batch print</h1>
          <p className="text-xs text-neutral-700 mt-1">
            {reports.length} report{reports.length === 1 ? "" : "s"} matched.
            Use your browser&apos;s Print dialog to save the bundle as a single PDF.
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Filter form — print-hidden */}
      <form
        method="GET"
        className="print:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 text-sm"
      >
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">From</label>
          <input
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">To</label>
          <input
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">Status</label>
          <select
            name="status"
            defaultValue={rawStatuses[0] ?? ""}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          >
            <option value="">Any status</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">Department</label>
          <select
            name="department_id"
            defaultValue={sp.department_id ?? ""}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          >
            <option value="">Any department</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-neutral-600">Template</label>
          <select
            name="template_id"
            defaultValue={sp.template_id ?? ""}
            className="mt-1 w-full bg-white border border-neutral-300 rounded px-2 py-1"
          >
            <option value="">Any template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} v{t.version}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className="text-xs px-3 py-1.5 border border-neutral-400 rounded hover:bg-neutral-100 text-neutral-700">
            Apply
          </button>
        </div>
      </form>

      {/* Bundle cover sheet (always shown, also prints) */}
      <div className="border-b-2 border-black pb-3 mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-600">
          {org?.name ?? "Black Report"}
        </div>
        <h1 className="text-2xl font-bold">Reports bundle</h1>
        <div className="text-sm text-neutral-700 mt-1">
          {sp.from ? `From ${fmtDate(sp.from)}` : "From — "}
          {sp.to ? ` to ${fmtDate(sp.to)}` : " to —"}
          {rawStatuses.length > 0 && ` · Status: ${rawStatuses.join(", ")}`}
        </div>
        <div className="text-xs text-neutral-600 mt-1">
          {reports.length} report{reports.length === 1 ? "" : "s"}.
          Generated {new Date().toLocaleString()}.
        </div>
      </div>

      {reports.length === 0 && (
        <p className="text-sm text-neutral-700">
          No reports match the current filters.
        </p>
      )}

      {/* Each report renders on its own page when printing */}
      {reports.map((r, idx) => {
        const tpl = tmap.get(r.template_id);
        const reporter = umap.get(r.reporter_id);
        const dept = dmap.get(r.department_id);
        return (
          <section
            key={r.id}
            className="mb-10"
            style={{ pageBreakAfter: "always", breakAfter: "page" }}
          >
            <div className="border-b border-neutral-400 pb-2 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-neutral-600">
                Report {idx + 1} of {reports.length} · #{r.id.slice(0, 8)}
              </div>
              <h2 className="text-lg font-bold">{tpl?.name ?? "—"}</h2>
              <div className="text-xs text-neutral-700">
                v{tpl?.version ?? "?"}
                {reporter ? ` · ${reporter.full_name}` : ""}
                {dept ? ` · ${dept.name}` : ""}
              </div>
              <div className="text-xs text-neutral-600 mt-1">
                Status:{" "}
                <strong className="capitalize">
                  {r.status.replace("_", " ")}
                </strong>
                {r.submitted_at &&
                  ` · Submitted ${new Date(r.submitted_at).toLocaleString()}`}
                {r.finalised_at &&
                  ` · Finalised ${new Date(r.finalised_at).toLocaleString()}`}
              </div>
            </div>

            {(tpl?.schema ?? []).map((f) => {
              const raw = (r.data ?? {})[f.key];
              const strVal = String(raw ?? "");
              const isFileRef =
                f.type === "file_upload" && strVal.startsWith("file::");
              const fileId = isFileRef ? strVal.split("::")[1] : null;
              const fileName = isFileRef
                ? strVal.split("::").slice(2).join("::")
                : strVal;
              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
                fileName,
              );
              return (
                <div key={f.key} className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-600">
                    {f.label}
                  </div>
                  <div className="text-sm mt-1 whitespace-pre-wrap">
                    {isFileRef && isImage && fileId ? (
                      <img
                        src={`/api/file/${fileId}`}
                        alt={fileName}
                        className="max-w-sm max-h-64 rounded border border-neutral-300 object-contain"
                      />
                    ) : isFileRef ? (
                      <span>📎 {fileName}</span>
                    ) : (
                      renderValue(f, raw, users)
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}

      <div className="mt-10 text-[10px] text-neutral-500 text-center">
        End of bundle · Generated {new Date().toLocaleString()}
      </div>
    </div>
  );
}
