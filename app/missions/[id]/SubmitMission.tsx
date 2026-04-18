"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SignatureCapture from "@/components/SignatureCapture";

export default function SubmitMission({
  missionId,
  allFormsComplete,
}: {
  missionId: string;
  allFormsComplete: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "signature" | "submitting" | "done">("idle");
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignatureCaptured = useCallback((id: string) => {
    setSignatureId(id);
    setStep("idle");
  }, []);

  const handleSubmit = async () => {
    if (!signatureId) {
      setStep("signature");
      return;
    }
    setStep("submitting");
    setError(null);
    try {
      const res = await fetch("/api/mission-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId, signatureId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error ${res.status}`);
      }
      setStep("done");
      router.push(`/missions/${missionId}?submitted=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setStep("idle");
    }
  };

  if (!allFormsComplete) {
    return (
      <div className="text-center">
        <button
          disabled
          className="w-full px-4 py-3 bg-neutral-800 text-neutral-500 font-semibold rounded cursor-not-allowed text-lg"
        >
          Submit Mission for Approval
        </button>
        <p className="text-xs text-neutral-500 mt-2">
          Complete all three SAC forms above before submitting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 border border-red-800 bg-red-950/30 rounded text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Step 1: Signature capture */}
      {!signatureId && step !== "signature" && (
        <div className="border border-neutral-800 rounded-lg p-4">
          <div className="font-semibold">Verification required</div>
          <p className="text-xs text-neutral-500 mt-1">
            Capture a photo of yourself for identity verification before submitting.
          </p>
          <button
            type="button"
            onClick={() => setStep("signature")}
            className="mt-3 px-4 py-2 border border-indigo-700 text-indigo-300 rounded hover:bg-indigo-950/30"
          >
            Open camera for verification photo
          </button>
        </div>
      )}

      {step === "signature" && (
        <div className="border border-indigo-800 bg-indigo-950/20 rounded-lg p-4">
          <div className="font-semibold text-indigo-200">Capture verification photo</div>
          <p className="text-xs text-indigo-300/60 mt-1 mb-3">
            Take a live photo using your camera. File uploads are not accepted.
          </p>
          <SignatureCapture onCaptured={handleSignatureCaptured} />
        </div>
      )}

      {signatureId && (
        <div className="border border-green-800 bg-green-950/20 rounded-lg p-3 flex items-center gap-3">
          <span className="text-green-400 text-lg">✓</span>
          <div>
            <div className="text-sm text-green-200">Verification photo uploaded</div>
            <div className="text-xs text-neutral-500">ID: {signatureId.slice(0, 12)}…</div>
          </div>
          <button
            type="button"
            onClick={() => { setSignatureId(null); setStep("signature"); }}
            className="ml-auto text-xs text-neutral-400 hover:text-white"
          >
            Retake
          </button>
        </div>
      )}

      {/* Step 2: Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!signatureId || step === "submitting"}
        className={`w-full px-4 py-3 font-semibold rounded text-lg transition ${
          signatureId
            ? "bg-white text-black hover:bg-neutral-200"
            : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
        }`}
      >
        {step === "submitting" ? "Submitting…" : "Submit Mission for Approval"}
      </button>
      {!signatureId && (
        <p className="text-xs text-neutral-500 text-center">
          Upload your verification photo first.
        </p>
      )}
    </div>
  );
}
