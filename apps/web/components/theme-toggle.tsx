"use client";

import { MoonStarsIcon, SunIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      aria-label="Toggle color theme"
      className="relative grid size-10 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:-translate-y-0.5 hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title="Toggle color theme"
      type="button"
    >
      <SunIcon aria-hidden className="size-[18px] dark:hidden" weight="bold" />
      <MoonStarsIcon
        aria-hidden
        className="hidden size-[18px] dark:block"
        weight="bold"
      />
    </button>
  );
}
