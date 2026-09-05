"use client";

import type {
  BoardDetails,
  BoardResponse,
  Person,
} from "@orbit/contracts/entities";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
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
  DotsSixVerticalIcon,
  TextAlignLeftIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useMemo, useState } from "react";

import { createIssue } from "@/features/issues/api/issues";
import { IssueDialog } from "@/features/issues/ui/issue-dialog";
import { ManageMembersDialog } from "@/features/memberships/ui/manage-members-dialog";
import { createSection } from "@/features/sections/api/sections";
import { SectionSettingsDialog } from "@/features/sections/ui/section-settings-dialog";
import { boardKeys, getBoard } from "../api/boards";
import { useBoardMoves } from "../hooks/use-board-moves";
import { applyBoardMove, type BoardMove } from "../model/board-moves";
import { useBoardRealtime } from "../realtime/use-board-realtime";
import { BoardSettingsDialog } from "./board-settings-dialog";
import { InlineComposer } from "./inline-composer";

type BoardIssue = BoardDetails["sections"][number]["issues"][number];
type BoardSection = BoardDetails["sections"][number];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const People = memo(function People({ people }: { people: Person[] }) {
  return (
    <span
      className="flex -space-x-1.5"
      aria-label={people.map((person) => person.name).join(", ")}
    >
      {people.slice(0, 4).map((person) => (
        <span
          className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-surface-raised bg-secondary text-[10px] font-semibold text-secondary-foreground"
          key={person.id}
          title={person.name}
        >
          {person.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="size-full object-cover" src={person.image} />
          ) : (
            initials(person.name)
          )}
        </span>
      ))}
      {people.length > 4 ? (
        <span className="grid size-7 place-items-center rounded-full border-2 border-surface-raised bg-muted text-[10px]">
          +{people.length - 4}
        </span>
      ) : null}
    </span>
  );
});

const CardContents = memo(function CardContents({
  issue,
}: {
  issue: BoardIssue;
}) {
  return (
    <>
      <span className="block break-words text-sm font-medium leading-5">
        {issue.title}
      </span>
      {issue.description || issue.assignees.length ? (
        <span className="mt-3 flex items-center justify-between gap-2">
          {issue.description ? (
            <TextAlignLeftIcon
              aria-label="Has description"
              className="size-4 text-muted-foreground"
            />
          ) : (
            <span />
          )}
          <People people={issue.assignees} />
        </span>
      ) : null}
    </>
  );
});

const SortableIssueCard = memo(function SortableIssueCard({
  issue,
  onOpen,
}: {
  issue: BoardIssue;
  onOpen: (id: string) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    data: { sectionId: issue.sectionId, type: "issue" },
    id: issue.id,
    transition: { duration: 140, easing: "ease" },
  });
  return (
    <button
      {...attributes}
      {...listeners}
      aria-label={`Open ${issue.title}. Hold to drag, or press Space to move.`}
      className={`board-card w-full touch-manipulation rounded-lg border bg-surface-raised px-3 py-3 text-left shadow-sm hover:border-ring focus-visible:outline-2 focus-visible:outline-ring ${isDragging ? "border-dashed border-ring opacity-25" : "border-border"}`}
      onClick={() => {
        if (!isDragging) onOpen(issue.id);
      }}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      type="button"
    >
      <CardContents issue={issue} />
    </button>
  );
});

const SortableBoardColumn = memo(function SortableBoardColumn({
  boardId,
  canManage,
  section,
  onOpen,
}: {
  boardId: string;
  canManage: boolean;
  section: BoardSection;
  onOpen: (id: string) => void;
}) {
  const queryClient = useQueryClient();
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
    disabled: { draggable: !canManage },
    id: section.id,
    transition: { duration: 140, easing: "ease" },
  });
  const items = useMemo(
    () => section.issues.map((issue) => issue.id),
    [section.issues],
  );

  async function addCard(title: string) {
    const { issue } = await createIssue({
      boardId,
      sectionId: section.id,
      title,
      description: "",
    });
    queryClient.setQueryData<BoardResponse>(
      boardKeys.detail(boardId),
      (current) =>
        current
          ? {
              board: {
                ...current.board,
                sections: current.board.sections.map((item) =>
                  item.id === section.id
                    ? {
                        ...item,
                        issues: item.issues.some((card) => card.id === issue.id)
                          ? item.issues
                          : [...item.issues, { ...issue, assignees: [] }],
                      }
                    : item,
                ),
              },
            }
          : current,
    );
  }

  return (
    <section
      className={`board-column flex max-h-full w-[min(85vw,18rem)] shrink-0 flex-col rounded-xl border border-border/60 bg-surface p-2 ${isDragging ? "opacity-30" : ""}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex min-h-10 items-center gap-1 px-1 pb-1">
        {canManage ? (
          <button
            {...attributes}
            {...listeners}
            aria-label={`Move ${section.title} list`}
            className="grid size-8 shrink-0 touch-none place-items-center rounded-md text-muted-foreground hover:bg-muted"
            ref={setActivatorNodeRef}
            type="button"
          >
            <DotsSixVerticalIcon aria-hidden className="size-4" />
          </button>
        ) : null}
        <h2
          className="min-w-0 flex-1 truncate px-1 text-sm font-semibold"
          title={section.title}
        >
          {section.title}
        </h2>
        <span className="px-1 text-xs text-muted-foreground">
          {section.issues.length}
        </span>
        {canManage ? (
          <SectionSettingsDialog
            boardId={boardId}
            sectionId={section.id}
            title={section.title}
          />
        ) : null}
      </div>
      <div className="min-h-16 overflow-y-auto overscroll-y-contain px-0.5 pb-0.5">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="grid min-h-12 content-start gap-2">
            {section.issues.map((issue) => (
              <SortableIssueCard issue={issue} key={issue.id} onOpen={onOpen} />
            ))}
          </div>
        </SortableContext>
      </div>
      <InlineComposer
        label="Add a card"
        maxLength={200}
        onCreate={addCard}
        placeholder="Enter a title for this card…"
        className="mt-1 shrink-0"
      />
    </section>
  );
});

const boardCollision: CollisionDetection = (args) => {
  if (args.active.data.current?.type === "section") {
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (item) => item.data.current?.type === "section",
      ),
    });
  }
  const hits = pointerWithin(args);
  if (hits.length) {
    const cards = hits.filter(
      (hit) =>
        args.droppableContainers.find((item) => item.id === hit.id)?.data
          .current?.type === "issue",
    );
    return cards.length ? cards : hits;
  }
  // Use rectangle overlap near list edges and geometry for keyboard movement.
  return args.pointerCoordinates
    ? rectIntersection(args)
    : closestCorners(args);
};

export function BoardWorkspacePage({ boardId }: { boardId: string }) {
  return <BoardWorkspace key={boardId} boardId={boardId} />;
}

function BoardWorkspace({ boardId }: { boardId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const moves = useBoardMoves(boardId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<BoardMove | null>(null);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);
  const boardQuery = useQuery({
    queryFn: () => getBoard(boardId),
    queryKey: boardKeys.detail(boardId),
    enabled: !moves.isSaving && !activeId,
  });
  const baseBoard = boardQuery.data?.board;
  const optimisticBoard = useMemo(
    () =>
      baseBoard ? moves.pending.reduce(applyBoardMove, baseBoard) : undefined,
    [baseBoard, moves.pending],
  );
  const board = useMemo(
    () =>
      optimisticBoard && preview
        ? applyBoardMove(optimisticBoard, preview)
        : optimisticBoard,
    [optimisticBoard, preview],
  );
  const organisationId = board?.organisationId;
  const handleBoardDeleted = useCallback(() => {
    router.replace(
      organisationId
        ? `/dashboard/organizations/${organisationId}`
        : "/dashboard",
    );
  }, [organisationId, router]);
  const { connectionState, presence } = useBoardRealtime({
    boardId,
    enabled: Boolean(board),
    onBoardDeleted: handleBoardDeleted,
    deferBoardRefresh: moves.isSaving || Boolean(activeId),
  });
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const openCard = useCallback((id: string) => setOpenIssueId(id), []);
  const closeCard = useCallback(() => setOpenIssueId(null), []);

  if (boardQuery.isPending)
    return (
      <div
        aria-label="Loading board"
        className="flex gap-3 overflow-hidden p-4"
      >
        {[0, 1, 2].map((id) => (
          <div
            className="h-80 w-72 shrink-0 animate-pulse rounded-xl bg-surface"
            key={id}
          />
        ))}
      </div>
    );
  if (!board)
    return (
      <div className="grid min-h-80 place-items-center p-6 text-center">
        <div>
          <WarningCircleIcon
            aria-hidden
            className="mx-auto size-8 text-destructive"
          />
          <h1 className="mt-4 text-lg font-semibold">
            Board could not be loaded
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {boardQuery.error?.message}
          </p>
          <button
            className="mt-4 rounded-lg border border-border px-4 py-2"
            onClick={() => void boardQuery.refetch()}
            type="button"
          >
            Try again
          </button>
        </div>
      </div>
    );
  const loadedBoard = board;
  const draggedIssue = board.sections
    .flatMap((section) => section.issues)
    .find((issue) => issue.id === activeId);
  const draggedSection = board.sections.find(
    (section) => section.id === activeId,
  );

  function targetFor(event: DragOverEvent | DragEndEvent) {
    const { over } = event;
    if (!over) return null;
    const section = loadedBoard.sections.find(
      (item) =>
        item.id === over.id ||
        item.issues.some((issue) => issue.id === over.id),
    );
    return section
      ? {
          section,
          index: section.issues.findIndex((issue) => issue.id === over.id),
        }
      : null;
  }

  function handleDragOver(event: DragOverEvent) {
    if (event.active.data.current?.type !== "issue") return;
    const target = targetFor(event);
    const source = loadedBoard.sections.find((section) =>
      section.issues.some((issue) => issue.id === event.active.id),
    );
    if (!target || !source || source.id === target.section.id) return;
    const below =
      event.over &&
      event.active.rect.current.translated &&
      event.active.rect.current.translated.top >
        event.over.rect.top + event.over.rect.height / 2;
    setPreview({
      type: "issue",
      issueId: String(event.active.id),
      sectionId: target.section.id,
      position:
        target.index < 0
          ? target.section.issues.length
          : target.index + (below ? 1 : 0),
    });
  }

  function finishDrag(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setPreview(null);
    if (!over) return;
    const target = targetFor(event);
    if (!target) return;
    if (active.data.current?.type === "section") {
      if (loadedBoard.role === "admin" && active.id !== target.section.id)
        moves.enqueue({
          type: "section",
          sectionId: String(active.id),
          position: loadedBoard.sections.findIndex(
            (section) => section.id === target.section.id,
          ),
        });
      return;
    }
    if (active.data.current?.type !== "issue") return;
    const position =
      target.index < 0
        ? target.section.issues.filter((issue) => issue.id !== active.id).length
        : target.index;
    const original = optimisticBoard?.sections
      .flatMap((section) => section.issues)
      .find((issue) => issue.id === active.id);
    if (
      original?.sectionId === target.section.id &&
      original.position === position
    )
      return;
    moves.enqueue({
      type: "issue",
      issueId: String(active.id),
      sectionId: target.section.id,
      position,
    });
  }

  async function addList(title: string) {
    const { section } = await createSection({ boardId, title });
    queryClient.setQueryData<BoardResponse>(
      boardKeys.detail(boardId),
      (current) =>
        current
          ? {
              board: {
                ...current.board,
                sections: current.board.sections.some(
                  (item) => item.id === section.id,
                )
                  ? current.board.sections
                  : [...current.board.sections, { ...section, issues: [] }],
              },
            }
          : current,
    );
  }

  return (
    <div className="board-workspace flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to boards"
            className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-muted"
            href={`/dashboard/organizations/${board.organisationId}`}
          >
            <ArrowLeftIcon aria-hidden className="size-4" />
          </Link>
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {board.title}
          </h1>
          <span
            className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
            role="status"
          >
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${connectionState === "live" ? "bg-emerald-500" : "bg-muted-foreground"}`}
            />
            {moves.isSaving
              ? "Saving…"
              : connectionState === "live"
                ? "Live"
                : connectionState === "connecting"
                  ? "Connecting…"
                  : "Reconnecting…"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <People people={presence} />
          <ManageMembersDialog
            canManage={board.role === "admin"}
            organisationId={board.organisationId}
            organisationName="this organization"
          />
          {board.role === "admin" ? (
            <BoardSettingsDialog
              boardId={board.id}
              onDeleted={handleBoardDeleted}
              organisationId={board.organisationId}
              title={board.title}
            />
          ) : null}
        </div>
      </div>
      {moves.error ? (
        <p
          className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          Move could not be saved: {moves.error}
        </p>
      ) : null}
      {boardQuery.isError ? (
        <p className="px-4 py-2 text-sm text-destructive" role="alert">
          Could not refresh this board. Showing the last loaded version.{" "}
          <button
            className="underline"
            onClick={() => void boardQuery.refetch()}
            type="button"
          >
            Retry
          </button>
        </p>
      ) : null}
      <DndContext
        collisionDetection={boardCollision}
        onDragCancel={() => {
          setActiveId(null);
          setPreview(null);
          void queryClient.invalidateQueries({
            queryKey: boardKeys.detail(boardId),
          });
        }}
        onDragEnd={finishDrag}
        onDragOver={handleDragOver}
        onDragStart={({ active }) => {
          void queryClient.cancelQueries({
            queryKey: boardKeys.detail(boardId),
          });
          setActiveId(String(active.id));
        }}
        sensors={sensors}
      >
        <SortableContext
          items={board.sections.map((section) => section.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div
            aria-label="Board lists"
            className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto overscroll-x-contain p-4 sm:px-6"
          >
            {board.sections.map((section) => (
              <SortableBoardColumn
                boardId={board.id}
                canManage={board.role === "admin"}
                key={section.id}
                onOpen={openCard}
                section={section}
              />
            ))}
            {board.role === "admin" ? (
              <InlineComposer
                className="w-[min(85vw,18rem)] shrink-0 rounded-xl border border-border/60 bg-surface"
                label="Add a list"
                maxLength={100}
                onCreate={addList}
                placeholder="Enter list name…"
              />
            ) : null}
            {board.sections.length === 0 ? (
              <p className="max-w-xs shrink-0 p-3 text-sm text-muted-foreground">
                {board.role === "admin"
                  ? "Start with a list like Upcoming, In progress, or Done. Then add your cards."
                  : "An organization admin can add the first list."}
              </p>
            ) : null}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {draggedIssue ? (
            <div className="rotate-2 rounded-lg border border-ring bg-surface-raised px-3 py-3 shadow-panel">
              <CardContents issue={draggedIssue} />
            </div>
          ) : draggedSection ? (
            <div className="rounded-xl border border-ring bg-surface p-4 shadow-panel">
              <h2 className="text-sm font-semibold">{draggedSection.title}</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {draggedSection.issues.length} cards
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {openIssueId ? (
        <IssueDialog
          boardId={boardId}
          boardIsSaving={moves.isSaving}
          issueId={openIssueId}
          key={openIssueId}
          onClose={closeCard}
        />
      ) : null}
    </div>
  );
}
