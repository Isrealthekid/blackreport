import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { can, getCurrentUser, getOrganisation } from "@/lib/auth";
import { apiMaybe } from "@/lib/api";
import { extractItems } from "@/lib/api-helpers";
import AppShell, { type NavLink } from "@/components/AppShell";
import type { Camp, Notification, User } from "@/lib/types";
import type { Theme } from "@/app/theme-action";

// Google Sans isn't on Google Fonts publicly — we layer it as the first
// font-family preference (renders for users who have it locally) and load
// Inter via next/font as the universal fallback.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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

  // Read theme cookie up-front so the very first paint matches the user's
  // preference (no flash). Default to dark.
  const jar = await cookies();
  const theme: Theme = jar.get("br_theme")?.value === "light" ? "light" : "dark";

  if (!user) {
    return (
      <html lang="en" data-theme={theme} className={inter.variable}>
        <body className="antialiased">
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </body>
      </html>
    );
  }

  // Fetch org + notifications. These are lightweight and always needed.
  const [org, notifsRaw] = await Promise.all([
    getOrganisation(),
    apiMaybe<unknown>("/notifications"),
  ]);

  const unread = extractItems<Notification>(notifsRaw).filter((n) => !n.read).length;
  const orgName = org?.name ?? "Black Report";
  const orgLogo = "◼";

  // Detect camp membership — single call, resilient.
  let inCamp = false;
  try {
    const camps = extractItems<Camp>(await apiMaybe<unknown>("/camps"));
    if (user.is_admin) {
      inCamp = camps.length > 0;
    } else {
      // Check if user appears in any camp's members.
      for (const c of camps) {
        const detail = await apiMaybe<Camp>(`/camps/${c.id}`);
        if (detail?.members?.some((m) => m.user_id === user.id)) {
          inCamp = true;
          break; // stop early
        }
      }
    }
  } catch {
    // On any error, default to showing camp tabs (permissive).
    inCamp = true;
  }

  // Department membership: check if user's position maps to a department role.
  // Camper-only users (no org position) should NOT see Reports.
  // Everyone else should see Reports — the page handles visibility.
  let inDepartment = false;
  if (user.is_admin) {
    inDepartment = true;
  } else {
    // Check user's position. If it maps to a department role, show Reports.
    const deptPositions = ["admin", "department head", "manager", "reviewer", "reporter", "viewer"];
    const pos = (user.position ?? "").toLowerCase();
    if (deptPositions.some((p) => pos.includes(p))) {
      inDepartment = true;
    }
    // If position doesn't help, check if they have any reports or are in departments.
    if (!inDepartment) {
      try {
        const mineRaw = await apiMaybe<unknown>("/reports/mine");
        const mine = extractItems<unknown>(mineRaw);
        inDepartment = mine.length > 0;
      } catch {
        // Fallback: if user is not purely a camper, show reports.
        if (!inCamp) inDepartment = true;
      }
    }
  }

  // ── Build links ──
  const links: NavLink[] = [
    { href: "/dashboard", label: "Dashboard", icon: "▤", section: "Main" },
  ];

  if (inDepartment) {
    links.push({ href: "/reports", label: "Reports", icon: "▪", section: "Reports" });
    links.push({ href: "/reports/new", label: "New Report", icon: "+", section: "Reports" });
    links.push({ href: "/approvals", label: "Approvals", icon: "✓", section: "Reports" });
  }

  if (inCamp || user.is_admin) {
    links.push({ href: "/camps", label: "Camps", icon: "⛺", section: "Drone Ops" });
    links.push({ href: "/missions", label: "Missions", icon: "✈", section: "Drone Ops" });
    links.push({ href: "/mission-approvals", label: "Mission Approvals", icon: "✓", section: "Drone Ops" });
  }

  links.push({ href: "/notifications", label: "Notifications", icon: "◉", section: "Main" });

  if (can(user, "manage_org")) {
    links.push({ href: "/clients", label: "Clients", icon: "◆", section: "Configure" });
    links.push({ href: "/templates", label: "Templates", icon: "▦", section: "Configure" });
    links.push({ href: "/departments", label: "Departments", icon: "⌂", section: "Configure" });
    // links.push({ href: "/chains", label: "Chain Templates", icon: "↳", section: "Configure" });
    links.push({ href: "/users", label: "Users", icon: "◎", section: "Admin" });
    links.push({ href: "/organisation", label: "Organisation", icon: "⌘", section: "Admin" });
  }

  return (
    <html lang={org?.locale ?? "en"} data-theme={theme} className={inter.variable}>
      <body className="antialiased">
        <AppShell
          links={links}
          user={{ name: user.full_name, email: user.email }}
          orgName={orgName}
          orgLogo={orgLogo}
          unreadNotifications={unread}
          theme={theme}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
