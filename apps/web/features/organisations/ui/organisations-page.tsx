"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LAST_ORGANISATION_KEY } from "@/features/workspace/ui/workspace-navigation";
import { listOrganisations, organisationKeys } from "../api/organisations";
import { CreateOrganisationForm } from "./create-organisation-form";

export function OrganisationsPage() {
  const router = useRouter();
  const query = useInfiniteQuery({
    queryKey: organisationKeys.all,
    queryFn: ({ pageParam }) => listOrganisations(pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) =>
      page.page.hasMore ? page.page.offset + page.page.limit : undefined,
  });
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = query;
  const first = data?.pages[0]?.organizations[0];
  useEffect(() => {
    if (!first) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LAST_ORGANISATION_KEY);
    } catch {
      /* Continue with the first organization when storage is unavailable. */
    }
    const accessible = data?.pages
      .flatMap((page) => page.organizations)
      .find((item) => item.id === saved);
    // Search the remaining pages before falling back from a saved workspace.
    if (saved && !accessible && hasNextPage) {
      if (!isFetchingNextPage && !isFetchNextPageError) void fetchNextPage();
      if (!isFetchNextPageError) return;
    }
    router.replace(`/dashboard/organizations/${accessible?.id ?? first.id}`);
  }, [
    first,
    data,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    router,
  ]);

  if (query.isError && !first)
    return (
      <div className="m-auto max-w-sm p-6 text-center">
        <h1 className="text-xl font-semibold">
          Could not load your organizations
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {query.error.message}
        </p>
        <button
          className="mt-4 rounded-lg border px-4 py-2"
          onClick={() => void query.refetch()}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  if (query.isPending || first)
    return (
      <div
        aria-label="Loading your workspace"
        className="mx-auto w-full max-w-6xl animate-pulse p-6"
      >
        <div className="h-7 w-48 rounded-lg bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((id) => (
            <div className="h-36 rounded-xl bg-surface" key={id} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="m-auto w-full max-w-md px-5 py-12">
      <span className="grid size-11 place-items-center rounded-xl bg-primary font-bold text-primary-foreground">
        O
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Create your organization
      </h1>
      <p className="mt-2 mb-7 text-sm leading-6 text-muted-foreground">
        Give your team a home. You can invite people from settings whenever
        you’re ready.
      </p>
      <CreateOrganisationForm
        onCreated={(organisation) =>
          router.replace(`/dashboard/organizations/${organisation.id}`)
        }
      />
    </div>
  );
}
