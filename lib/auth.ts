import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError, apiMaybe } from "./api";
import type { Organisation, User } from "./types";

export const SESSION_COOKIE = "br_token";

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return await api<User>("/me");
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      // Token is genuinely invalid/expired — clear it.
      return null;
    }
    // Network/server error — don't lose the session. Return a minimal user
    // object derived from the JWT so the sidebar still renders.
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString(),
      );
      return {
        id: payload.uid ?? payload.sub ?? "",
        email: "",
        full_name: "User",
        is_admin: !!payload.adm,
      };
    } catch {
      // Can't decode JWT either — truly broken.
      return null;
    }
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.is_admin) redirect("/dashboard");
  return user;
}

export async function getOrganisation(): Promise<Organisation | null> {
  return apiMaybe<Organisation>("/organisation");
}

export function can(user: User, action: string): boolean {
  if (user.is_admin) return true;
  switch (action) {
    case "submit_report":
    case "approve_report":
    case "view_notifications":
      return true;
    default:
      return false;
  }
}
