import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceUserMenu } from "@/features/auth/ui/workspace-user-menu";
import type { SessionUser } from "@/lib/auth-session";
import { WorkspaceNavigation } from "./workspace-navigation";

export function WorkspaceShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  return (
    <div className="workspace-shell flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-lg focus:bg-primary focus:p-3 focus:text-primary-foreground"
        href="#workspace-content"
      >
        Skip to content
      </a>
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface-raised px-3 py-2 sm:flex-nowrap sm:px-5">
        <Link
          aria-label="Orbit boards"
          className="flex shrink-0 items-center gap-2 pr-1 text-lg font-bold tracking-tight"
          href="/dashboard"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground"
          >
            O
          </span>
          <span className="hidden sm:inline">Orbit</span>
        </Link>
        <WorkspaceNavigation />
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <WorkspaceUserMenu name={user.name} />
        </div>
      </header>
      <main
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
        id="workspace-content"
      >
        {children}
      </main>
    </div>
  );
}
