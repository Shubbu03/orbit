"use client";

import {
  createCommentInputSchema,
  updateCommentInputSchema,
  updateIssueInputSchema,
  type BoardResponse,
  type Comment,
  type IssueResponse,
} from "@orbit/contracts/entities";
import {
  ArrowLeftIcon,
  ChatCircleIcon,
  CheckIcon,
  PencilSimpleIcon,
  TrashIcon,
  UserPlusIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";

import { assignIssue, unassignIssue } from "@/features/assignees/api/assignees";
import { boardKeys, getBoard } from "@/features/boards/api/boards";
import { useBoardRealtime } from "@/features/boards/realtime/use-board-realtime";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from "@/features/comments/api/comments";
import {
  listMemberships,
  membershipKeys,
} from "@/features/memberships/api/memberships";
import { useWorkspaceUser } from "@/features/workspace/workspace-user-context";
import { OrbitApiError } from "@/lib/api/error";

import {
  deleteIssue,
  getIssue,
  issueKeys,
  moveIssue,
  updateIssue,
} from "../api/issues";

const commentTimestampFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  timeZoneName: "short",
  year: "numeric",
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function PersonAvatar({ image, name }: { image: string | null; name: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-mono text-[10px] font-bold text-secondary-foreground">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" src={image} />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function CommentItem({
  boardRole,
  comment,
  currentUserId,
  issueId,
}: {
  boardRole: "admin" | "member";
  comment: Comment;
  currentUserId: string;
  issueId: string;
}) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const canEdit = comment.userId === currentUserId;
  const canDelete = canEdit || boardRole === "admin";
  const updateMutation = useMutation({
    mutationFn: (content: string) => updateComment(comment.id, { content }),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({
        queryKey: issueKeys.detail(issueId),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => {
      setConfirmingDelete(false);
      void queryClient.invalidateQueries({
        queryKey: issueKeys.detail(issueId),
      });
    },
  });

  function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateCommentInputSchema.safeParse({
      content: new FormData(event.currentTarget).get("content"),
    });

    if (!parsed.success) {
      setContentError(
        z.flattenError(parsed.error).fieldErrors.content?.[0] ?? null,
      );
      return;
    }

    setContentError(null);
    updateMutation.mutate(parsed.data.content);
  }

  return (
    <li className="flex gap-3 border-b border-border py-5 last:border-b-0">
      <PersonAvatar image={comment.author.image} name={comment.author.name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">{comment.author.name}</p>
          <time
            className="font-mono text-[9px] text-muted-foreground"
            dateTime={comment.createdAt}
          >
            {commentTimestampFormatter.format(new Date(comment.createdAt))}
          </time>
        </div>

        {editing ? (
          <form className="mt-3" onSubmit={handleUpdate}>
            <label className="sr-only" htmlFor={inputId}>
              Edit comment
            </label>
            <textarea
              autoFocus
              className="min-h-24 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-6 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              defaultValue={comment.content}
              disabled={updateMutation.isPending}
              id={inputId}
              maxLength={5_000}
              name="content"
            />
            {contentError || updateMutation.isError ? (
              <p className="mt-1.5 text-xs text-destructive" role="alert">
                {contentError ?? updateMutation.error?.message}
              </p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <button
                className="h-9 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
                disabled={updateMutation.isPending}
                type="submit"
              >
                {updateMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                className="h-9 rounded-lg border border-border px-4 text-xs font-semibold"
                disabled={updateMutation.isPending}
                onClick={() => setEditing(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {comment.content}
          </p>
        )}

        {!editing && (canEdit || canDelete) ? (
          <div className="mt-3 flex gap-3">
            {canEdit ? (
              <button
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
                type="button"
              >
                <PencilSimpleIcon aria-hidden className="size-3.5" />
                Edit
              </button>
            ) : null}
            {canDelete ? (
              confirmingDelete ? (
                <span className="inline-flex items-center gap-2">
                  <button
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                    disabled={deleteMutation.isPending}
                    onClick={() => setConfirmingDelete(false)}
                    type="button"
                  >
                    Keep
                  </button>
                  <button
                    className="text-xs font-semibold text-destructive disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    type="button"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
                  </button>
                </span>
              ) : (
                <button
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                  type="button"
                >
                  <TrashIcon aria-hidden className="size-3.5" />
                  Delete
                </button>
              )
            ) : null}
          </div>
        ) : null}
        {deleteMutation.isError ? (
          <p className="mt-2 text-xs text-destructive" role="alert">
            {deleteMutation.error.message}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function IssueDetailsPage({
  boardId,
  issueId,
  onClose,
  boardIsSaving = false,
}: {
  boardId: string;
  issueId: string;
  onClose?: () => void;
  boardIsSaving?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useWorkspaceUser();
  const titleId = useId();
  const descriptionId = useId();
  const commentId = useId();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    description: string | undefined;
    title: string | undefined;
  }>({ description: undefined, title: undefined });
  const [commentError, setCommentError] = useState<string | null>(null);
  const [additionalComments, setAdditionalComments] = useState<Comment[]>([]);
  const [nextCommentsOffset, setNextCommentsOffset] = useState(50);
  const [hasMoreComments, setHasMoreComments] = useState<boolean | null>(null);

  const boardQuery = useQuery({
    enabled: !onClose,
    queryFn: () => getBoard(boardId),
    queryKey: boardKeys.detail(boardId),
  });
  const issueQuery = useQuery({
    queryFn: () => getIssue(issueId),
    queryKey: issueKeys.detail(issueId),
  });
  const organisationId = boardQuery.data?.board.organisationId;
  const membersQuery = useInfiniteQuery({
    enabled: Boolean(organisationId),
    queryFn: ({ pageParam }) =>
      listMemberships(organisationId ?? "", pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) =>
      page.page.hasMore ? page.page.offset + page.page.limit : undefined,
    queryKey: organisationId
      ? membershipKeys.list(organisationId)
      : membershipKeys.all,
  });

  const updateMutation = useMutation({
    mutationFn: (input: { description: string; title: string }) =>
      updateIssue(issueId, input),
    onSuccess: ({ issue: saved }) => {
      queryClient.setQueryData<IssueResponse>(
        issueKeys.detail(issueId),
        (current) =>
          current ? { issue: { ...current.issue, ...saved } } : current,
      );
      queryClient.setQueryData<BoardResponse>(
        boardKeys.detail(boardId),
        (current) =>
          current
            ? {
                board: {
                  ...current.board,
                  sections: current.board.sections.map((section) => ({
                    ...section,
                    issues: section.issues.map((card) =>
                      card.id === saved.id ? { ...card, ...saved } : card,
                    ),
                  })),
                },
              }
            : current,
      );
      setEditing(false);
      void queryClient.invalidateQueries({
        queryKey: issueKeys.detail(issueId),
      });
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
    },
  });
  const moveMutation = useMutation({
    mutationFn: (sectionId: string) =>
      moveIssue(issueId, {
        sectionId,
        position:
          boardQuery.data?.board.sections.find(
            (section) => section.id === sectionId,
          )?.issues.length ?? 0,
      }),
    onSuccess: ({ issue: moved }) => {
      queryClient.setQueryData<IssueResponse>(
        issueKeys.detail(issueId),
        (current) =>
          current ? { issue: { ...current.issue, ...moved } } : current,
      );
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteIssue(issueId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: issueKeys.detail(issueId) });
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
      if (onClose) onClose();
      else router.replace(`/dashboard/boards/${boardId}`);
    },
  });
  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createComment({ content, issueId }),
    onSuccess: ({ comment }) => {
      queryClient.setQueryData<IssueResponse>(
        issueKeys.detail(issueId),
        (current) =>
          current
            ? {
                issue: {
                  ...current.issue,
                  comments: [
                    comment,
                    ...current.issue.comments.filter(
                      (item) => item.id !== comment.id,
                    ),
                  ],
                },
              }
            : current,
      );
      setCommentError(null);
      void queryClient.invalidateQueries({
        queryKey: issueKeys.detail(issueId),
      });
    },
  });
  const loadCommentsMutation = useMutation({
    mutationFn: () => listComments(issueId, nextCommentsOffset),
    onSuccess: (response) => {
      setAdditionalComments((current) => [...current, ...response.comments]);
      setNextCommentsOffset(response.page.offset + response.page.limit);
      setHasMoreComments(response.page.hasMore);
    },
  });
  const assignMutation = useMutation({
    mutationFn: (userId: string) => assignIssue(issueId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: issueKeys.detail(issueId),
      });
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
    },
  });
  const unassignMutation = useMutation({
    mutationFn: (userId: string) => unassignIssue(issueId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: issueKeys.detail(issueId),
      });
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
    },
  });

  const issue = issueQuery.data?.issue;
  const board = boardQuery.data?.board;
  const boardOrganisationId = board?.organisationId;
  const handleBoardDeleted = useCallback(() => {
    if (boardOrganisationId) {
      router.replace(`/dashboard/organizations/${boardOrganisationId}`);
    } else {
      router.replace("/dashboard");
    }
  }, [boardOrganisationId, router]);
  useBoardRealtime({
    boardId,
    enabled: Boolean(board) && !onClose,
    onBoardDeleted: handleBoardDeleted,
  });
  const comments = useMemo(() => {
    const byId = new Map<string, Comment>();

    for (const comment of [...(issue?.comments ?? []), ...additionalComments]) {
      byId.set(comment.id, comment);
    }

    return Array.from(byId.values()).sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  }, [additionalComments, issue?.comments]);

  if (issueQuery.isPending || boardQuery.isPending) {
    return (
      <div className="animate-pulse px-4 py-8 md:px-8 lg:px-12">
        <div className="h-4 w-28 rounded-full bg-muted" />
        <div className="mt-8 h-10 w-2/3 rounded-full bg-muted" />
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="h-96 rounded-3xl bg-surface" />
          <div className="h-72 rounded-3xl bg-surface" />
        </div>
      </div>
    );
  }

  if (
    issueQuery.isError ||
    boardQuery.isError ||
    !issue ||
    !board ||
    issue.boardId !== board.id
  ) {
    const message =
      issueQuery.error?.message ??
      boardQuery.error?.message ??
      "This issue does not belong to the selected board.";

    return (
      <div className="grid min-h-[calc(100svh-4rem)] place-items-center px-6 lg:min-h-[calc(100svh-5rem)]">
        <div className="max-w-sm text-center">
          <WarningCircleIcon
            aria-hidden
            className="mx-auto size-10 text-destructive"
            weight="duotone"
          />
          <h1 className="mt-5 text-xl font-semibold">
            Issue could not be loaded
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <Link
            className="mt-6 inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted"
            href={`/dashboard/boards/${boardId}`}
          >
            Back to board
          </Link>
        </div>
      </div>
    );
  }

  const acceptedMembers =
    membersQuery.data?.pages
      .flatMap((page) => page.memberships)
      .filter((membership) => membership.accepted) ?? [];
  const assignedIds = new Set(issue.assignees.map((assignee) => assignee.id));
  const showMoreComments = hasMoreComments ?? issue.commentsPage.hasMore;

  function handleIssueUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = updateIssueInputSchema.safeParse({
      description: formData.get("description"),
      title: formData.get("title"),
    });

    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors({
        description: errors.description?.[0],
        title: errors.title?.[0],
      });
      return;
    }

    setFieldErrors({ description: undefined, title: undefined });
    updateMutation.mutate(parsed.data, {
      onError: (error) => {
        if (error instanceof OrbitApiError) {
          setFieldErrors({
            description: error.fields?.description?.[0],
            title: error.fields?.title?.[0],
          });
        }
      },
    });
  }

  function handleCommentCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = createCommentInputSchema.safeParse({
      content: new FormData(form).get("content"),
      issueId,
    });

    if (!parsed.success) {
      setCommentError(
        z.flattenError(parsed.error).fieldErrors.content?.[0] ?? null,
      );
      return;
    }

    setCommentError(null);
    createCommentMutation.mutate(parsed.data.content, {
      onSuccess: () => form.reset(),
    });
  }

  return (
    <div
      className={onClose ? "p-4 sm:p-6" : "mx-auto max-w-6xl px-4 py-6 sm:px-6"}
    >
      <div className="mx-auto max-w-6xl">
        {!onClose ? (
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            href={`/dashboard/boards/${board.id}`}
          >
            <ArrowLeftIcon aria-hidden className="size-4" weight="bold" />
            {board.title}
          </Link>
        ) : null}

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="min-w-0">
            {editing ? (
              <form onSubmit={handleIssueUpdate}>
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={titleId}
                >
                  Issue title
                </label>
                <input
                  autoFocus
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-lg font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  defaultValue={issue.title}
                  disabled={updateMutation.isPending}
                  id={titleId}
                  maxLength={200}
                  name="title"
                />
                {fieldErrors.title ? (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrors.title}
                  </p>
                ) : null}

                <label
                  className="mt-5 block text-xs font-semibold text-muted-foreground"
                  htmlFor={descriptionId}
                >
                  Description
                </label>
                <textarea
                  className="mt-2 min-h-48 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  defaultValue={issue.description}
                  disabled={updateMutation.isPending}
                  id={descriptionId}
                  maxLength={5_000}
                  name="description"
                />
                {fieldErrors.description ? (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrors.description}
                  </p>
                ) : null}
                {updateMutation.isError &&
                !fieldErrors.title &&
                !fieldErrors.description ? (
                  <p className="mt-3 text-sm text-destructive" role="alert">
                    {updateMutation.error.message}
                  </p>
                ) : null}
                <div className="mt-5 flex gap-2">
                  <button
                    className="h-10 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                    disabled={updateMutation.isPending}
                    type="submit"
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    className="h-10 rounded-lg border border-border px-5 text-sm font-semibold"
                    disabled={updateMutation.isPending}
                    onClick={() => setEditing(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] font-semibold text-muted-foreground">
                      Issue
                    </p>
                    <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight">
                      <button
                        className="rounded text-left hover:text-muted-foreground"
                        onClick={() => setEditing(true)}
                        type="button"
                      >
                        {issue.title}
                      </button>
                    </h1>
                  </div>
                  <button
                    aria-label="Edit issue"
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setEditing(true)}
                    type="button"
                  >
                    <PencilSimpleIcon
                      aria-hidden
                      className="size-4"
                      weight="bold"
                    />
                  </button>
                </div>
                <button
                  className="mt-5 block min-h-16 w-full rounded-lg bg-surface p-3 text-left text-sm leading-6 whitespace-pre-wrap text-muted-foreground hover:bg-muted"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  {issue.description || "Add a description…"}
                </button>
              </>
            )}

            <div className="mt-10 border-t border-border pt-7">
              <div className="flex items-center gap-2">
                <ChatCircleIcon
                  aria-hidden
                  className="size-5"
                  weight="duotone"
                />
                <h2 className="text-lg font-semibold">Comments</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                  {comments.length}
                </span>
              </div>

              <form className="mt-5" onSubmit={handleCommentCreate}>
                <label className="sr-only" htmlFor={commentId}>
                  Add comment
                </label>
                <textarea
                  className="min-h-28 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                  disabled={createCommentMutation.isPending}
                  id={commentId}
                  maxLength={5_000}
                  name="content"
                  placeholder="Add a comment…"
                />
                {commentError || createCommentMutation.isError ? (
                  <p className="mt-1.5 text-xs text-destructive" role="alert">
                    {commentError ?? createCommentMutation.error?.message}
                  </p>
                ) : null}
                <button
                  className="mt-3 h-10 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  disabled={createCommentMutation.isPending}
                  type="submit"
                >
                  {createCommentMutation.isPending
                    ? "Posting…"
                    : "Post comment"}
                </button>
              </form>

              {comments.length === 0 ? (
                <p className="mt-7 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                  No comments yet.
                </p>
              ) : (
                <ul className="mt-5">
                  {comments.map((comment) => (
                    <CommentItem
                      boardRole={board.role}
                      comment={comment}
                      currentUserId={currentUser.id}
                      issueId={issue.id}
                      key={comment.id}
                    />
                  ))}
                </ul>
              )}
              {showMoreComments ? (
                <button
                  className="mt-4 h-10 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50"
                  disabled={loadCommentsMutation.isPending}
                  onClick={() => loadCommentsMutation.mutate()}
                  type="button"
                >
                  {loadCommentsMutation.isPending
                    ? "Loading…"
                    : "Load older comments"}
                </button>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg bg-surface p-4">
              <label
                className="text-sm font-semibold"
                htmlFor={`${titleId}-section`}
              >
                List
              </label>
              <select
                className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-2 text-sm"
                disabled={moveMutation.isPending || boardIsSaving}
                id={`${titleId}-section`}
                onChange={(event) => moveMutation.mutate(event.target.value)}
                value={
                  moveMutation.isPending
                    ? moveMutation.variables
                    : issue.sectionId
                }
              >
                {board.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
              {boardIsSaving ? (
                <p className="mt-2 text-xs text-muted-foreground" role="status">
                  Saving board moves…
                </p>
              ) : null}
              {moveMutation.isError ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {moveMutation.error.message}
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2">
                <UserPlusIcon aria-hidden className="size-4" weight="duotone" />
                <h2 className="text-sm font-semibold">Assignees</h2>
              </div>
              {issue.assignees.length > 0 ? (
                <ul className="mt-4 grid gap-2">
                  {issue.assignees.map((assignee) => (
                    <li className="flex items-center gap-2" key={assignee.id}>
                      <PersonAvatar
                        image={assignee.image}
                        name={assignee.name}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {assignee.name}
                      </span>
                      <button
                        aria-label={`Unassign ${assignee.name}`}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        disabled={unassignMutation.isPending}
                        onClick={() => unassignMutation.mutate(assignee.id)}
                        type="button"
                      >
                        <XIcon aria-hidden className="size-4" weight="bold" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Nobody is assigned yet.
                </p>
              )}

              {acceptedMembers.some(
                (membership) => !assignedIds.has(membership.userId),
              ) ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Add assignee
                  </p>
                  <div className="mt-2 grid gap-1">
                    {acceptedMembers
                      .filter(
                        (membership) => !assignedIds.has(membership.userId),
                      )
                      .map((membership) => (
                        <button
                          className="flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                          disabled={assignMutation.isPending}
                          key={membership.id}
                          onClick={() =>
                            assignMutation.mutate(membership.userId)
                          }
                          type="button"
                        >
                          <PersonAvatar
                            image={membership.user.image}
                            name={membership.user.name}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {membership.user.name}
                          </span>
                          <CheckIcon aria-hidden className="size-4 opacity-0" />
                        </button>
                      ))}
                  </div>
                </div>
              ) : null}
              {membersQuery.hasNextPage ? (
                <button
                  className="mt-3 text-xs underline"
                  disabled={membersQuery.isFetchingNextPage}
                  onClick={() => void membersQuery.fetchNextPage()}
                  type="button"
                >
                  {membersQuery.isFetchingNextPage
                    ? "Loading…"
                    : "Load more members"}
                </button>
              ) : null}
              {membersQuery.isError ? (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  Could not load members.{" "}
                  <button
                    className="underline"
                    onClick={() => void membersQuery.refetch()}
                    type="button"
                  >
                    Retry
                  </button>
                </p>
              ) : null}
              {assignMutation.isError || unassignMutation.isError ? (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {assignMutation.error?.message ??
                    unassignMutation.error?.message}
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <h2 className="text-sm font-semibold">Delete issue</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                This also deletes its comments and assignments.
              </p>
              {confirmingDelete ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className="h-9 rounded-lg border border-border px-3 text-xs font-semibold"
                    disabled={deleteMutation.isPending}
                    onClick={() => setConfirmingDelete(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-destructive px-3 text-xs font-bold text-white disabled:opacity-60"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    type="button"
                  >
                    <TrashIcon aria-hidden className="size-3.5" weight="bold" />
                    {deleteMutation.isPending ? "Deleting…" : "Confirm delete"}
                  </button>
                </div>
              ) : (
                <button
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-destructive/40 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmingDelete(true)}
                  type="button"
                >
                  <TrashIcon aria-hidden className="size-3.5" weight="bold" />
                  Delete issue
                </button>
              )}
              {deleteMutation.isError ? (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  {deleteMutation.error.message}
                </p>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
