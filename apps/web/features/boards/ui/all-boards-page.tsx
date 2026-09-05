"use client";

import { KanbanIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { boardKeys, listAllBoards } from "../api/boards";
import { BoardCard } from "./board-card";

function BoardSkeleton() {
  return (
    <div
      aria-hidden
      className="min-h-44 animate-pulse rounded-xl border border-border bg-surface-raised p-6"
    >
      <div className="size-11 rounded-xl bg-muted" />
      <div className="mt-6 h-5 w-1/2 rounded-full bg-muted" />
    </div>
  );
}

export function AllBoardsPage() {
  const boardsQuery = useInfiniteQuery({
    queryKey: boardKeys.allList,
    queryFn: ({ pageParam }) => listAllBoards(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page.hasMore
        ? lastPage.page.offset + lastPage.page.limit
        : undefined,
  });
  const boards = boardsQuery.data?.pages.flatMap((page) => page.boards) ?? [];

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="border-b border-border pb-5">
          <p className="font-mono text-xs font-semibold text-muted-foreground">
            Workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Boards</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Every board you can access across your organizations.
          </p>
        </div>

        {boardsQuery.isPending ? (
          <div
            aria-label="Loading boards"
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <BoardSkeleton />
            <BoardSkeleton />
            <BoardSkeleton />
          </div>
        ) : boardsQuery.isError ? (
          <div className="mt-8 grid min-h-72 place-items-center rounded-xl border border-border bg-surface px-6 text-center">
            <div className="max-w-sm">
              <WarningCircleIcon
                aria-hidden
                className="mx-auto size-9 text-destructive"
                weight="duotone"
              />
              <h2 className="mt-4 text-lg font-semibold">
                Boards could not be loaded
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {boardsQuery.error.message}
              </p>
              <button
                className="mt-5 h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted"
                onClick={() => void boardsQuery.refetch()}
                type="button"
              >
                Try again
              </button>
            </div>
          </div>
        ) : boards.length === 0 ? (
          <div className="mt-8 grid min-h-80 place-items-center rounded-xl border border-dashed border-border bg-surface px-6 text-center">
            <div>
              <KanbanIcon
                aria-hidden
                className="mx-auto size-11 text-secondary"
                weight="duotone"
              />
              <h2 className="mt-5 text-lg font-semibold">No boards yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Open an organization to create its first board.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {boards.map((board) => (
                <BoardCard board={board} key={board.id} />
              ))}
            </div>
            {boardsQuery.hasNextPage ? (
              <button
                className="mx-auto mt-8 block h-10 rounded-lg border border-border px-5 text-sm font-semibold disabled:opacity-50"
                disabled={boardsQuery.isFetchingNextPage}
                onClick={() => void boardsQuery.fetchNextPage()}
                type="button"
              >
                {boardsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
