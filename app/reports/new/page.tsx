import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { api, apiMaybe } from "@/lib/api";
import { getUserDepartments } from "@/lib/scope";
import type { Department, ReportTemplate } from "@/lib/types";
import ReportForm, { type UserProfile } from "./ReportForm";
import ReportPicker from "./ReportPicker";

export default async function NewReportPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; department?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  // Resolve the user's departments (with full detail including assigned_templates).
  const myDeptsSummary = await getUserDepartments(user);
  if (myDeptsSummary.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold">New Report</h1>
        <div className="mt-6 border border-neutral-800 rounded-lg p-4 text-sm text-neutral-400">
          <p>You aren&apos;t a member of any department yet.</p>
          <p className="mt-2">
            Ask an admin to add you to a department
            {user.is_admin && (
              <>
                {" "}— or visit{" "}
                <Link href="/departments" className="underline">
                  Departments
                </Link>{" "}
                to create one.
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Fetch full detail for each department (includes assigned_templates).
  const myDepts = await Promise.all(
    myDeptsSummary.map((d) =>
      apiMaybe<Department>(`/departments/${d.id}`).then((full) => full ?? d),
    ),
  );

  // Selected department (default = first).
  const selectedDept =
    myDepts.find((d) => d.id === sp.department) ?? myDepts[0];

  // Templates available for the selected department — from assigned_templates.
  const assigned = selectedDept.assigned_templates ?? [];
  const publishedAssigned = assigned.filter((a) => a.is_published);

  // Resolve full template objects so we get the schema.
  const templatesFull = (
    await Promise.all(
      publishedAssigned.map((a) =>
        apiMaybe<ReportTemplate>(`/templates/${a.template_id}`),
      ),
    )
  ).filter((t): t is ReportTemplate => t !== null && t.is_published);

  if (templatesFull.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold">New Report</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Department: <span className="text-neutral-200">{selectedDept.name}</span>
        </p>
        <div className="mt-6 border border-neutral-800 rounded-lg p-4 text-sm text-neutral-400">
          No report templates are assigned to{" "}
          <span className="text-neutral-200">{selectedDept.name}</span>.
          {user.is_admin && (
            <>
              {" "}
              <Link href="/templates" className="underline">
                Assign one from Templates
              </Link>{" "}
              or{" "}
              <Link href={`/departments/${selectedDept.id}`} className="underline">
                edit the department
              </Link>
              .
            </>
          )}
        </div>

        {/* Show department picker so they can switch */}
        {myDepts.length > 1 && (
          <ReportPicker
            departments={myDepts.map((d) => ({
              id: d.id,
              name: d.name,
              templateCount: (d.assigned_templates ?? []).filter((a) => a.is_published).length,
            }))}
            templates={[]}
            selectedDeptId={selectedDept.id}
            selectedTplId=""
            singleDept={false}
          />
        )}
      </div>
    );
  }

  const selectedTpl =
    templatesFull.find((t) => t.id === sp.template) ?? templatesFull[0];

  const profile: UserProfile = {
    full_name: user.full_name,
    position: user.position ?? "",
    date: new Date().toISOString().slice(0, 10),
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">New Report</h1>
      <p className="text-sm text-neutral-400 mt-1">
        <span className="text-neutral-200">{user.full_name}</span>
        {user.position ? ` · ${user.position}` : ""}
        {" · "}
        <span className="text-neutral-200">{selectedDept.name}</span>
      </p>

      <ReportPicker
        departments={myDepts.map((d) => ({
          id: d.id,
          name: d.name,
          templateCount: (d.assigned_templates ?? []).filter((a) => a.is_published).length,
        }))}
        templates={templatesFull.map((t) => ({
          id: t.id,
          name: t.name,
          version: t.version,
        }))}
        selectedDeptId={selectedDept.id}
        selectedTplId={selectedTpl.id}
        singleDept={myDepts.length === 1}
      />

      <ReportForm
        key={`${selectedDept.id}:${selectedTpl.id}`}
        template={selectedTpl}
        departmentId={selectedDept.id}
        initialData={{}}
        reportId={null}
        userProfile={profile}
      />
    </div>
  );
}
