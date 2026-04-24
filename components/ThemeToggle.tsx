"use client";

import { useState, useTransition } from "react";
import { setThemeAction, type Theme } from "@/app/theme-action";

export default function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const [pending, startTransition] = useTransition();

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    // Optimistic flip — no flash waiting for server.
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    startTransition(() => {
      setThemeAction(next);
    });
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      disabled={pending}
      className="w-9 h-9 rounded-full border border-neutral-700 flex items-center justify-center hover:bg-neutral-800 text-neutral-300 shrink-0 transition disabled:opacity-50"
    >
      <span aria-hidden className="text-base leading-none">
        {theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
