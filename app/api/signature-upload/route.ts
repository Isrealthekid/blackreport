import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE = process.env.API_BASE_URL ?? "";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.formData();
  const res = await fetch(`${BASE}/api/v1/signatures`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
