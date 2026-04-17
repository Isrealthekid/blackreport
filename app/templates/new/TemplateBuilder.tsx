"use client";

import { useState } from "react";
import { FIELD_TYPE_LABELS, type FieldType } from "@/lib/types";

interface Field {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  help?: string;
  placeholder?: string;
  options?: string;
  min?: number;
  max?: number;
  showIfFieldKey?: string;
  showIfEquals?: string;
}

const TYPES: FieldType[] = [
  "short_text",
  "long_text",
  "date",
  "number",
  "dropdown",
  "multi_select",
  "checkbox",
  "file_upload",
  "signature",
  "table",
  "rating",
  "user_reference",
];

function slug(label: string, fallback: string) {
  const s = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || fallback;
}

export default function TemplateBuilder() {
  const [fields, setFields] = useState<Field[]>([
    { key: "field_1", label: "", type: "short_text", required: true },
  ]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const update = (i: number, patch: Partial<Field>) =>
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i: number) =>
    setFields((f) => f.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    setFields((f) => {
      const j = i + dir;
      if (j < 0 || j >= f.length) return f;
      const copy = [...f];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };
  const add = () =>
    setFields((f) => [
      ...f,
      {
        key: `field_${f.length + 1}`,
        label: "",
        type: "short_text",
        required: false,
      },
    ]);

  // Finalize keys: derive from label if user hasn't customized them
  const normalized = fields.map((f, i) => ({
    ...f,
    key: f.key.startsWith("field_") ? slug(f.label, `field_${i + 1}`) : f.key,
  }));

  const priorFields = (i: number) => normalized.slice(0, i).filter((x) => x.label);

  return (
    <div>
      <input type="hidden" name="fields" value={JSON.stringify(normalized)} />
      <label className="text-sm text-neutral-400">Fields</label>
      <div className="mt-2 space-y-3">
        {fields.map((f, i) => {
          const exp = !!expanded[f.key + i];
          return (
            <div key={i} className="border border-neutral-800 rounded p-3 space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex flex-col text-neutral-500 text-xs">
                  <button type="button" onClick={() => move(i, -1)} className="hover:text-white leading-none">▲</button>
                  <button type="button" onClick={() => move(i, 1)} className="hover:text-white leading-none">▼</button>
                </div>
                <input
                  placeholder="Field label"
                  value={f.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="flex-1 min-w-40 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                />
                <select
                  value={f.type}
                  onChange={(e) => update(i, { type: e.target.value as FieldType })}
                  className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                >
                  {TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
                </select>
                <label className="flex items-center gap-1 text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => update(i, { required: e.target.checked })}
                  />
                  required
                </label>
                <button
                  type="button"
                  onClick={() => setExpanded((s) => ({ ...s, [f.key + i]: !exp }))}
                  className="text-xs text-neutral-400"
                >
                  {exp ? "▴" : "▾"}
                </button>
                <button type="button" onClick={() => remove(i)} className="text-xs text-red-400">
                  ✕
                </button>
              </div>

              {(f.type === "dropdown" || f.type === "multi_select") && (
                <input
                  placeholder="Comma-separated options"
                  value={f.options ?? ""}
                  onChange={(e) => update(i, { options: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                />
              )}

              {exp && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <input
                    placeholder="Field key (snake_case, auto-filled from label)"
                    value={f.key}
                    onChange={(e) => update(i, { key: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs font-mono"
                  />
                  <input
                    placeholder="Help text"
                    value={f.help ?? ""}
                    onChange={(e) => update(i, { help: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs"
                  />
                  <input
                    placeholder="Placeholder"
                    value={f.placeholder ?? ""}
                    onChange={(e) => update(i, { placeholder: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs"
                  />
                  {(f.type === "number" || f.type === "rating") && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={f.min ?? ""}
                        onChange={(e) => update(i, { min: e.target.value ? Number(e.target.value) : undefined })}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={f.max ?? ""}
                        onChange={(e) => update(i, { max: e.target.value ? Number(e.target.value) : undefined })}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {i > 0 && (
                <div className="flex gap-2 text-xs flex-wrap">
                  <span className="text-neutral-500 self-center">Show only if</span>
                  <select
                    value={f.showIfFieldKey ?? ""}
                    onChange={(e) => update(i, { showIfFieldKey: e.target.value || undefined })}
                    className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
                  >
                    <option value="">— always shown —</option>
                    {priorFields(i).map((pf) => (
                      <option key={pf.key} value={pf.key}>{pf.label}</option>
                    ))}
                  </select>
                  {f.showIfFieldKey && (
                    <>
                      <span className="text-neutral-500 self-center">equals</span>
                      <input
                        value={f.showIfEquals ?? ""}
                        onChange={(e) => update(i, { showIfEquals: e.target.value })}
                        placeholder="value"
                        className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 flex-1"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" onClick={add} className="mt-3 text-sm px-3 py-1 border border-neutral-700 rounded">
        + Add field
      </button>
    </div>
  );
}
