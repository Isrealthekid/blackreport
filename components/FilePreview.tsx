"use client";

import { useState } from "react";

export default function FilePreview({ value }: { value: string }) {
  const [fullView, setFullView] = useState(false);

  // Parse "file::{fileId}::{filename}" format.
  const parts = value.split("::");
  const isFileRef = parts[0] === "file" && parts.length >= 3;
  const fileId = isFileRef ? parts[1] : null;
  const filename = isFileRef ? parts.slice(2).join("::") : value;
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(filename);

  if (!fileId) {
    return <span>{value}</span>;
  }

  const src = `/api/file/${fileId}`;

  return (
    <div>
      {isImage ? (
        <>
          <img
            src={src}
            alt={filename}
            className="max-w-sm max-h-52 rounded border border-neutral-700 object-contain cursor-pointer hover:opacity-80"
            onClick={() => setFullView(true)}
          />
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-neutral-500">{filename}</span>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              View full size
            </a>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm">📎 {filename}</span>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            Download
          </a>
        </div>
      )}

      {/* Full-screen overlay */}
      {fullView && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setFullView(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={src}
              alt={filename}
              className="max-w-full max-h-[90vh] object-contain rounded"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1 bg-white text-black text-xs rounded hover:bg-neutral-200"
              >
                Open original
              </a>
              <button
                onClick={() => setFullView(false)}
                className="px-3 py-1 bg-neutral-800 text-white text-xs rounded hover:bg-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
