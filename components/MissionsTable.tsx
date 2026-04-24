"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Mission } from "@/lib/types";
import DatePicker from "./DatePicker";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  submitted: "bg-yellow-900 text-yellow-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25, 50];

interface CampSummary {
  id: string;
  site_name: string;
}

interface Props {
  missions: Mission[];
  campRecord: Record<string, { site_name: string }>;
  userNameRecord: Record<string, string>;
  camps: CampSummary[];
  currentUserId: string;
  showUserCol?: boolean;
  /** How to render the CTA for draft missions:
   *  "continue" → prominent "Continue filling →" button (My Missions view)
   *  "fill-forms" → standard View+Print, plus a secondary "Fill forms" link for own drafts (All Missions view)
   */
  draftCta?: "continue" | "fill-forms";
}

export default function MissionsTable({
  missions,
  campRecord,
  userNameRecord,
  camps,
  currentUserId,
  showUserCol = true,
  draftCta = "fill-forms",
}: Props) {
  const [search, setSearch] = useState("");
  const [campFilter, setCampFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let items = missions;

    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter((m) => {
        const name = userNameRecord[m.reporter_id ?? ""] ?? "";
        return (
          m.mission_number.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          name.toLowerCase().includes(q)
        );
      });
    }

    if (campFilter) items = items.filter((m) => m.camp_id === campFilter);
    if (statusFilter) items = items.filter((m) => m.status === statusFilter);

    if (dateFrom) {
      const fromMs = new Date(dateFrom).setHours(0, 0, 0, 0);
      items = items.filter((m) => new Date(m.created_at).getTime() >= fromMs);
    }
    if (dateTo) {
      const toMs = new Date(dateTo).setHours(23, 59, 59, 999);
      items = items.filter((m) => new Date(m.created_at).getTime() <= toMs);
    }

    return items;
  }, [missions, search, campFilter, statusFilter, dateFrom, dateTo, userNameRecord]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetPage = () => setPage(1);

  const colCount = 5 + (showUserCol ? 1 : 0) + 1; // camp + [user] + created + status + sac + actions

  return (
    <div>
      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage(); }}
          placeholder="Search by mission # or name…"
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm flex-1 min-w-50"
        />

        {camps.length > 1 && (
          <select
            value={campFilter}
            onChange={(e) => { setCampFilter(e.target.value); resetPage(); }}
            className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
          >
            <option value="">All camps</option>
            {camps.map((c) => (
              <option key={c.id} value={c.id}>{c.site_name}</option>
            ))}
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

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
              <th className="text-left px-4 py-2">Mission #</th>
              <th className="text-left px-4 py-2">Camp</th>
              {showUserCol && <th className="text-left px-4 py-2">User</th>}
              <th className="text-left px-4 py-2">Created</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">SAC Forms</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={colCount} className="text-center py-10 text-neutral-500">
                  No missions found.
                </td>
              </tr>
            )}
            {paginated.map((m) => {
              const camp = campRecord[m.camp_id];
              const isDraft = m.status === "draft";
              const isOwn = m.reporter_id === currentUserId;
              const userName = m.reporter_id
                ? (userNameRecord[m.reporter_id] ?? m.reporter_id.slice(0, 8))
                : "—";

              return (
                <tr key={m.id} className="border-t border-neutral-800 hover:bg-neutral-900">
                  <td className="px-4 py-2">
                    <Link
                      href={`/missions/${m.id}`}
                      className="hover:underline font-mono font-medium"
                    >
                      {m.mission_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">{camp?.site_name ?? "—"}</td>
                  {showUserCol && (
                    <td className="px-4 py-2 text-neutral-400">{userName}</td>
                  )}
                  <td className="px-4 py-2 text-neutral-400">{fmtDateTime(m.created_at)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${statusColors[m.status] ?? "bg-neutral-800"}`}
                    >
                      {statusLabels[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 text-xs">
                      <span className={m.has_sac16 ? "text-green-400" : "text-neutral-600"}>
                        16{m.has_sac16 ? "✓" : ""}
                      </span>
                      <span className={m.has_sac17 ? "text-green-400" : "text-neutral-600"}>
                        17{m.has_sac17 ? "✓" : ""}
                      </span>
                      <span className={m.has_sac18 ? "text-green-400" : "text-neutral-600"}>
                        18{m.has_sac18 ? "✓" : ""}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      {draftCta === "continue" && isDraft ? (
                        <Link
                          href={`/missions/${m.id}`}
                          className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                        >
                          Continue filling →
                        </Link>
                      ) : (
                        <>
                          <Link
                            href={`/missions/${m.id}`}
                            className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                          >
                            View
                          </Link>
                          <Link
                            href={`/missions/${m.id}/print`}
                            target="_blank"
                            className="text-xs px-2 py-1 border border-neutral-700 rounded hover:bg-neutral-800"
                          >
                            Print
                          </Link>
                          {draftCta === "fill-forms" && isDraft && isOwn && (
                            <Link
                              href={`/missions/${m.id}`}
                              className="text-xs px-2 py-1 border border-indigo-700 text-indigo-300 rounded hover:bg-indigo-950"
                            >
                              Fill forms
                            </Link>
                          )}
                        </>
                      )}
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
