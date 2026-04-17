import type { Metadata } from "next";
import "./globals.css";
import { can, getCurrentUser, getOrganisation } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import AppShell, { type NavLink } from "@/components/AppShell";
import type { Notification, User } from "@/lib/types";

export const metadata: Metadata = {
  title: "Black Report",
  description: "Reporting platform for teams",
};

function buildLinks(user: User): NavLink[] {
  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: "▤", section: "Main" },
    { href: "/reports", label: "My Reports", icon: "▪", section: "Main" },
    { href: "/reports/new", label: "New Report", icon: "+", section: "Main" },
    { href: "/approvals", label: "Approvals", icon: "✓", section: "Main" },
    { href: "/notifications", label: "Notifications", icon: "◉", section: "Main" },
  ];

  // Drone ops — visible to everyone (campers see their camps/missions)
  links.push({ href: "/camps", label: "Camps", icon: "⛺", section: "Drone Ops" });
  links.push({ href: "/missions", label: "Missions", icon: "✈", section: "Drone Ops" });

  if (can(user, "manage_org")) {
    links.push({ href: "/clients", label: "Clients", icon: "◆", section: "Configure" });
    links.push({ href: "/templates", label: "Templates", icon: "▦", section: "Configure" });
    links.push({ href: "/departments", label: "Departments", icon: "⌂", section: "Configure" });
    links.push({ href: "/chains", label: "Chain Templates", icon: "↳", section: "Configure" });
    links.push({ href: "/users", label: "Users", icon: "◎", section: "Admin" });
    links.push({ href: "/organisation", label: "Organisation", icon: "⌘", section: "Admin" });
  }

  return links;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const [org, notifs] = user
    ? await Promise.all([
        getOrganisation(),
        apiMaybe<Notification[]>("/notifications"),
      ])
    : [null, null];

  const orgName = org?.name ?? "Black Report";
  const orgLogo = org?.logo_url ? "◼" : "◼";
  const unread = (notifs ?? []).filter((n) => !n.read).length;

  return (
    <html lang={org?.locale ?? "en"}>
      <body className="antialiased">
        {user ? (
          <AppShell
            links={buildLinks(user)}
            user={{ name: user.full_name, email: user.email }}
            orgName={orgName}
            orgLogo={orgLogo}
            unreadNotifications={unread}
          >
            {children}
          </AppShell>
        ) : (
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        )}
      </body>
    </html>
  );
}
