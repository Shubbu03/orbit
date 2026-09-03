"use client";

import type { Organisation } from "@orbit/contracts/entities";
import {
  BuildingsIcon,
  CrownSimpleIcon,
  ArrowRightIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { listOrganisations, organisationKeys } from "../api/organisations";
import { CreateOrganisationDialog } from "./create-organisation-dialog";
import { OrganizationOnboardingDialog } from "./organization-onboarding-dialog";

function OrganisationCard({ organisation }: { organisation: Organisation }) {
  const isAdmin = organisation.role === "admin";

  return (
    <Link
      className="group flex min-h-52 flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-hard transition duration-200 hover:-translate-y-1 hover:border-muted-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-6"
      href={`/dashboard/organizations/${organisation.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <BuildingsIcon aria-hidden className="size-5" weight="duotone" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground">
          {isAdmin ? (
            <CrownSimpleIcon aria-hidden className="size-3" weight="fill" />
          ) : (
            <UsersThreeIcon aria-hidden className="size-3" weight="fill" />
          )}
          {isAdmin ? "Admin" : "Member"}
        </span>
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-[-0.03em]">
        {organisation.name}
      </h2>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {organisation.description}
      </p>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-muted-foreground transition group-hover:text-foreground">
        View boards
        <ArrowRightIcon
          aria-hidden
          className="size-4 transition group-hover:translate-x-0.5"
          weight="bold"
        />
      </span>
    </Link>
  );
}

function OrganisationSkeleton() {
  return (
    <div
      aria-hidden
      className="min-h-52 animate-pulse rounded-2xl border border-border bg-surface-raised p-6"
    >
      <div className="size-11 rounded-xl bg-muted" />
      <div className="mt-6 h-5 w-2/5 rounded-full bg-muted" />
      <div className="mt-4 h-3 w-full rounded-full bg-muted" />
      <div className="mt-2 h-3 w-3/4 rounded-full bg-muted" />
    </div>
  );
}

export function OrganisationsPage() {
  const [continueOnboarding, setContinueOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const organisationsQuery = useInfiniteQuery({
    queryKey: organisationKeys.all,
    queryFn: ({ pageParam }) => listOrganisations(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page.hasMore
        ? lastPage.page.offset + lastPage.page.limit
        : undefined,
  });

  const organisations =
    organisationsQuery.data?.pages.flatMap((page) => page.organizations) ?? [];
  const shouldShowOnboarding =
    organisationsQuery.isSuccess &&
    !onboardingDismissed &&
    (organisations.length === 0 || continueOnboarding);

  return (
    <div className="min-h-[calc(100svh-4rem)] px-4 py-8 md:px-8 md:py-10 lg:min-h-[calc(100svh-5rem)] lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs font-semibold text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Organizations
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Manage the team workspaces you belong to.
            </p>
          </div>
          <CreateOrganisationDialog />
        </div>

        {organisationsQuery.isPending ? (
          <div
            aria-label="Loading organizations"
            className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <OrganisationSkeleton />
            <OrganisationSkeleton />
            <OrganisationSkeleton />
          </div>
        ) : organisationsQuery.isError ? (
          <div className="mt-8 grid min-h-72 place-items-center rounded-2xl border border-border bg-surface px-6 text-center">
            <div className="max-w-sm">
              <WarningCircleIcon
                aria-hidden
                className="mx-auto size-9 text-destructive"
                weight="duotone"
              />
              <h2 className="mt-4 text-lg font-semibold">
                Organizations could not be loaded
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {organisationsQuery.error.message}
              </p>
              <button
                className="mt-5 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={() => void organisationsQuery.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
        ) : organisations.length === 0 ? (
          <div className="mt-8 grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <BuildingsIcon
                  aria-hidden
                  className="size-6"
                  weight="duotone"
                />
              </span>
              <h2 className="mt-5 text-lg font-semibold">
                No organizations yet
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Create an organization to start adding boards.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {organisations.map((organisation) => (
                <OrganisationCard
                  key={organisation.id}
                  organisation={organisation}
                />
              ))}
            </div>

            {organisationsQuery.hasNextPage ? (
              <div className="mt-8 flex justify-center">
                <button
                  className="h-10 rounded-full border border-border bg-surface-raised px-5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
                  disabled={organisationsQuery.isFetchingNextPage}
                  onClick={() => void organisationsQuery.fetchNextPage()}
                  type="button"
                >
                  {organisationsQuery.isFetchingNextPage
                    ? "Loading…"
                    : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <OrganizationOnboardingDialog
        onComplete={() => {
          setContinueOnboarding(false);
          setOnboardingDismissed(true);
        }}
        onOrganisationCreated={() => setContinueOnboarding(true)}
        open={shouldShowOnboarding}
      />
    </div>
  );
}
