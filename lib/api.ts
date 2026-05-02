import { cookies } from "next/headers";

const BASE = process.env.API_BASE_URL ?? "";
const PREFIX = "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type ApiInit = Omit<RequestInit, "body"> & { body?: unknown };

async function authHeaders(): Promise<Record<string, string>> {
  const jar = await cookies();
  const token = jar.get("br_token")?.value;
  const h: Record<string, string> = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeaders()),
    ...(init.headers as Record<string, string> | undefined),
  };
  const body = init.body !== undefined ? JSON.stringify(init.body) : undefined;
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    ...init,
    headers,
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    let code = "error";
    let message = res.statusText;
    try {
      const err = (await res.json()) as { error?: string; message?: string };
      code = err.error ?? code;
      message = err.message ?? message;
    } catch {}
    throw new ApiError(res.status, code, message);
  }
  if (res.status === 204) return undefined as T;
  const txt = await res.text();
  if (!txt) return undefined as T;
  return JSON.parse(txt) as T;
}

/**
 * apiMaybe — wraps `api()` and returns `null` ONLY when the resource is
 * genuinely missing (404). Auth, permission, and server failures are
 * re-thrown so callers can render a real error state instead of silently
 * showing "no results". Use `apiOptional` if you really do want to swallow
 * everything.
 */
export async function apiMaybe<T>(path: string, init?: ApiInit): Promise<T | null> {
  try {
    return await api<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return null;
    }
    throw e;
  }
}

/** Truly best-effort fetch — returns null on any error. Use sparingly. */
export async function apiOptional<T>(path: string, init?: ApiInit): Promise<T | null> {
  try {
    return await api<T>(path, init);
  } catch {
    return null;
  }
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, "error", res.statusText);
  }
  return (await res.json()) as T;
}
