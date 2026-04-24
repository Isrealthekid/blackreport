"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type View = "all" | "mine" | "review";

export default function MissionsTabs({
  current,
  counts,
  showAll,
  showReview,
}: {
  current: View;
  counts: { all: number; mine: number; review: number };
  showAll: boolean;
  showReview: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const setView = (v: View) => {
    const params = new URLSearchParams(sp);
    params.set("view", v);
    router.replace(`/missions?${params.toString()}`, { scroll: false });
  };

  const tabs: { key: View; label: string; count: number; show: boolean }[] = [
    { key: "all", label: "All missions", count: counts.all, show: showAll },
    { key: "mine", label: "My missions", count: counts.mine, show: true },
    { key: "review", label: "Awaiting my review", count: counts.review, show: showReview },
  ];

  return (
    <div className="flex border-b border-neutral-800 mb-5">
      {tabs.filter((t) => t.show).map((t) => {
        const active = t.key === current;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setView(t.key)}
            className={`relative px-4 py-2 text-sm transition border-b-2 -mb-px ${
              active
                ? "border-white text-white"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span>{t.label}</span>
            {t.count > 0 && (
              <span
                className={`ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-semibold ${
                  active
                    ? "bg-white text-black"
                    : t.key === "review"
                    ? "bg-yellow-900 text-yellow-200"
                    : "bg-neutral-800 text-neutral-300"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
