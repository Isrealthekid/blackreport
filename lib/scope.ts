import { apiMaybe } from "./api";
import type { Camp, Department, DepartmentMember, User } from "./types";

/**
 * Resolves the set of departments a user belongs to. Admins see every active
 * department. For non-admins we fan out to `/departments/{id}/members` to find
 * where they're listed.
 */
export async function getUserDepartments(user: User): Promise<Department[]> {
  const all = (await apiMaybe<Department[]>("/departments")) ?? [];
  const active = all.filter((d) => !d.is_archived);
  if (user.is_admin) return active;

  const checks = await Promise.all(
    active.map(async (d) => {
      const members = await apiMaybe<DepartmentMember[]>(`/departments/${d.id}/members`);
      return members?.some((m) => m.user_id === user.id) ? d : null;
    }),
  );
  return checks.filter((x): x is Department => x !== null);
}

/**
 * Returns camps where the user is a member (camper or supervisor).
 * Admins see all camps.
 */
export async function getUserCamps(user: User): Promise<Camp[]> {
  const all = (await apiMaybe<Camp[]>("/camps")) ?? [];
  if (user.is_admin) return all;

  const checks = await Promise.all(
    all.map(async (c) => {
      const detail = await apiMaybe<Camp>(`/camps/${c.id}`);
      return detail?.members?.some((m) => m.user_id === user.id) ? detail : null;
    }),
  );
  return checks.filter((x): x is Camp => x !== null);
}
