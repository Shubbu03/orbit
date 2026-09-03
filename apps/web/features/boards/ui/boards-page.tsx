"use client";

import {
  ArrowLeftIcon,
  KanbanIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  getOrganisation,
  organisationKeys,
} from "@/features/organisations/api/organisations";
import { OrganisationSettingsDialog } from "@/features/organisations/ui/organisation-settings-dialog";
import { ManageMembersDialog } from "@/features/memberships/ui/manage-members-dialog";

import { boardKeys, listBoards } from "../api/boards";
import { BoardCard } from "./board-card";
import { CreateBoardDialog } from "./create-board-dialog";

function BoardSkeleton() {
  return (
    <div
      aria-hidden
      className="min-h-44 animate-pulse rounded-2xl border border-border bg-surface-raised p-6"
    >
      <div className="size-11 rounded-xl bg-muted" />
      <div className="mt-6 h-5 w-1/2 rounded-full bg-muted" />
    </div>
  );
}

export function BoardsPage({ organisationId }: { organisationId: string }) {
  const router = useRouter();
  const organisationQuery = useQuery({
    queryFn: () => getOrganisation(organisationId),
    queryKey: organisationKeys.detail(organisationId),
  });
  const boardsQuery = useInfiniteQuery({
    queryKey: boardKeys.list(organisationId),
    queryFn: ({ pageParam }) => listBoards(organisationId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page.hasMore
        ? lastPage.page.offset + lastPage.page.limit
        : undefined,
  });

  const boards = boardsQuery.data?.pages.flatMap((page) => page.boards) ?? [];

  if (organisationQuery.isPending) {
    return (
      <div className="px-4 py-8 md:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-4 w-28 rounded-full bg-muted" />
          <div className="mt-6 h-9 w-64 rounded-full bg-muted" />
          <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (organisationQuery.isError) {
    return (
      <div className="grid min-h-[calc(100svh-4rem)] place-items-center px-6 lg:min-h-[calc(100svh-5rem)]">
        <div className="max-w-sm text-center">
          <WarningCircleIcon
            aria-hidden
            className="mx-auto size-10 text-destructive"
            weight="duotone"
          />
          <h1 className="mt-5 text-xl font-semibold">
            Organization could not be loaded
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {organisationQuery.error.message}
          </p>
          <Link
            className="mt-6 inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="/dashboard"
          >
            Back to organizations
          </Link>
        </div>
      </div>
    );
  }

  const organisation = organisationQuery.data.organization;
  const canCreateBoard = organisation.role === "admin";

  return (
    <div className="min-h-[calc(100svh-4rem)] px-4 py-8 md:px-8 md:py-10 lg:min-h-[calc(100svh-5rem)] lg:px-12 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href="/dashboard"
        >
          <ArrowLeftIcon aria-hidden className="size-4" weight="bold" />
          Organizations
        </Link>

        <div className="mt-6 flex flex-col items-start justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                {organisation.name}
              </h1>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground">
                {organisation.role === "admin" ? "Admin" : "Member"}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {organisation.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ManageMembersDialog
              canManage={canCreateBoard}
              organisationId={organisation.id}
              organisationName={organisation.name}
            />
            {canCreateBoard ? (
              <>
                <CreateBoardDialog
                  organisationId={organisation.id}
                  organisationName={organisation.name}
                />
                <OrganisationSettingsDialog
                  onDeleted={() => router.replace("/dashboard")}
                  organisationId={organisation.id}
                  organisationName={organisation.name}
                />
              </>
            ) : null}
          </div>
        </div>

        {boardsQuery.isPending ? (
          <div
            aria-label="Loading boards"
            className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            <BoardSkeleton />
            <BoardSkeleton />
            <BoardSkeleton />
          </div>
        ) : boardsQuery.isError ? (
          <div className="mt-8 grid min-h-72 place-items-center rounded-2xl border border-border bg-surface px-6 text-center">
            <div className="max-w-sm">
              <WarningCircleIcon
                aria-hidden
                className="mx-auto size-9 text-destructive"
                weight="duotone"
              />
              <h2 className="mt-4 text-lg font-semibold">
                Boards could not be loaded
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {boardsQuery.error.message}
              </p>
              <button
                className="mt-5 rounded-full border border-border bg-surface-raised px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={() => void boardsQuery.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
        ) : boards.length === 0 ? (
          <div className="mt-8 grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <KanbanIcon aria-hidden className="size-6" weight="duotone" />
              </span>
              <h2 className="mt-5 text-lg font-semibold">No boards yet</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {canCreateBoard
                  ? "Create the first board for this organization."
                  : "An organization admin can create the first board."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {boards.map((board) => (
                <BoardCard board={board} key={board.id} />
              ))}
            </div>

            {boardsQuery.hasNextPage ? (
              <div className="mt-8 flex justify-center">
                <button
                  className="h-10 rounded-full border border-border bg-surface-raised px-5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
                  disabled={boardsQuery.isFetchingNextPage}
                  onClick={() => void boardsQuery.fetchNextPage()}
                  type="button"
                >
                  {boardsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
