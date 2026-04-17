"use client";

import { useState } from "react";

interface Level {
  level_index: number;
  approver_role: string;
  resolution: "any" | "all";
  time_limit_hours: number;
  escalation_action: "auto_approve" | "escalate" | "notify_admin";
}

const ROLES: { v: string; l: string }[] = [
  { v: "manager", l: "Manager" },
  { v: "department_head", l: "Department Head" },
  { v: "reviewer", l: "Reviewer" },
  { v: "admin", l: "Admin" },
];

export default function ChainTemplateBuilder() {
  const [levels, setLevels] = useState<Level[]>([
    {
      level_index: 1,
      approver_role: "manager",
      resolution: "any",
      time_limit_hours: 48,
      escalation_action: "escalate",
    },
  ]);

  const update = (i: number, patch: Partial<Level>) =>
    setLevels((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const remove = (i: number) =>
    setLevels((ls) => ls.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, level_index: idx + 1 })));
  const add = () => {
    if (levels.length >= 5) return;
    setLevels((ls) => [
      ...ls,
      {
        level_index: ls.length + 1,
        approver_role: "department_head",
        resolution: "any",
        time_limit_hours: 48,
        escalation_action: "notify_admin",
      },
    ]);
  };

  return (
    <div>
      <input type="hidden" name="levels" value={JSON.stringify(levels)} />
      <div className="space-y-2">
        {levels.map((l, i) => (
          <div key={i} className="border border-neutral-800 rounded p-3 grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1 text-center text-neutral-500 text-sm">#{l.level_index}</div>
            <select
              value={l.approver_role}
              onChange={(e) => update(i, { approver_role: e.target.value })}
              className="col-span-4 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
            >
              {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
            <select
              value={l.resolution}
              onChange={(e) => update(i, { resolution: e.target.value as "any" | "all" })}
              className="col-span-2 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
            >
              <option value="any">Any</option>
              <option value="all">All</option>
            </select>
            <input
              type="number"
              value={l.time_limit_hours}
              onChange={(e) => update(i, { time_limit_hours: Number(e.target.value) })}
              className="col-span-2 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
            />
            <select
              value={l.escalation_action}
              onChange={(e) => update(i, { escalation_action: e.target.value as Level["escalation_action"] })}
              className="col-span-2 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
            >
              <option value="auto_approve">Auto-approve</option>
              <option value="escalate">Escalate</option>
              <option value="notify_admin">Notify admin</option>
            </select>
            <button type="button" onClick={() => remove(i)} className="col-span-1 text-red-400 text-sm">
              ✕
            </button>
          </div>
        ))}
      </div>
      {levels.length < 5 && (
        <button type="button" onClick={add} className="mt-3 text-sm px-3 py-1 border border-neutral-700 rounded">
          + Add level
        </button>
      )}
    </div>
  );
}
