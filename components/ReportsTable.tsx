"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Report } from "@/lib/types";
import DatePicker from "./DatePicker";

const statusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  pending: "bg-yellow-900 text-yellow-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
  revision_requested: "bg-orange-900 text-orange-200",
  escalated: "bg-purple-900 text-purple-200",
  recalled: "bg-neutral-800 text-neutral-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision Requested",
  escalated: "Escalated",
  recalled: "Recalled",
};

const ALL_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "revision_requested",
  "escalated",
  "recalled",
] as const;

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 50];

interface DeptSummary {
  id: string;
  name: string;
}

interface Props {
  reports: Report[];
  deptRecord: Record<string, { name: string }>;
  userRecord: Record<string, { full_name: string }>;
  departments: DeptSummary[];
  showReporterCol: boolean;
  showDeptCol: boolean;
}

export default function ReportsTable({
  reports,
  deptRecord,
  userRecord,
  departments,
  showReporterCol,
  showDeptCol,
}: Props) {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let items = reports;

    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter((r) => {
        const reporter =
          userRecord[r.reporter_id]?.full_name ??
          (r.data?.name ? String(r.data.name) : "");
        return (
          r.id.toLowerCase().includes(q) ||
          reporter.toLowerCase().includes(q)
        );
      });
    }

    if (deptFilter) items = items.filter((r) => r.department_id === deptFilter);
    if (statusFilter) items = items.filter((r) => r.status === statusFilter);

    if (dateFrom || dateTo) {
      const fromMs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : -Infinity;
      const toMs = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : Infinity;
      items = items.filter((r) => {
        const iso = r.submitted_at ?? r.created_at;
        if (!iso) return false;
        const t = new Date(iso).getTime();
        return t >= fromMs && t <= toMs;
      });
    }

    return items;
  }, [reports, search, deptFilter, statusFilter, dateFrom, dateTo, userRecord]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetPage = () => setPage(1);

  const colCount = 4 + (showReporterCol ? 1 : 0) + (showDeptCol ? 1 : 0);

  return (
    <div>
      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          placeholder="Search by report ID or reporter name…"
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm flex-1 min-w-50"
        />

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>

        {showDeptCol && departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); resetPage(); }}
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <span>From</span>
          <DatePicker
            value={dateFrom}
            max={dateTo || undefined}
            placeholder="Start date"
            onChange={(v) => { setDateFrom(v); resetPage(); }}
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <span>To</span>
          <DatePicker
            value={dateTo}
            min={dateFrom || undefined}
            placeholder="End date"
            onChange={(v) => { setDateTo(v); resetPage(); }}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={() => { setDateFrom(""); setDateTo(""); resetPage(); }}
            className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800 text-neutral-400"
          >
            Clear dates
          </button>
        )}

        <span className="text-xs text-neutral-500 ml-1">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">ID</th>
              {showReporterCol && <th className="text-left px-4 py-2">Reporter</th>}
              {showDeptCol && <th className="text-left px-4 py-2">Department</th>}
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Submitted</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={colCount} className="text-center py-10 text-neutral-500">
                  No reports found.
                </td>
              </tr>
            )}
            {paginated.map((r) => {
              const reporter =
                userRecord[r.reporter_id]?.full_name ??
                (r.data?.name ? String(r.data.name) : r.reporter_id.slice(0, 8));
              const dept = deptRecord[r.department_id]?.name ?? "—";

              return (
                <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-900">
                  <td className="px-4 py-2">
                    <Link
                      href={`/reports/${r.id}`}
                      className="hover:underline font-mono text-xs"
                    >
                      {r.id.slice(0, 8)}
                    </Link>
                  </td>
                  {showReporterCol && (
                    <td className="px-4 py-2 text-neutral-300">{reporter}</td>
                  )}
                  {showDeptCol && (
                    <td className="px-4 py-2 text-neutral-400">{dept}</td>
                  )}
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${statusColors[r.status] ?? "bg-neutral-800"}`}
                    >
                      {statusLabels[r.status] ?? r.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">
                    {r.submitted_at
                      ? new Date(r.submitted_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/reports/${r.id}`}
                        className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/reports/${r.id}/print`}
                        target="_blank"
                        className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                      >
                        Print
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination footer ── */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span>
            {filtered.length === 0
              ? "0"
              : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)}`}{" "}
            of {filtered.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-2 py-1 border border-neutral-700 rounded disabled:opacity-40 hover:bg-neutral-800"
          >
            ←
          </button>
          <span>
            Page {safePage} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-2 py-1 border border-neutral-700 rounded disabled:opacity-40 hover:bg-neutral-800"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
