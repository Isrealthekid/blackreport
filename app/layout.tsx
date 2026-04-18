import type { Metadata } from "next";
import "./globals.css";
import { can, getCurrentUser, getOrganisation } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import { getUserCamps } from "@/lib/scope";
import AppShell, { type NavLink } from "@/components/AppShell";
import type { Camp, Department, DepartmentMember, Notification, User } from "@/lib/types";

export const metadata: Metadata = {
  title: "Black Report",
  description: "Reporting platform for teams",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <html lang="en">
        <body className="antialiased">
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </body>
      </html>
    );
  }

  // Fetch org, notifications, camps, and department membership in parallel.
  const [org, notifsRaw, myCamps, deptsRaw] = await Promise.all([
    getOrganisation(),
    apiMaybe<unknown>("/notifications"),
    getUserCamps(user),
    apiMaybe<unknown>("/departments"),
  ]);

  const allDepts = extractItems<Department>(deptsRaw);
  const unread = extractItems<Notification>(notifsRaw).filter((n) => !n.read).length;
  const orgName = org?.name ?? "Black Report";
  const orgLogo = org?.logo_url ? "◼" : "◼";

  // Determine if user is in any department (as any role).
  let inDepartment = false;
  if (user.is_admin) {
    inDepartment = true;
  } else {
    const checks = await Promise.all(
      allDepts
        .filter((d) => !d.is_archived)
        .map(async (d) => {
          const members = extractItems<DepartmentMember>(
            await apiMaybe<unknown>(`/departments/${d.id}/members`),
          );
          return members.some((m) => m.user_id === user.id);
        }),
    );
    inDepartment = checks.some(Boolean);
  }

  const inCamp = myCamps.length > 0;

  // ── Build links based on actual memberships ──
  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: "▤", section: "Main" },
  ];

  // Reports section — only if user is in a department (or admin).
  if (inDepartment) {
    links.push({ href: "/reports", label: "Reports", icon: "▪", section: "Reports" });
    links.push({ href: "/reports/new", label: "New Report", icon: "+", section: "Reports" });
    links.push({ href: "/approvals", label: "Approvals", icon: "✓", section: "Reports" });
  }

  // Drone Ops section — only if user is in a camp (or admin).
  if (inCamp || user.is_admin) {
    links.push({ href: "/camps", label: "Camps", icon: "⛺", section: "Drone Ops" });
    links.push({ href: "/missions", label: "Missions", icon: "✈", section: "Drone Ops" });
  }

  // Always show notifications.
  links.push({ href: "/notifications", label: "Notifications", icon: "◉", section: "Main" });

  // Admin sections.
  if (can(user, "manage_org")) {
    links.push({ href: "/clients", label: "Clients", icon: "◆", section: "Configure" });
    links.push({ href: "/templates", label: "Templates", icon: "▦", section: "Configure" });
    links.push({ href: "/departments", label: "Departments", icon: "⌂", section: "Configure" });
    links.push({ href: "/chains", label: "Chain Templates", icon: "↳", section: "Configure" });
    links.push({ href: "/users", label: "Users", icon: "◎", section: "Admin" });
    links.push({ href: "/organisation", label: "Organisation", icon: "⌘", section: "Admin" });
  }

  return (
    <html lang={org?.locale ?? "en"}>
      <body className="antialiased">
        <AppShell
          links={links}
          user={{ name: user.full_name, email: user.email }}
          orgName={orgName}
          orgLogo={orgLogo}
          unreadNotifications={unread}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
