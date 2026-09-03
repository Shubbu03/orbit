"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="grid min-h-[calc(100svh-4rem)] place-items-center p-6 lg:min-h-[calc(100svh-5rem)]">
      <div className="max-w-md text-center">
        <WarningCircleIcon
          aria-hidden
          className="mx-auto size-10 text-destructive"
          weight="duotone"
        />
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
          Dashboard could not be loaded
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Orbit could not verify your session or reach the API.
        </p>
        <button
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
