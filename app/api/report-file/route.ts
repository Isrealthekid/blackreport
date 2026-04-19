import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE = process.env.API_BASE_URL ?? "";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const reportId = formData.get("report_id") as string;
  if (!reportId) {
    return NextResponse.json({ error: "report_id required" }, { status: 400 });
  }

  // Forward the file + field_key to the backend.
  const backendForm = new FormData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  backendForm.append("file", file);
  const fieldKey = formData.get("field_key") as string;
  if (fieldKey) backendForm.append("field_key", fieldKey);

  const res = await fetch(`${BASE}/api/v1/reports/${reportId}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: backendForm,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: text || res.statusText }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: 201 });
}
