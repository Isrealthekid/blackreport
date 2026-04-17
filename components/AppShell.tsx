"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logoutAction } from "@/app/actions";

export interface NavLink {
  href: string;
  label: string;
  icon: string;
  section?: string;
}

export interface ShellUser {
  name: string;
  email: string;
}

export default function AppShell({
  links,
  user,
  orgName,
  orgLogo,
  unreadNotifications,
  children,
}: {
  links: NavLink[];
  user: ShellUser;
  orgName: string;
  orgLogo: string;
  unreadNotifications: number;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const sections = links.reduce<Record<string, NavLink[]>>((acc, l) => {
    const s = l.section ?? "Main";
    (acc[s] = acc[s] || []).push(l);
    return acc;
  }, {});

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <aside
        className={`fixed top-0 left-0 bottom-0 border-r border-neutral-800 bg-neutral-950 flex flex-col transition-all duration-200 z-20 ${
          collapsed ? "w-14" : "w-60"
        }`}
      >
        <div className="h-14 flex items-center gap-2 px-3 border-b border-neutral-800">
          <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center font-bold shrink-0">
            {orgLogo}
          </div>
          {!collapsed && <div className="font-semibold truncate">{orgName}</div>}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {Object.entries(sections).map(([name, ls]) => (
            <div key={name} className="mb-4">
              {!collapsed && (
                <div className="px-3 py-1 text-xs uppercase tracking-wider text-neutral-500">
                  {name}
                </div>
              )}
              <ul>
                {ls.map((l) => {
                  const active =
                    pathname === l.href ||
                    (l.href !== "/dashboard" && pathname.startsWith(l.href));
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        title={collapsed ? l.label : undefined}
                        className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                          active
                            ? "bg-neutral-800 text-white border-l-2 border-white"
                            : "text-neutral-300 hover:bg-neutral-900 hover:text-white border-l-2 border-transparent"
                        }`}
                      >
                        <span className="w-5 text-center shrink-0">{l.icon}</span>
                        {!collapsed && <span className="truncate">{l.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="h-10 border-t border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 text-sm"
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        >
          {collapsed ? "›" : "‹ Collapse"}
        </button>
      </aside>

      <div className={`transition-all ${collapsed ? "pl-14" : "pl-60"}`}>
        <header className="h-14 border-b border-neutral-800 bg-neutral-950 flex items-center justify-end px-6 gap-4 sticky top-0 z-10">
          <Link
            href="/notifications"
            className="relative w-9 h-9 rounded-full border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 text-neutral-300"
            aria-label="Notifications"
            title="Notifications"
          >
            <span>◔</span>
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-semibold text-sm">
              {initials}
            </div>
            <div className="text-sm hidden sm:block">
              <div className="text-neutral-500 text-xs leading-tight">{user.email}</div>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="text-xs px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-800 text-neutral-300">
              Sign out
            </button>
          </form>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
