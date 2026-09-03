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
    <div className="min-h-svh bg-background text-foreground lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border bg-surface lg:flex lg:flex-col">
        <Link
          className="flex h-20 items-center gap-3 border-b border-border px-6"
          href="/dashboard"
        >
          <span className="grid size-9 place-items-center rounded-full border border-foreground bg-primary font-mono text-xs font-black text-primary-foreground">
            O
          </span>
          <span className="text-lg font-extrabold tracking-[-0.04em]">
            Orbit
          </span>
        </Link>
        <WorkspaceNavigation />
        <div className="mt-auto border-t border-border p-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
            {user.email}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-8 lg:h-20">
          <Link className="flex items-center gap-2 lg:hidden" href="/dashboard">
            <span className="grid size-8 place-items-center rounded-full bg-primary font-mono text-[10px] font-black text-primary-foreground">
              O
            </span>
            <span className="font-extrabold">Orbit</span>
          </Link>
          <p className="hidden text-sm font-medium text-muted-foreground lg:block">
            Dashboard
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <WorkspaceUserMenu name={user.name} />
          </div>
        </header>
        <div className="border-b border-border bg-surface lg:hidden">
          <WorkspaceNavigation />
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
