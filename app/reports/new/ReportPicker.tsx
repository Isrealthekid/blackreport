"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Dept {
  id: string;
  name: string;
  templateCount: number;
}

interface Tpl {
  id: string;
  name: string;
  version: number;
}

export default function ReportPicker({
  departments,
  templates,
  selectedDeptId,
  selectedTplId,
  singleDept,
}: {
  departments: Dept[];
  templates: Tpl[];
  selectedDeptId: string;
  selectedTplId: string;
  singleDept: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const navigate = useCallback(
    (dept: string, tpl: string) => {
      const sp = new URLSearchParams(params.toString());
      sp.set("department", dept);
      sp.set("template", tpl);
      router.push(`/reports/new?${sp.toString()}`);
    },
    [router, params],
  );

  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-neutral-400">Department</label>
        <select
          value={selectedDeptId}
          disabled={singleDept}
          onChange={(e) => {
            // When dept changes, reset template to let server pick the first one for that dept.
            const sp = new URLSearchParams();
            sp.set("department", e.target.value);
            router.push(`/reports/new?${sp.toString()}`);
          }}
          className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 disabled:opacity-60"
        >
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.templateCount} template
              {d.templateCount !== 1 ? "s" : ""})
            </option>
          ))}
        </select>
        {singleDept && (
          <p className="text-xs text-neutral-600 mt-1">Your only department.</p>
        )}
      </div>
      <div>
        <label className="text-sm text-neutral-400">Template</label>
        <select
          value={selectedTplId}
          onChange={(e) => navigate(selectedDeptId, e.target.value)}
          className="mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} v{t.version}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
