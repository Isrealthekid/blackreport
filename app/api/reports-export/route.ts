import { cookies } from "next/headers";

const BASE = process.env.API_BASE_URL ?? "";

// Streams the upstream CSV through, attaching the auth cookie. Lets us avoid
// exposing the JWT to the browser while still letting the browser download.
export async function GET(req: Request) {
  const jar = await cookies();
  const token = jar.get("br_token")?.value;
  if (!token) {
    return new Response("unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const upstream = `${BASE}/api/v1/reports/export.csv?${url.searchParams.toString()}`;
  const r = await fetch(upstream, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    return new Response(txt || r.statusText, { status: r.status });
  }
  return new Response(r.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reports-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
