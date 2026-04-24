"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Mission } from "@/lib/types";
import DatePicker from "./DatePicker";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  draft: "bg-neutral-800 text-neutral-200 border-neutral-700",
  submitted: "bg-yellow-950 text-yellow-200 border-yellow-900",
  approved: "bg-green-950 text-green-200 border-green-900",
  rejected: "bg-red-950 text-red-200 border-red-900",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const PAGE_SIZE_OPTIONS = [10, 20, 50];

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
  /** What kind of CTA each row's primary button should be:
   *   "auto"      → derive from status: draft→Continue, submitted→Review, else→View
   *   "view-only" → always "View"
   */
  primaryAction?: "auto" | "view-only";
  /** Hide the filter bar (useful for embedded mini-lists). */
  hideFilters?: boolean;
}

export default function MissionsTable({
  missions,
  campRecord,
  userNameRecord,
  camps,
  currentUserId,
  showUserCol = true,
  primaryAction = "auto",
  hideFilters = false,
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
      items = items.filter((m) => new Date(m.mission_date).getTime() >= fromMs);
    }
    if (dateTo) {
      const toMs = new Date(dateTo).setHours(23, 59, 59, 999);
      items = items.filter((m) => new Date(m.mission_date).getTime() <= toMs);
    }

    return items;
  }, [missions, search, campFilter, statusFilter, dateFrom, dateTo, userNameRecord]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetPage = () => setPage(1);

  return (
    <div>
      {/* ── Filter bar ── */}
      {!hideFilters && (
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

          <span className="text-xs text-neutral-500 ml-auto">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Card list ── */}
      <div className="space-y-2">
        {paginated.length === 0 && (
          <div className="border border-dashed border-neutral-800 rounded-lg py-12 text-center text-sm text-neutral-500">
            No missions match these filters.
          </div>
        )}

        {paginated.map((m) => {
          const camp = campRecord[m.camp_id];
          const isDraft = m.status === "draft";
          const isSubmitted = m.status === "submitted";
          const isOwn = m.reporter_id === currentUserId;
          const userName = m.reporter_id
            ? (userNameRecord[m.reporter_id] ?? m.reporter_id.slice(0, 8))
            : "—";

          const sacFilled =
            (m.has_sac16 ? 1 : 0) +
            (m.has_sac17 ? 1 : 0) +
            (m.has_sac18 ? 1 : 0);

          // Resolve the single primary action label + style.
          let cta: { label: string; className: string };
          if (primaryAction === "view-only") {
            cta = {
              label: "View",
              className: "border border-neutral-700 hover:bg-neutral-800",
            };
          } else if (isDraft && isOwn) {
            cta = {
              label: "Continue →",
              className: "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600",
            };
          } else if (isSubmitted) {
            cta = {
              label: "Review →",
              className: "bg-yellow-700 hover:bg-yellow-600 text-yellow-50 border-yellow-700",
            };
          } else {
            cta = {
              label: "View",
              className: "border border-neutral-700 hover:bg-neutral-800",
            };
          }

          const approvedBy = m.approved_by
            ? userNameRecord[m.approved_by] ?? m.approved_by.slice(0, 8)
            : null;
          const approvedAt = m.approved_at
            ? fmtDate(m.approved_at)
            : null;
          const rejectedBy = m.rejected_by
            ? userNameRecord[m.rejected_by] ?? m.rejected_by.slice(0, 8)
            : null;

          return (
            <Link
              key={m.id}
              href={`/missions/${m.id}`}
              className="group block border border-neutral-800 hover:border-neutral-600 rounded-lg p-4 transition"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: identity */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-base">
                      {m.mission_number}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                        statusColors[m.status] ?? "bg-neutral-800 border-neutral-700"
                      }`}
                    >
                      {statusLabels[m.status] ?? m.status}
                    </span>
                    {m.current_approval_level && m.current_approval_level > 0 && isSubmitted && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                        L{m.current_approval_level}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-neutral-400">
                    {camp?.site_name ?? "—"} · {fmtDate(m.mission_date)}
                    {showUserCol && ` · ${userName}`}
                  </div>
                  {m.status === "approved" && approvedBy && (
                    <div className="mt-1 text-xs text-green-400">
                      ✓ Approved by {approvedBy}
                      {approvedAt ? ` on ${approvedAt}` : ""}
                    </div>
                  )}
                  {m.status === "rejected" && rejectedBy && (
                    <div className="mt-1 text-xs text-red-400">
                      ✗ Rejected by {rejectedBy}
                    </div>
                  )}
                </div>

                {/* Middle: SAC progress */}
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1">
                    {[m.has_sac16, m.has_sac17, m.has_sac18].map((done, i) => (
                      <span
                        key={i}
                        title={`SAC ${16 + i}`}
                        className={`w-2.5 h-2.5 rounded-full ${
                          done ? "bg-green-500" : "bg-neutral-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {sacFilled}/3
                  </span>
                </div>

                {/* Right: single action */}
                <span
                  className={`shrink-0 text-xs px-3 py-1.5 rounded font-medium transition ${cta.className}`}
                >
                  {cta.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Pagination footer ── */}
      {filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Per page:</span>
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
              {`${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)}`}{" "}
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
              {safePage} / {totalPages}
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
      )}
    </div>
  );
}
