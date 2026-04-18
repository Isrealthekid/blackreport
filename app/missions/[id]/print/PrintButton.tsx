"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-xs px-3 py-1 border border-neutral-400 rounded hover:bg-neutral-100 text-neutral-700"
    >
      Print / Save PDF
    </button>
  );
}
