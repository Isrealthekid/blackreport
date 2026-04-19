"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallback }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => (fallback ? router.push(fallback) : router.back())}
      className="text-sm text-neutral-400 hover:text-white mb-4 flex items-center gap-1"
    >
      <span>←</span> Back
    </button>
  );
}
