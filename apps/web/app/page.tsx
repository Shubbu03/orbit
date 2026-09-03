import {
  CheckCircleIcon,
  CircleIcon,
  DotsThreeIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { AuthPanel } from "@/features/auth/ui/auth-panel";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const columns = [
  {
    issues: [
      { assignee: "AS", id: "ORB-18", title: "Improve empty states" },
      { assignee: "RK", id: "ORB-21", title: "Review invite flow" },
    ],
    title: "To do",
  },
  {
    issues: [
      { assignee: "MN", id: "ORB-14", title: "Build board activity feed" },
      { assignee: "AS", id: "ORB-16", title: "Add issue filters" },
    ],
    title: "In progress",
  },
  {
    issues: [{ assignee: "RK", id: "ORB-09", title: "Set up Google sign-in" }],
    title: "Done",
  },
] as const;

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const oauthFailed = typeof params.error === "string";

  return (
    <div className="landing-backdrop min-h-svh bg-background">
      <header className="relative z-10 border-b border-border/70 bg-background/45 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            aria-label="Orbit home"
            className="flex items-center gap-2.5 text-base font-semibold tracking-[-0.02em]"
            href="/"
          >
            <OrbitLogo />
            Orbit
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-3xl px-5 pt-20 pb-14 text-center sm:px-8 sm:pt-28 sm:pb-18">
          <p className="mx-auto w-fit rounded-full border border-border/80 bg-surface/65 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md">
            Issue tracking for focused teams
          </p>
          <h1 className="mt-6 text-balance text-5xl leading-[1.02] font-semibold tracking-[-0.055em] sm:text-7xl">
            Keep projects moving.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Plan work on shared boards, assign the right people, and follow
            every update without losing context.
          </p>
          <div className="mx-auto mt-8 max-w-sm">
            <AuthPanel oauthFailed={oauthFailed} />
          </div>
        </section>

        <section
          aria-label="Orbit board preview"
          className="mx-auto max-w-6xl px-4 pb-20 sm:px-8 sm:pb-28"
        >
          <BoardPreview />
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/70 bg-background/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>Orbit</span>
          <span>Organize issues. Keep everyone aligned.</span>
        </div>
      </footer>
    </div>
  );
}

function OrbitLogo() {
  return (
    <span className="relative grid size-8 place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-sm">
      <span className="size-2 rounded-full bg-current" />
      <span className="absolute size-4.5 rounded-full border border-current/70" />
    </span>
  );
}

function BoardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/90 bg-surface/90 shadow-panel backdrop-blur-xl sm:rounded-3xl">
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <OrbitLogo />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Website launch</p>
            <p className="truncate text-xs text-muted-foreground">
              Acme product team
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            aria-label="Three board members"
            className="hidden -space-x-2 sm:flex"
          >
            {["AS", "RK", "MN"].map((initials) => (
              <span
                className="grid size-8 place-items-center rounded-full border-2 border-surface bg-secondary text-[9px] font-semibold text-secondary-foreground"
                key={initials}
              >
                {initials}
              </span>
            ))}
          </div>
          <button
            aria-label="Board actions"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            type="button"
          >
            <DotsThreeIcon aria-hidden className="size-5" weight="bold" />
          </button>
        </div>
      </div>

      <div className="grid gap-px bg-border md:grid-cols-3">
        {columns.map((column, columnIndex) => (
          <div className="min-h-72 bg-background p-4 sm:p-5" key={column.title}>
            <div className="mb-4 flex items-center gap-2">
              {columnIndex === 2 ? (
                <CheckCircleIcon
                  aria-hidden
                  className="size-4 text-primary"
                  weight="fill"
                />
              ) : (
                <CircleIcon
                  aria-hidden
                  className={
                    columnIndex === 1
                      ? "size-4 text-primary"
                      : "size-4 text-muted-foreground"
                  }
                  weight={columnIndex === 1 ? "fill" : "regular"}
                />
              )}
              <h2 className="text-sm font-medium">{column.title}</h2>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {column.issues.length}
              </span>
            </div>

            <div className="grid gap-3">
              {column.issues.map((issue) => (
                <article
                  className="rounded-xl border border-border bg-surface p-4 shadow-sm"
                  key={issue.id}
                >
                  <p className="text-sm leading-5 font-medium">{issue.title}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {issue.id}
                    </span>
                    <span className="grid size-6 place-items-center rounded-full bg-secondary text-[8px] font-semibold text-secondary-foreground">
                      {issue.assignee}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
