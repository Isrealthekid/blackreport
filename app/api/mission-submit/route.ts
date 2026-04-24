import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE = process.env.API_BASE_URL ?? "";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { missionId, signatureId } = await req.json();
  if (!missionId) {
    return NextResponse.json({ error: "missing missionId" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Attach signature to SAC 18 (RP sign) if provided.
  if (signatureId) {
    try {
      await fetch(`${BASE}/api/v1/missions/${missionId}/sac18/rp-sign`, {
        method: "POST",
        headers,
        body: JSON.stringify({ signature_id: signatureId, confirmed: true }),
      });
    } catch {
      // best-effort
    }
  }

  // Submit through the chain-of-command (POST /missions/:id/submit).
  // Backend auto-approves if no chain is attached to the camp.
  const res = await fetch(`${BASE}/api/v1/missions/${missionId}/submit`, {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }

  return NextResponse.json({ ok: true, signatureId });
}
