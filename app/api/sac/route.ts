import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BASE = process.env.API_BASE_URL ?? "";

export async function PUT(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { missionId, form, payload } = await req.json();
  if (!missionId || !form || !payload) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const url = `${BASE}/api/v1/missions/${missionId}/${form}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: text || res.statusText },
      { status: res.status },
    );
  }

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data);
}
