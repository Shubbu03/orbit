"use client";

import { BuildingsIcon, SquaresFourIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorkspaceNavigation() {
  const pathname = usePathname();
  const isBoardsArea =
    pathname.startsWith("/dashboard/organizations/") ||
    pathname.startsWith("/dashboard/boards/");

  return (
    <nav
      aria-label="Workspace"
      className="grid grid-cols-2 gap-2 p-3 lg:grid-cols-1 lg:p-4"
    >
      <Link
        aria-current={isBoardsArea ? undefined : "page"}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-muted ${
          isBoardsArea ? "text-muted-foreground" : "bg-muted"
        }`}
        href="/dashboard"
      >
        <BuildingsIcon aria-hidden className="size-[18px]" weight="bold" />
        Organizations
      </Link>
      <Link
        aria-current={isBoardsArea ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
          isBoardsArea
            ? "bg-muted font-semibold text-foreground"
            : "text-muted-foreground"
        }`}
        href="/dashboard/boards"
      >
        <SquaresFourIcon aria-hidden className="size-[18px]" />
        Boards
      </Link>
    </nav>
  );
}
