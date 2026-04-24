"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type Theme = "light" | "dark";

export async function setThemeAction(theme: Theme): Promise<void> {
  const jar = await cookies();
  jar.set("br_theme", theme === "light" ? "light" : "dark", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
