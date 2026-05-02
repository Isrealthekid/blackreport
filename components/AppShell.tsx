"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import type { Theme } from "@/app/theme-action";
import ThemeToggle from "./ThemeToggle";
import logo from "@/components/rtb.png";

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
  theme,
  children,
}: {
  links: NavLink[];
  user: ShellUser;
  orgName: string;
  orgLogo: string;
  unreadNotifications: number;
  theme: Theme;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop collapse
  const pathname = usePathname();

  // Close mobile drawer on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  // Shared sidebar content.
  const sidebarContent = (
    <>
      <div className="h-14 flex items-center gap-2 px-3 border-b border-neutral-800 shrink-0">
        <Image
          src={logo}
          alt="Logo"
          style={{ maxHeight: "50px", width: "auto", padding: "4px" }}
          className="shrink-0"
        />
        {(!collapsed || open) && (
          <div className="font-semibold truncate">{orgName}</div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {Object.entries(sections).map(([name, ls]) => (
          <div key={name} className="mb-4">
            {(!collapsed || open) && (
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
                      title={collapsed && !open ? l.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-neutral-800 text-white border-l-2 border-white"
                          : "text-neutral-300 hover:bg-neutral-900 hover:text-white border-l-2 border-transparent"
                      }`}
                    >
                      <span className="w-5 text-center shrink-0">{l.icon}</span>
                      {(!collapsed || open) && (
                        <span className="truncate">{l.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar: hidden on mobile, fixed on desktop ── */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 border-r border-neutral-800 bg-neutral-950 flex flex-col z-40
          transition-all duration-200
          ${/* Mobile: slide in/out */""}
          ${open ? "translate-x-0 w-64" : "-translate-x-full w-64"}
          ${/* Desktop: always visible, collapse toggle */""}
          lg:translate-x-0 ${collapsed ? "lg:w-14" : "lg:w-60"}
        `}
      >
        {sidebarContent}

        {/* Desktop collapse button */}
        <button
          onClick={() => {
            if (window.innerWidth >= 1024) {
              setCollapsed((c) => !c);
            } else {
              setOpen(false);
            }
          }}
          className="h-10 border-t border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 text-sm shrink-0 hidden lg:block"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "›" : "‹ Collapse"}
        </button>

        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="h-10 border-t border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 text-sm shrink-0 lg:hidden"
        >
          ✕ Close
        </button>
      </aside>

      {/* ── Content area ── */}
      <div
        className={`transition-all duration-200 ${
          collapsed ? "lg:pl-14" : "lg:pl-60"
        }`}
      >
        {/* ── Top bar ── */}
        <header className="h-14 border-b border-neutral-800 bg-neutral-950 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-10">
          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden w-9 h-9 rounded border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 text-neutral-300 shrink-0"
            aria-label="Open menu"
          >
            ☰
          </button>

          <div className="flex-1" />

          <ThemeToggle initial={theme} />

          <Link
            href="/notifications"
            className="relative w-9 h-9 rounded-full border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 text-neutral-300 shrink-0"
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

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-semibold text-sm shrink-0">
              {initials}
            </div>
            <div className="text-sm hidden sm:block">
              <div className="text-neutral-500 text-xs leading-tight truncate max-w-32">
                {user.email}
              </div>
            </div>
          </div>

          <form action={logoutAction}>
            <button className="text-xs px-3 py-1 border border-neutral-700 rounded hover:bg-neutral-800 text-neutral-300 whitespace-nowrap">
              Sign out
            </button>
          </form>
        </header>

        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
