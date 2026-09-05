"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { boardKeys, getBoard } from "@/features/boards/api/boards";
import {
  getOrganisation,
  listOrganisations,
  organisationKeys,
} from "@/features/organisations/api/organisations";
import { CreateOrganisationDialog } from "@/features/organisations/ui/create-organisation-dialog";

export const LAST_ORGANISATION_KEY = "orbit-last-organization";

export function WorkspaceNavigation() {
  const params = useParams<{ boardId?: string; organisationId?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const board = useQuery({
    queryKey: boardKeys.detail(params.boardId ?? ""),
    queryFn: () => getBoard(params.boardId!),
    enabled: Boolean(params.boardId),
    staleTime: Infinity,
  });
  const organisationId =
    params.organisationId ?? board.data?.board.organisationId;
  const organisation = useQuery({
    queryKey: organisationKeys.detail(organisationId ?? ""),
    queryFn: () => getOrganisation(organisationId!),
    enabled: Boolean(organisationId),
  });
  const organisations = useInfiniteQuery({
    queryKey: organisationKeys.all,
    queryFn: ({ pageParam }) => listOrganisations(pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) =>
      page.page.hasMore ? page.page.offset + page.page.limit : undefined,
  });
  const options =
    organisations.data?.pages.flatMap((page) => page.organizations) ?? [];
  useEffect(() => {
    if (!organisationId || !organisation.isSuccess) return;
    try {
      localStorage.setItem(LAST_ORGANISATION_KEY, organisationId);
    } catch {
      /* Storage is optional in private browsing. */
    }
  }, [organisationId, organisation.isSuccess]);

  return (
    <nav
      aria-label="Workspace"
      className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2"
    >
      <select
        aria-label="Switch organization"
        className="h-10 w-full min-w-0 max-w-52 truncate rounded-lg border border-border bg-surface px-2 text-sm font-medium sm:px-3"
        disabled={organisations.isPending}
        onChange={(event) => {
          if (event.target.value === "all-boards") {
            router.push("/dashboard/boards");
            return;
          }
          if (event.target.value === "load-more") {
            void organisations.fetchNextPage();
            return;
          }
          if (event.target.value)
            router.push(`/dashboard/organizations/${event.target.value}`);
        }}
        value={
          pathname === "/dashboard/boards"
            ? "all-boards"
            : (organisationId ?? "")
        }
      >
        <option value="" disabled>
          {organisations.isPending ? "Loading…" : "Choose organization"}
        </option>
        <option value="all-boards">All boards</option>
        {organisationId &&
        !options.some((item) => item.id === organisationId) ? (
          <option value={organisationId}>
            {organisation.data?.organization.name ?? "Organization"}
          </option>
        ) : null}
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
        {organisations.hasNextPage ? (
          <option value="load-more">
            {organisations.isFetchingNextPage
              ? "Loading…"
              : "Load more organizations…"}
          </option>
        ) : null}
      </select>
      <CreateOrganisationDialog compact />
      <Link
        aria-current={pathname === "/dashboard/boards" ? "page" : undefined}
        className={`hidden h-10 shrink-0 items-center rounded-lg px-3 text-sm hover:bg-muted sm:inline-flex ${pathname === "/dashboard/boards" ? "bg-muted font-semibold" : "text-muted-foreground"}`}
        href="/dashboard/boards"
      >
        All boards
      </Link>
      {organisations.isError ? (
        <button
          className="text-xs text-destructive"
          onClick={() => void organisations.refetch()}
          type="button"
        >
          Retry organizations
        </button>
      ) : null}
    </nav>
  );
}
