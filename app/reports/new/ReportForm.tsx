"use client";

import { useState } from "react";
import { submitReportAction, updateDraftAction } from "@/app/actions";
import FileUpload from "@/components/FileUpload";
import type { ReportTemplate, TemplateField } from "@/lib/types";

export interface UserProfile {
  full_name: string;
  position: string;
  date: string;
}

const AUTO_FILL_KEYS: Record<string, keyof UserProfile> = {
  employee_name: "full_name",
  full_name: "full_name",
  name: "full_name",
  reporter_name: "full_name",
  position: "position",
  job_title: "position",
  report_date: "date",
  date: "date",
  today: "date",
};

function defaultValue(
  f: TemplateField,
  profile?: UserProfile,
): unknown {
  if (profile) {
    const mapped = AUTO_FILL_KEYS[f.key];
    if (mapped && profile[mapped]) return profile[mapped];
    if (f.type === "date" && profile.date) return profile.date;
  }
  if (f.type === "multi_select") return [];
  if (f.type === "checkbox") return false;
  return "";
}

export default function ReportForm({
  template,
  departmentId,
  initialData,
  reportId,
  userProfile,
}: {
  template: ReportTemplate;
  departmentId: string | null;
  initialData: Record<string, unknown>;
  reportId: string | null;
  userProfile?: UserProfile;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const f of template.schema) {
      const v = initialData[f.key];
      base[f.key] =
        v !== undefined && v !== "" ? v : defaultValue(f, userProfile);
    }
    return base;
  });

  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));
  const get = (k: string) => values[k];

  const visible = (f: TemplateField) => {
    if (!f.conditional) return true;
    const parent = values[f.conditional.field];
    if (Array.isArray(parent)) return parent.includes(f.conditional.equals);
    if (typeof parent === "boolean") return String(parent) === f.conditional.equals;
    return (parent ?? "") === f.conditional.equals;
  };

  const action = reportId ? updateDraftAction : submitReportAction;

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="schema" value={JSON.stringify(template.schema)} />
      <input type="hidden" name="template_id" value={template.id} />
      {reportId ? (
        <input type="hidden" name="id" value={reportId} />
      ) : (
        <input type="hidden" name="department_id" value={departmentId ?? ""} />
      )}

      {template.schema.map((f) => {
        if (!visible(f)) return null;
        const common = "mt-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2";
        const label = (
          <label className="text-sm text-neutral-400">
            {f.label}
            {f.required && <span className="text-red-400"> *</span>}
          </label>
        );
        const help = f.help ? (
          <p className="text-xs text-neutral-500 mt-1">{f.help}</p>
        ) : null;

        switch (f.type) {
          case "short_text":
            return (
              <div key={f.key}>
                {label}
                <input
                  name={f.key}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common}
                />
                {help}
              </div>
            );
          case "long_text":
            return (
              <div key={f.key}>
                {label}
                <textarea
                  name={f.key}
                  rows={4}
                  required={f.required}
                  placeholder={f.placeholder}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common}
                />
                {help}
              </div>
            );
          case "date":
            return (
              <div key={f.key}>
                {label}
                <input
                  type="date"
                  name={f.key}
                  required={f.required}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common}
                />
                {help}
              </div>
            );
          case "number":
            return (
              <div key={f.key}>
                {label}
                <input
                  type="number"
                  name={f.key}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common}
                />
                {help}
              </div>
            );
          case "dropdown":
            return (
              <div key={f.key}>
                {label}
                <select
                  name={f.key}
                  required={f.required}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common}
                >
                  <option value="">Select…</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {help}
              </div>
            );
          case "multi_select": {
            const cur = (Array.isArray(get(f.key)) ? (get(f.key) as string[]) : []);
            return (
              <div key={f.key}>
                {label}
                <div className="mt-1 flex flex-wrap gap-2">
                  {(f.options ?? []).map((o) => (
                    <label key={o} className="flex items-center gap-1 text-sm border border-neutral-700 rounded px-2 py-1">
                      <input
                        type="checkbox"
                        name={f.key}
                        value={o}
                        checked={cur.includes(o)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...cur, o] : cur.filter((x) => x !== o);
                          set(f.key, next);
                        }}
                      />
                      {o}
                    </label>
                  ))}
                </div>
                {help}
              </div>
            );
          }
          case "checkbox": {
            const checked = get(f.key) === true || get(f.key) === "true";
            return (
              <div key={f.key}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={f.key}
                    checked={checked}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                  {f.label}
                  {f.required && <span className="text-red-400"> *</span>}
                </label>
                {help}
              </div>
            );
          }
          case "file_upload":
            return (
              <div key={f.key}>
                {label}
                <FileUpload
                  reportId={reportId}
                  fieldKey={f.key}
                  existingValue={String(get(f.key) ?? "")}
                  onValueChange={(val) => set(f.key, val)}
                />
                {help}
              </div>
            );
          case "signature":
            return (
              <div key={f.key}>
                {label}
                <input
                  name={f.key}
                  placeholder="Type your full name to sign"
                  required={f.required}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common + " font-mono italic"}
                />
              </div>
            );
          case "rating": {
            const max = f.max ?? 5;
            const cur = Number(get(f.key) ?? 0);
            return (
              <div key={f.key}>
                {label}
                <div className="mt-1 flex gap-1">
                  {Array.from({ length: max }).map((_, i) => {
                    const v = i + 1;
                    return (
                      <button
                        type="button"
                        key={v}
                        onClick={() => set(f.key, v)}
                        className={`w-8 h-8 rounded border ${
                          cur >= v ? "bg-yellow-500 border-yellow-500 text-black" : "border-neutral-700"
                        }`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name={f.key} value={String(get(f.key) ?? "")} />
              </div>
            );
          }
          case "user_reference":
            return (
              <div key={f.key}>
                {label}
                <input
                  name={f.key}
                  placeholder="User ID"
                  required={f.required}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common + " font-mono text-xs"}
                />
                {help}
              </div>
            );
          case "table":
            return (
              <div key={f.key}>
                {label}
                <textarea
                  name={f.key}
                  rows={3}
                  value={String(get(f.key) ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={common + " font-mono text-xs"}
                  placeholder="JSON array of rows"
                />
              </div>
            );
        }
      })}

      <div className="flex gap-3 pt-2">
        <button name="action" value="submit" className="px-4 py-2 bg-white text-black font-medium rounded">
          Submit for approval
        </button>
        <button name="action" value="draft" className="px-4 py-2 border border-neutral-700 rounded">
          Save draft
        </button>
      </div>
    </form>
  );
}
