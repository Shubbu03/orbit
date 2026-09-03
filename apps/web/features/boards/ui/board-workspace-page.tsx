"use client";

import type { BoardDetails, Person } from "@orbit/contracts/entities";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DotsSixVerticalIcon,
  KanbanIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { moveIssue } from "@/features/issues/api/issues";
import { CreateIssueDialog } from "@/features/issues/ui/create-issue-dialog";
import { moveSection } from "@/features/sections/api/sections";
import { CreateSectionDialog } from "@/features/sections/ui/create-section-dialog";
import { SectionSettingsDialog } from "@/features/sections/ui/section-settings-dialog";

import { boardKeys, getBoard } from "../api/boards";
import { useBoardRealtime } from "../realtime/use-board-realtime";
import { BoardSettingsDialog } from "./board-settings-dialog";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function AssigneeStack({ assignees }: { assignees: Person[] }) {
  if (assignees.length === 0) return null;

  const visibleAssignees = assignees.slice(0, 3);
  const remainingCount = assignees.length - visibleAssignees.length;

  return (
    <div
      aria-label={`Assigned to ${assignees.map((assignee) => assignee.name).join(", ")}`}
      className="flex -space-x-2"
    >
      {visibleAssignees.map((assignee) => (
        <span
          className="grid size-7 place-items-center overflow-hidden rounded-full border-2 border-surface-raised bg-secondary font-mono text-[9px] font-bold text-secondary-foreground"
          key={assignee.id}
          title={assignee.name}
        >
          {assignee.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="size-full object-cover"
              src={assignee.image}
            />
          ) : (
            initials(assignee.name)
          )}
        </span>
      ))}
      {remainingCount > 0 ? (
        <span className="grid size-7 place-items-center rounded-full border-2 border-surface-raised bg-muted font-mono text-[9px] font-bold text-muted-foreground">
          +{remainingCount}
        </span>
      ) : null}
    </div>
  );
}

function SortableIssueCard({
  boardId,
  issue,
}: {
  boardId: string;
  issue: BoardDetails["sections"][number]["issues"][number];
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    data: { sectionId: issue.sectionId, type: "issue" },
    id: issue.id,
  });

  return (
    <article
      className={`group rounded-xl border border-border bg-surface-raised p-4 shadow-hard transition ${
        isDragging ? "z-20 opacity-60" : ""
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-start gap-2">
        <Link
          className="min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          href={`/dashboard/boards/${boardId}/issues/${issue.id}`}
        >
          <h3 className="text-sm font-semibold leading-5 group-hover:text-muted-foreground">
            {issue.title}
          </h3>
        </Link>
        <button
          {...attributes}
          {...listeners}
          aria-label={`Move ${issue.title}`}
          className="grid size-7 shrink-0 touch-none place-items-center rounded-lg text-muted-foreground opacity-70 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring sm:opacity-0 sm:group-hover:opacity-100"
          ref={setActivatorNodeRef}
          type="button"
        >
          <DotsSixVerticalIcon aria-hidden className="size-4" weight="bold" />
        </button>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
        {issue.description}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          className="font-mono text-[9px] text-muted-foreground hover:text-foreground"
          href={`/dashboard/boards/${boardId}/issues/${issue.id}`}
        >
          Open issue
        </Link>
        <AssigneeStack assignees={issue.assignees} />
      </div>
    </article>
  );
}

function SortableBoardColumn({
  board,
  section,
}: {
  board: BoardDetails;
  section: BoardDetails["sections"][number];
}) {
  const canManage = board.role === "admin";
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    data: { type: "section" },
    disabled: !canManage,
    id: section.id,
  });

  return (
    <section
      className={`flex w-[min(86vw,21rem)] shrink-0 flex-col rounded-2xl border border-border bg-surface p-3 sm:w-80 ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <div className="flex min-w-0 items-center gap-2">
          {canManage ? (
            <button
              {...attributes}
              {...listeners}
              aria-label={`Move ${section.title} section`}
              className="grid size-7 shrink-0 touch-none place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              ref={setActivatorNodeRef}
              type="button"
            >
              <DotsSixVerticalIcon
                aria-hidden
                className="size-4"
                weight="bold"
              />
            </button>
          ) : (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full bg-secondary"
            />
          )}
          <h2 className="truncate text-sm font-semibold">{section.title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
            {section.issues.length}
          </span>
          {canManage ? (
            <SectionSettingsDialog
              boardId={board.id}
              sectionId={section.id}
              title={section.title}
            />
          ) : null}
        </div>
      </div>

      <SortableContext
        items={section.issues.map((issue) => issue.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-3 grid min-h-28 content-start gap-2.5">
          {section.issues.length === 0 ? (
            <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-border bg-background/50 px-4 text-center">
              <p className="text-xs leading-5 text-muted-foreground">
                No issues in this section.
              </p>
            </div>
          ) : (
            section.issues.map((issue) => (
              <SortableIssueCard
                boardId={board.id}
                issue={issue}
                key={issue.id}
              />
            ))
          )}
        </div>
      </SortableContext>

      <div className="mt-2">
        <CreateIssueDialog
          boardId={board.id}
          sectionId={section.id}
          sectionTitle={section.title}
        />
      </div>
    </section>
  );
}

function Presence({ presence }: { presence: Person[] }) {
  if (presence.length === 0) return null;

  return (
    <div
      aria-label={`${presence.map((user) => user.name).join(", ")} currently viewing`}
      className="flex -space-x-2"
    >
      {presence.slice(0, 4).map((user) => (
        <span
          className="grid size-9 place-items-center overflow-hidden rounded-full border-2 border-background bg-secondary font-mono text-[10px] font-bold text-secondary-foreground"
          key={user.id}
          title={user.name}
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="size-full object-cover" src={user.image} />
          ) : (
            initials(user.name)
          )}
        </span>
      ))}
      {presence.length > 4 ? (
        <span className="grid size-9 place-items-center rounded-full border-2 border-background bg-muted font-mono text-[9px] font-bold text-muted-foreground">
          +{presence.length - 4}
        </span>
      ) : null}
    </div>
  );
}

function BoardWorkspaceSkeleton() {
  return (
    <div className="animate-pulse px-4 py-8 md:px-8 lg:px-12 lg:py-10">
      <div className="h-4 w-28 rounded-full bg-muted" />
      <div className="mt-6 h-9 w-64 rounded-full bg-muted" />
      <div className="mt-3 h-4 w-44 rounded-full bg-muted" />
      <div className="mt-10 flex gap-4 overflow-hidden">
        {[0, 1, 2].map((column) => (
          <div
            className="h-[28rem] w-80 shrink-0 rounded-2xl border border-border bg-surface"
            key={column}
          />
        ))}
      </div>
    </div>
  );
}

export function BoardWorkspacePage({ boardId }: { boardId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const boardQuery = useQuery({
    queryFn: () => getBoard(boardId),
    queryKey: boardKeys.detail(boardId),
  });
  const sectionMoveMutation = useMutation({
    mutationFn: ({
      position,
      sectionId,
    }: {
      position: number;
      sectionId: string;
    }) => moveSection(sectionId, { position }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
    },
  });
  const issueMoveMutation = useMutation({
    mutationFn: ({
      issueId,
      position,
      sectionId,
    }: {
      issueId: string;
      position: number;
      sectionId: string;
    }) => moveIssue(issueId, { position, sectionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
    },
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const board = boardQuery.data?.board;
  const organisationId = board?.organisationId;
  const handleBoardDeleted = useCallback(() => {
    if (organisationId) {
      router.replace(`/dashboard/organizations/${organisationId}`);
    } else {
      router.replace("/dashboard");
    }
  }, [organisationId, router]);
  const { connectionState, presence } = useBoardRealtime({
    boardId,
    enabled: Boolean(board),
    onBoardDeleted: handleBoardDeleted,
  });

  if (boardQuery.isPending) return <BoardWorkspaceSkeleton />;

  if (boardQuery.isError || !board) {
    return (
      <div className="grid min-h-[calc(100svh-4rem)] place-items-center px-6 lg:min-h-[calc(100svh-5rem)]">
        <div className="max-w-sm text-center">
          <WarningCircleIcon
            aria-hidden
            className="mx-auto size-10 text-destructive"
            weight="duotone"
          />
          <h1 className="mt-5 text-xl font-semibold">
            Board could not be loaded
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {boardQuery.error?.message ?? "The board was not found."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted"
              href="/dashboard"
            >
              Organizations
            </Link>
            <button
              className="h-10 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"
              onClick={() => void boardQuery.refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const loadedBoard = board;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (active.data.current?.type === "section") {
      const targetSectionId =
        over.data.current?.type === "issue"
          ? String(over.data.current.sectionId)
          : String(over.id);
      const position = loadedBoard.sections.findIndex(
        (section) => section.id === targetSectionId,
      );
      if (loadedBoard.role === "admin" && position >= 0) {
        sectionMoveMutation.mutate({ position, sectionId: String(active.id) });
      }
      return;
    }

    if (active.data.current?.type !== "issue") return;

    const targetSectionId =
      over.data.current?.type === "section"
        ? String(over.id)
        : over.data.current?.type === "issue"
          ? String(over.data.current.sectionId)
          : null;
    const targetSection = loadedBoard.sections.find(
      (section) => section.id === targetSectionId,
    );
    if (!targetSection) return;

    const targetPosition =
      over.data.current?.type === "issue"
        ? targetSection.issues.findIndex((issue) => issue.id === over.id)
        : targetSection.issues.length;
    if (targetPosition < 0) return;

    issueMoveMutation.mutate({
      issueId: String(active.id),
      position: targetPosition,
      sectionId: targetSection.id,
    });
  }

  const moveError = sectionMoveMutation.error ?? issueMoveMutation.error;

  return (
    <div className="min-h-[calc(100svh-4rem)] py-8 lg:min-h-[calc(100svh-5rem)] lg:py-10">
      <div className="px-4 md:px-8 lg:px-12">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          href={`/dashboard/organizations/${board.organisationId}`}
        >
          <ArrowLeftIcon aria-hidden className="size-4" weight="bold" />
          All boards
        </Link>

        <div className="mt-6 flex flex-col items-start justify-between gap-5 border-b border-border pb-8 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <KanbanIcon aria-hidden className="size-5" weight="duotone" />
              </span>
              <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                {board.title}
              </h1>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground">
                {board.role === "admin" ? "Admin" : "Member"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {board.sections.length} section
                {board.sections.length === 1 ? "" : "s"}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${
                    connectionState === "live"
                      ? "bg-secondary"
                      : connectionState === "connecting"
                        ? "animate-pulse bg-signal"
                        : "bg-muted-foreground"
                  }`}
                />
                {connectionState === "live"
                  ? "Live"
                  : connectionState === "connecting"
                    ? "Connecting"
                    : "Reconnecting"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Presence presence={presence} />
            {board.role === "admin" ? (
              <>
                <CreateSectionDialog boardId={board.id} />
                <BoardSettingsDialog
                  boardId={board.id}
                  onDeleted={() =>
                    router.replace(
                      `/dashboard/organizations/${board.organisationId}`,
                    )
                  }
                  organisationId={board.organisationId}
                  title={board.title}
                />
              </>
            ) : null}
          </div>
        </div>

        {moveError ? (
          <p
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {moveError.message}
          </p>
        ) : null}
      </div>

      {board.sections.length === 0 ? (
        <div className="px-4 md:px-8 lg:px-12">
          <div className="mt-8 grid min-h-80 place-items-center rounded-2xl border border-dashed border-border bg-surface px-6 text-center">
            <div className="max-w-sm">
              <CheckCircleIcon
                aria-hidden
                className="mx-auto size-11 text-secondary"
                weight="duotone"
              />
              <h2 className="mt-5 text-lg font-semibold">No sections yet</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {board.role === "admin"
                  ? "Create the first section to start organizing issues."
                  : "An organization admin needs to create the first section."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <DndContext
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={board.sections.map((section) => section.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div
              aria-label="Board sections"
              className="mt-8 flex gap-4 overflow-x-auto px-4 pb-8 md:px-8 lg:px-12"
            >
              {board.sections.map((section) => (
                <SortableBoardColumn
                  board={board}
                  key={section.id}
                  section={section}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
