import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import { markNotificationReadAction } from "@/app/actions";
import type { Notification } from "@/lib/types";

export default async function NotificationsPage() {
  await requireUser();
  const raw = await apiMaybe<unknown>("/notifications");
  const items = extractItems<Notification>(raw);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {items.some((n) => !n.read) && (
          <form action={markNotificationReadAction}>
            <input type="hidden" name="id" value="all" />
            <button className="text-xs px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-800">
              Mark all read
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {items.length === 0 && (
          <p className="text-neutral-500 text-sm">No notifications yet.</p>
        )}
        {items.map((n) => (
          <div
            key={n.id}
            className={`border rounded-lg p-3 flex items-start justify-between gap-3 ${
              n.read ? "border-neutral-900 opacity-60" : "border-neutral-700"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs text-neutral-500">
                {new Date(n.created_at).toLocaleString()} · {n.kind.replace("_", " ")}
              </div>
              {n.link ? (
                <Link href={n.link} className="font-medium hover:underline">
                  {n.title}
                </Link>
              ) : (
                <div className="font-medium">{n.title}</div>
              )}
              {n.body && <div className="text-sm text-neutral-400 mt-1">{n.body}</div>}
            </div>
            {!n.read && (
              <form action={markNotificationReadAction}>
                <input type="hidden" name="id" value={n.id} />
                <button className="text-xs text-neutral-400 hover:text-white">
                  Mark read
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
