"use client";

import { useEffect } from "react";

export default function PrintButton({ fileName }: { fileName?: string }) {
  useEffect(() => {
    if (!fileName) return;
    const original = document.title;
    document.title = fileName;
    return () => {
      document.title = original;
    };
  }, [fileName]);

  return (
    <button
      onClick={() => {
        if (fileName) document.title = fileName;
        window.print();
      }}
      className="text-xs px-3 py-1 border border-neutral-400 rounded hover:bg-neutral-100 text-neutral-700"
    >
      Print / Save PDF
    </button>
  );
}
