import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthPanel } from "@/features/auth/ui/auth-panel";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
          href="/"
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground"
          >
            O
          </span>
          Orbit
        </Link>
        <ThemeToggle />
      </header>
      <main className="grid flex-1 place-items-center px-5 py-12">
        <div className="w-full max-w-sm">
          <p className="text-sm font-medium text-muted-foreground">
            A little less process.
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
            More work
            <br />
            moving forward.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Your team, your boards, and a clear view of what’s next.
          </p>
          <div className="mt-8 rounded-xl border border-border bg-surface-raised p-5 sm:p-6">
            <h2 className="mb-5 text-base font-semibold">Welcome to Orbit</h2>
            <AuthPanel oauthFailed={typeof params.error === "string"} />
          </div>
        </div>
      </main>
      <footer className="px-5 py-5 text-center text-xs text-muted-foreground">
        One place for your team’s work.
      </footer>
    </div>
  );
}
