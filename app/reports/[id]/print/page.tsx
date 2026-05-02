import { notFound } from "next/navigation";
import { requireUser, getOrganisation } from "@/lib/auth";
import { apiMaybe, apiOptional } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import type {
  AuditEntry,
  Department,
  Report,
  ReportTemplate,
  TemplateField,
  User,
} from "@/lib/types";
import PrintButton from "./PrintButton";

export const metadata = { title: "Report — Print" };

function renderValue(
  f: TemplateField,
  raw: unknown,
  users: User[],
): string {
  if (raw == null || raw === "") return "—";
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (f.type === "user_reference") {
    return users.find((u) => u.id === raw)?.full_name ?? String(raw);
  }
  return String(raw);
}

export default async function PrintablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [report, org] = await Promise.all([
    apiMaybe<Report>(`/reports/${id}`),
    getOrganisation(),
  ]);
  if (!report) notFound();

  const [template, audit, usersRaw, departments] = await Promise.all([
    apiMaybe<ReportTemplate>(`/templates/${report!.template_id}`),
    apiMaybe<AuditEntry[]>(`/reports/${id}/audit`),
    apiOptional<unknown>("/users?limit=200"),
    apiMaybe<Department[]>("/departments"),
  ]);
  const users = extractItems<User>(usersRaw);
  const reporter = users.find((u) => u.id === report!.reporter_id);
  const dept = (departments ?? []).find((d) => d.id === report!.department_id);

  const approvalEntry =
    report!.status === "approved"
      ? [...(audit ?? [])]
          .filter((a) => a.action === "approve" || a.action === "auto_approve")
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0] ?? null
      : null;

  return (
    <div className="printable bg-white text-black font-serif max-w-2xl mx-auto p-8 rounded shadow-lg">
      <div className="flex justify-end print:hidden mb-4">
        <PrintButton />
      </div>
      <div className="report-print-header border-b-2 border-black pb-3 mb-6">
        <div className="text-xs uppercase tracking-wider text-neutral-600">
          {org?.name ?? "Black Report"}
        </div>
        <h1 className="text-2xl font-bold">{template?.name}</h1>
        <div className="text-sm text-neutral-700">
          v{template?.version} · {reporter?.full_name ?? report!.reporter_id.slice(0, 8)}
          {dept ? ` · ${dept.name}` : ""}
        </div>
        <div className="text-xs text-neutral-600 mt-1">
          Status: <strong className="capitalize">{report!.status.replace("_", " ")}</strong>
          {report!.submitted_at && ` · Submitted ${new Date(report!.submitted_at).toLocaleString()}`}
        </div>
        {approvalEntry && (
          <div className="text-sm text-neutral-700 mt-1">
            Approved by: {approvalEntry.actor_name} ·{" "}
            {new Date(approvalEntry.created_at).toLocaleString()}
          </div>
        )}
      </div>

      {(template?.schema ?? []).map((f) => {
        const raw = (report!.data ?? {})[f.key];
        const strVal = String(raw ?? "");
        const isFileRef = f.type === "file_upload" && strVal.startsWith("file::");
        const fileId = isFileRef ? strVal.split("::")[1] : null;
        const fileName = isFileRef ? strVal.split("::").slice(2).join("::") : strVal;
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
        return (
        <div key={f.key} className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-neutral-600">{f.label}</div>
          <div className="text-sm mt-1 whitespace-pre-wrap">
            {isFileRef && isImage && fileId ? (
              <img
                src={`/api/file/${fileId}`}
                alt={fileName}
                className="max-w-sm max-h-64 rounded border border-neutral-300 object-contain"
              />
            ) : isFileRef ? (
              <a href={`/api/file/${fileId}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                📎 {fileName}
              </a>
            ) : (
              renderValue(f, raw, users ?? [])
            )}
          </div>
        </div>
        );
      })}

      <hr className="border-neutral-300 my-6" />
      <h2 className="font-semibold text-sm">Approval trail</h2>
      {(!audit || audit.length === 0) ? (
        <div className="text-xs text-neutral-600">No approvals recorded.</div>
      ) : (
        <ol className="text-xs pl-5 list-decimal mt-2">
          {audit.map((a, i) => (
            <li key={i} className="mb-1">
              <strong>Level {a.level_index}</strong> · {a.actor_name} — {a.action.replace("_", " ")} — {new Date(a.created_at).toLocaleString()}
              {a.comment && <div className="italic text-neutral-700">“{a.comment}”</div>}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-10 text-[10px] text-neutral-500 text-center">
        Generated {new Date().toLocaleString()}
      </div>
    </div>
  );
}
