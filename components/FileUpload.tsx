"use client";

import { useState, useRef } from "react";

export default function FileUpload({
  fieldKey,
  reportId,
  existingValue,
  onValueChange,
}: {
  fieldKey: string;
  reportId: string | null;
  existingValue?: string;
  onValueChange: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>(existingValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = (name: string) =>
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setUploaded(false);

    // Show local preview for images.
    if (isImage(file.name)) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }

    // If report already exists, upload immediately.
    if (reportId) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append("report_id", reportId);
        form.append("field_key", fieldKey);
        form.append("file", file);
        const res = await fetch("/api/report-file", { method: "POST", body: form });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || `Upload failed (${res.status})`);
        }
        const data = await res.json();
        const ref = `file::${data.id}::${file.name}`;
        onValueChange(ref);
        setUploaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    } else {
      // New report — file will be uploaded after draft creation.
      onValueChange(file.name);
    }
  };

  // Show existing file preview if it's a file:: reference.
  const existingFileId = existingValue?.startsWith("file::")
    ? existingValue.split("::")[1]
    : null;

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 border border-neutral-700 rounded text-sm hover:bg-neutral-800 disabled:opacity-50 shrink-0"
        >
          {uploading ? "Uploading…" : "Choose file"}
        </button>
        <span className="text-sm text-neutral-400 truncate">
          {fileName || "No file selected"}
        </span>
      </div>

      {/* Hidden file input — name includes the field key for FormData pickup */}
      <input
        ref={inputRef}
        type="file"
        name={`__file__${fieldKey}`}
        className="hidden"
        onChange={handleChange}
      />
      {/* Hidden value input for the form data */}
      <input type="hidden" name={fieldKey} value={fileName} />

      {uploaded && (
        <p className="mt-1 text-xs text-green-400">✓ File uploaded successfully</p>
      )}
      {!reportId && fileName && !uploaded && (
        <p className="mt-1 text-xs text-yellow-400">
          File will be uploaded when you save the report.
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {/* Image preview */}
      {preview && (
        <div className="mt-2">
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs max-h-48 rounded border border-neutral-700 object-contain"
          />
        </div>
      )}
      {existingFileId && !preview && (
        <div className="mt-2">
          <img
            src={`/api/file/${existingFileId}`}
            alt="Attached file"
            className="max-w-xs max-h-48 rounded border border-neutral-700 object-contain"
          />
        </div>
      )}
    </div>
  );
}
