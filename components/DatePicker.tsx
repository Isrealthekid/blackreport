"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => n.toString().padStart(2, "0");
const fmtIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const sameDay = (a: Date, b: Date | null) =>
  !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function DatePicker({ value, onChange, placeholder = "Pick date", min, max, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = parseIso(value);
  const minDate = parseIso(min ?? "");
  const maxDate = parseIso(max ?? "");
  const today = new Date();
  const [view, setView] = useState<Date>(() => selected ?? today);

  useEffect(() => {
    if (selected) setView(selected);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = prevMonthDays - startWeekday + 1 + i;
    cells.push({ date: new Date(year, month - 1, d), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const isDisabled = (d: Date) =>
    (!!minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) ||
    (!!maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()));

  const label = selected
    ? selected.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : placeholder;

  return (
    <div ref={ref} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-left min-w-40 flex items-center gap-2 hover:bg-neutral-800"
      >
        <span className={selected ? "text-neutral-100" : "text-neutral-500"}>{label}</span>
        <svg className="ml-auto w-4 h-4 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 bg-neutral-900 border border-neutral-700 rounded shadow-lg p-2 w-64">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setView(new Date(year - 1, month, 1))}
              className="px-2 py-1 hover:bg-neutral-800 rounded text-sm text-neutral-400"
              title="Previous year"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="px-2 py-1 hover:bg-neutral-800 rounded text-sm text-neutral-400"
              title="Previous month"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-neutral-200">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="px-2 py-1 hover:bg-neutral-800 rounded text-sm text-neutral-400"
              title="Next month"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => setView(new Date(year + 1, month, 1))}
              className="px-2 py-1 hover:bg-neutral-800 rounded text-sm text-neutral-400"
              title="Next year"
            >
              »
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase tracking-wide text-neutral-500 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {cells.map(({ date, inMonth }, i) => {
              const isSel = sameDay(date, selected);
              const isToday = sameDay(date, today);
              const disabled = isDisabled(date);
              const base = "py-1 rounded transition-colors";
              let cls = `${base} text-neutral-200 hover:bg-neutral-800`;
              if (!inMonth) cls = `${base} text-neutral-600 hover:bg-neutral-800`;
              if (isToday && !isSel) cls = `${base} text-indigo-300 hover:bg-neutral-800`;
              if (isSel) cls = `${base} bg-indigo-600 text-white hover:bg-indigo-500`;
              if (disabled) cls = `${base} text-neutral-700 cursor-not-allowed`;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(fmtIso(date));
                    setOpen(false);
                  }}
                  className={cls}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                if (!isDisabled(t)) {
                  onChange(fmtIso(t));
                  setOpen(false);
                }
              }}
              className="text-xs text-neutral-300 hover:text-white px-2 py-1"
            >
              Today
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-200 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
