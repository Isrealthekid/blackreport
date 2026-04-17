"use client";

import { useRef, useState, useCallback } from "react";

export default function SignatureCapture({
  onCaptured,
}: {
  onCaptured: (signatureId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setError(null);
      setPreview(null);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    setPreview(dataUrl);
    // Stop the stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  }, []);

  const upload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setUploading(true);
    try {
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/png"),
      );
      const form = new FormData();
      form.append("file", blob, "signature.png");

      const res = await fetch("/api/signature-upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { id } = await res.json();
      onCaptured(id);
    } catch (e) {
      setError("Failed to upload signature. Try again.");
    } finally {
      setUploading(false);
    }
  }, [onCaptured]);

  const retake = useCallback(() => {
    setPreview(null);
    startCamera();
  }, [startCamera]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-800 rounded p-2">
          {error}
        </div>
      )}

      {!streaming && !preview && (
        <button
          type="button"
          onClick={startCamera}
          className="px-3 py-2 border border-neutral-700 rounded text-sm hover:bg-neutral-800"
        >
          Open camera to sign
        </button>
      )}

      <video
        ref={videoRef}
        className={`rounded border border-neutral-700 ${streaming ? "" : "hidden"}`}
        style={{ maxWidth: 400 }}
        playsInline
        muted
      />

      <canvas ref={canvasRef} className="hidden" />

      {streaming && (
        <button
          type="button"
          onClick={capture}
          className="px-4 py-2 bg-white text-black font-medium rounded"
        >
          Capture signature
        </button>
      )}

      {preview && (
        <div>
          <img
            src={preview}
            alt="Captured signature"
            className="rounded border border-neutral-700"
            style={{ maxWidth: 400 }}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={upload}
              disabled={uploading}
              className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-medium disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Confirm & upload"}
            </button>
            <button
              type="button"
              onClick={retake}
              className="px-3 py-2 border border-neutral-700 rounded text-sm hover:bg-neutral-800"
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
