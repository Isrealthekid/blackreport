import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Report, ReportTemplate } from "@/lib/types";
import ReportForm from "../../new/ReportForm";

export default async function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const report = await apiMaybe<Report>(`/reports/${id}`);
  if (!report) notFound();
  if (report.reporter_id !== user.id) redirect(`/reports/${id}`);
  if (report.status !== "draft" && report.status !== "revision_requested") {
    redirect(`/reports/${id}`);
  }
  const template = await apiMaybe<ReportTemplate>(`/templates/${report.template_id}`);
  if (!template) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">
        {report.status === "revision_requested" ? "Revise report" : "Edit draft"}
      </h1>
      <p className="text-neutral-400 text-sm mt-1">
        {template.name} <span className="text-neutral-600">v{template.version}</span>
      </p>
      <ReportForm
        template={template}
        departmentId={null}
        initialData={report.data ?? {}}
        reportId={report.id}
      />
    </div>
  );
}
