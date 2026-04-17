import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, apiMaybe } from "./api";
import type { Organisation, User } from "./types";

export const SESSION_COOKIE = "br_token";

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)) return null;
  return apiMaybe<User>("/me");
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
