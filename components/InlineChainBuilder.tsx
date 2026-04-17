"use client";

import { useState } from "react";

interface Level {
  level_index: number;
  approver_role: string;
  resolution: "any" | "all";
  time_limit_hours: number;
  escalation_action: "auto_approve" | "escalate" | "notify_admin";
}

const ROLES = [
  { v: "manager", l: "Direct Manager" },
  { v: "department_head", l: "Department Head" },
  { v: "reviewer", l: "Reviewer" },
  { v: "admin", l: "Admin" },
];

export default function InlineChainBuilder({
  name,
  initial,
}: {
  name: string;
  initial?: Level[];
}) {
  const [levels, setLevels] = useState<Level[]>(
    initial ?? [
      {
        level_index: 1,
        approver_role: "manager",
        resolution: "any",
        time_limit_hours: 48,
        escalation_action: "escalate",
      },
    ],
  );

  const update = (i: number, patch: Partial<Level>) =>
    setLevels((ls) =>
      ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );
  const remove = (i: number) =>
    setLevels((ls) =>
      ls
        .filter((_, idx) => idx !== i)
        .map((l, idx) => ({ ...l, level_index: idx + 1 })),
    );
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
      <input type="hidden" name={name} value={JSON.stringify(levels)} />
      <div className="space-y-2">
        {levels.map((l, i) => (
          <div
            key={i}
            className="border border-neutral-800 rounded p-3 flex flex-wrap gap-2 items-center"
          >
            <span className="text-neutral-500 text-sm w-6 shrink-0 text-center">
              {l.level_index}
            </span>
            <select
              value={l.approver_role}
              onChange={(e) => update(i, { approver_role: e.target.value })}
              className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm flex-1 min-w-32"
            >
              {ROLES.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </select>
            <select
              value={l.resolution}
              onChange={(e) =>
                update(i, { resolution: e.target.value as "any" | "all" })
              }
              className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm w-20"
            >
              <option value="any">Any</option>
              <option value="all">All</option>
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={l.time_limit_hours}
                onChange={(e) =>
                  update(i, { time_limit_hours: Number(e.target.value) })
                }
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm w-16"
              />
              <span className="text-xs text-neutral-500">hrs</span>
            </div>
            <select
              value={l.escalation_action}
              onChange={(e) =>
                update(i, {
                  escalation_action: e.target.value as Level["escalation_action"],
                })
              }
              className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
            >
              <option value="auto_approve">Auto-approve</option>
              <option value="escalate">Auto-escalate</option>
              <option value="notify_admin">Notify admin</option>
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-red-400 text-sm px-1 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {levels.length < 5 && (
        <button
          type="button"
          onClick={add}
          className="mt-2 text-xs px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
        >
          + Add approval level
        </button>
      )}
      {levels.length === 0 && (
        <p className="text-xs text-neutral-500 mt-2">
          No levels → reports from this department will be auto-approved.
        </p>
      )}
    </div>
  );
}
