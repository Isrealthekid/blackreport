import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE = process.env.API_BASE_URL ?? "";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jar = await cookies();
  const token = jar.get("br_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const res = await fetch(`${BASE}/api/v1/files/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.statusText }, { status: res.status });
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const disposition = res.headers.get("content-disposition") ?? "";
  const body = await res.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      ...(disposition ? { "Content-Disposition": disposition } : {}),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
