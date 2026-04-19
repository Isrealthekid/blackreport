import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { actOnReportAction, recallReportAction } from "@/app/actions";
import BackButton from "@/components/BackButton";
import FilePreview from "@/components/FilePreview";
import type {
  AuditEntry,
  Department,
  DepartmentMember,
  Report,
  ReportTemplate,
  TemplateField,
  User,
} from "@/lib/types";

const statusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  pending: "bg-blue-900 text-blue-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
  revision_requested: "bg-orange-900 text-orange-200",
  escalated: "bg-purple-900 text-purple-200",
  recalled: "bg-neutral-800 text-neutral-500",
};

function renderValue(
  f: TemplateField,
  raw: unknown,
  users: User[],
): React.ReactNode {
  if (raw == null || raw === "") return <span className="text-neutral-600">—</span>;
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (f.type === "file_upload" && typeof raw === "string") {
    return <FilePreview value={raw} />;
  }
  if (f.type === "user_reference") {
    return users.find((u) => u.id === raw)?.full_name ?? String(raw);
  }
  if (f.type === "long_text") {
    return <div className="whitespace-pre-wrap">{String(raw)}</div>;
  }
  return String(raw);
}

export default async function ReportDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const justSubmitted = sp.submitted === "1";

  const report = await apiMaybe<Report>(`/reports/${id}`);
  if (!report) notFound();

  const [template, audit, users, departments, deptMembers] = await Promise.all([
    apiMaybe<ReportTemplate>(`/templates/${report!.template_id}`),
    apiMaybe<AuditEntry[]>(`/reports/${id}/audit`),
    apiMaybe<User[]>("/users"),
    apiMaybe<Department[]>("/departments"),
    report!.department_id
      ? apiMaybe<DepartmentMember[]>(`/departments/${report!.department_id}/members`)
      : Promise.resolve(null),
  ]);
  const schema = template?.schema ?? [];
  const reporter = (users ?? []).find((u) => u.id === report!.reporter_id);
  const dept = (departments ?? []).find((d) => d.id === report!.department_id);

  // The user can approve if they're an admin or hold an approver role
  // (manager, department_head, reviewer) in the report's department.
  const APPROVER_ROLES = ["admin", "department_head", "manager", "reviewer"];
  const isApprover =
    user.is_admin ||
    (deptMembers ?? []).some(
      (m) => m.user_id === user.id && APPROVER_ROLES.includes(m.role),
    );

  const canRecall =
    report!.reporter_id === user.id &&
    report!.status === "pending" &&
    (audit ?? []).length === 0;
  const canEditDraft =
    report!.reporter_id === user.id &&
    (report!.status === "draft" || report!.status === "revision_requested");
  const isOwnReport = report!.reporter_id === user.id;
  const canReview =
    isApprover &&
    !isOwnReport &&
    (report!.status === "pending" || report!.status === "escalated");

  return (
    <div className="max-w-3xl">
      <BackButton fallback="/reports" />
      {justSubmitted && (
        <div className="mb-6 border border-green-800 bg-green-950/30 rounded-lg p-4 text-sm text-green-200">
          ✓ Report submitted successfully. It has entered the approval chain — you can track its progress below.
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">
            <span className="font-mono text-base text-neutral-500">#{report!.id.slice(0, 8)}</span>{" "}
            {template?.name}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            v{template?.version} · {reporter?.full_name ?? report!.reporter_id.slice(0, 8)}
            {dept ? ` · ${dept.name}` : ""} · level {report!.current_level}
          </p>
          {report!.submitted_at && (
            <p className="text-xs text-neutral-500 mt-0.5">
              Submitted {new Date(report!.submitted_at).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/reports/${id}/print`}
            target="_blank"
            className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
          >
            Print / PDF
          </Link>
          {canEditDraft && (
            <Link
              href={`/reports/${id}/edit`}
              className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
            >
              Edit
            </Link>
          )}
          {canRecall && (
            <form action={recallReportAction}>
              <input type="hidden" name="id" value={id} />
              <button className="text-xs px-2 py-1 border border-yellow-800 text-yellow-300 rounded hover:bg-yellow-950">
                Recall
              </button>
            </form>
          )}
          <span className={`text-xs px-2 py-1 rounded ${statusColors[report!.status] ?? "bg-neutral-800"}`}>
            {report!.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="mt-6 border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {schema.map((f) => (
          <div key={f.key} className="p-4">
            <div className="text-xs uppercase text-neutral-500">{f.label}</div>
            <div className="mt-1">{renderValue(f, (report!.data ?? {})[f.key], users ?? [])}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mt-8">Approval trail</h2>
      <div className="mt-3 space-y-2">
        {(!audit || audit.length === 0) && (
          <p className="text-sm text-neutral-500">No actions yet.</p>
        )}
        {(audit ?? []).map((a, i) => (
          <div key={i} className="border border-neutral-800 rounded p-3 text-sm">
            <div className="text-xs text-neutral-500">
              Level {a.level_index} · {a.actor_name} · {new Date(a.created_at).toLocaleString()}
            </div>
            <div className="mt-1">
              <span className="font-medium">{a.action.replace("_", " ")}</span>
              {a.comment && <span className="text-neutral-400"> — “{a.comment}”</span>}
            </div>
          </div>
        ))}
      </div>

      {canReview && (
        <form
          action={actOnReportAction}
          className="mt-8 border-t border-neutral-800 pt-6 space-y-3"
        >
          <h3 className="font-semibold">Review (Level {report!.current_level})</h3>
          <input type="hidden" name="id" value={id} />
          <textarea
            name="comment"
            rows={2}
            placeholder="Optional reviewer note"
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
          <div className="flex gap-2 flex-wrap">
            <button name="decision" value="approve" className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded font-medium">
              Approve
            </button>
            <button name="decision" value="request_changes" className="px-4 py-2 bg-orange-700 hover:bg-orange-600 rounded font-medium">
              Request changes
            </button>
            <button name="decision" value="escalate" className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded font-medium">
              Escalate
            </button>
            <button name="decision" value="reject" className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded font-medium">
              Reject
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
