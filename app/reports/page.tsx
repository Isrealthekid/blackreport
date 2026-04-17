import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import type { Report } from "@/lib/types";

const statusColors: Record<string, string> = {
  draft: "bg-neutral-700 text-neutral-200",
  pending: "bg-blue-900 text-blue-200",
  approved: "bg-green-900 text-green-200",
  rejected: "bg-red-900 text-red-200",
  revision_requested: "bg-orange-900 text-orange-200",
  escalated: "bg-purple-900 text-purple-200",
  recalled: "bg-neutral-800 text-neutral-500",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const qs = sp.status ? `?status=${encodeURIComponent(sp.status)}` : "";
  const reports = (await apiMaybe<Report[]>(`/reports/mine${qs}`)) ?? [];
  const sorted = [...reports].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Reports</h1>
        <Link href="/reports/new" className="px-3 py-1.5 bg-white text-black rounded text-sm font-medium">
          New report
        </Link>
      </div>

      <form method="GET" className="mt-4 flex gap-2">
        <select name="status" defaultValue={sp.status ?? ""} className="bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["draft", "pending", "approved", "rejected", "revision_requested", "escalated", "recalled"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <button className="text-xs px-3 py-2 border border-neutral-700 rounded">Filter</button>
      </form>

      <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-4 py-2">ID</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Level</th>
              <th className="text-left px-4 py-2">Submitted</th>
              <th className="text-left px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-neutral-500">
                  No reports yet.
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-900">
                <td className="px-4 py-2">
                  <Link href={`/reports/${r.id}`} className="hover:underline font-mono text-xs">
                    {r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[r.status] ?? "bg-neutral-800"}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2 text-neutral-400">L{r.current_level}</td>
                <td className="px-4 py-2 text-neutral-400">
                  {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-400">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
