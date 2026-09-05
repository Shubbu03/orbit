"use client";

import { inviteMemberInputSchema } from "@orbit/contracts/entities";
import {
  CheckIcon,
  CopyIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { z } from "zod";

import { inviteMember } from "@/features/organisations/api/invitations";
import { OrbitApiError } from "@/lib/api/error";

import {
  listMemberships,
  membershipKeys,
  removeMembership,
} from "../api/memberships";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ManageMembersDialog({
  canManage,
  organisationId,
  organisationName,
}: {
  canManage: boolean;
  organisationId: string;
  organisationName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inviteFormRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();
  const headingId = useId();
  const emailId = useId();
  const [open, setOpen] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [confirmingRemovalId, setConfirmingRemovalId] = useState<string | null>(
    null,
  );
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const membershipsQuery = useInfiniteQuery({
    enabled: open,
    queryKey: membershipKeys.list(organisationId),
    queryFn: ({ pageParam }) => listMemberships(organisationId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page.hasMore
        ? lastPage.page.offset + lastPage.page.limit
        : undefined,
  });
  const inviteMutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: () => {
      setEmailError(null);
      void queryClient.invalidateQueries({
        queryKey: membershipKeys.list(organisationId),
      });
    },
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      removeMembership({ organisationId, userId }),
    onSettled: () => setRemovingUserId(null),
    onSuccess: () => {
      setConfirmingRemovalId(null);
      void queryClient.invalidateQueries({
        queryKey: membershipKeys.list(organisationId),
      });
    },
  });

  const memberships =
    membershipsQuery.data?.pages.flatMap((page) => page.memberships) ?? [];

  function showDialog() {
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = inviteMemberInputSchema.safeParse({
      email: new FormData(event.currentTarget).get("email"),
      organisationId,
    });

    if (!parsed.success) {
      setEmailError(
        z.flattenError(parsed.error).fieldErrors.email?.[0] ?? null,
      );
      return;
    }

    setEmailError(null);
    inviteMutation.mutate(parsed.data, {
      onError: (error) => {
        if (error instanceof OrbitApiError) {
          setEmailError(error.fields?.email?.[0] ?? error.message);
        }
      },
      onSuccess: () => inviteFormRef.current?.reset(),
    });
  }

  async function copyInviteLink() {
    const inviteUrl = `${window.location.origin}/dashboard/invitations/${organisationId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
      setCopyError("The link could not be copied. Please try again.");
    }
  }

  return (
    <>
      <button
        className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface-raised px-4 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={showDialog}
        type="button"
      >
        <UsersThreeIcon aria-hidden className="size-4" weight="bold" />
        Members
      </button>

      <dialog
        aria-labelledby={headingId}
        className="m-auto max-h-[88svh] w-[min(94vw,42rem)] overflow-hidden rounded-xl border border-border bg-surface-raised p-0 text-foreground shadow-panel backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px]"
        onClose={() => {
          setOpen(false);
          setEmailError(null);
          setCopied(false);
          setCopyError(null);
          setConfirmingRemovalId(null);
        }}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold" id={headingId}>
              {organisationName} members
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManage
                ? "Invite people and manage access."
                : "People with access to this organization."}
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <XIcon aria-hidden className="size-4" weight="bold" />
          </button>
        </div>

        <div className="max-h-[calc(88svh-6rem)] overflow-y-auto p-6">
          {canManage ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={handleInvite}
                ref={inviteFormRef}
              >
                <div className="min-w-0 flex-1">
                  <label className="sr-only" htmlFor={emailId}>
                    Member email
                  </label>
                  <input
                    aria-invalid={Boolean(emailError)}
                    autoComplete="email"
                    className="h-11 w-full rounded-xl border border-border bg-surface-raised px-3.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    id={emailId}
                    name="email"
                    placeholder="teammate@example.com"
                    type="email"
                  />
                  {emailError ? (
                    <p className="mt-1.5 text-xs text-destructive" role="alert">
                      {emailError}
                    </p>
                  ) : null}
                </div>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  disabled={inviteMutation.isPending}
                  type="submit"
                >
                  <PaperPlaneTiltIcon
                    aria-hidden
                    className="size-4"
                    weight="bold"
                  />
                  {inviteMutation.isPending ? "Inviting…" : "Invite"}
                </button>
              </form>
              <button
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => void copyInviteLink()}
                type="button"
              >
                {copied ? (
                  <CheckIcon aria-hidden className="size-4" weight="bold" />
                ) : (
                  <CopyIcon aria-hidden className="size-4" weight="bold" />
                )}
                {copied ? "Invite link copied" : "Copy acceptance link"}
              </button>
              {copyError ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {copyError}
                </p>
              ) : null}
            </div>
          ) : null}

          {membershipsQuery.isPending ? (
            <div className="mt-5 grid gap-2" aria-label="Loading members">
              {[0, 1, 2].map((item) => (
                <div
                  className="h-16 animate-pulse rounded-xl bg-muted"
                  key={item}
                />
              ))}
            </div>
          ) : membershipsQuery.isError ? (
            <p
              className="mt-5 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              {membershipsQuery.error.message}
            </p>
          ) : (
            <ul className="mt-5 grid gap-2">
              {memberships.map((membership) => (
                <li
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                  key={membership.id}
                >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary font-mono text-xs font-bold text-secondary-foreground">
                    {membership.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="size-full object-cover"
                        src={membership.user.image}
                      />
                    ) : (
                      initials(membership.user.name)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {membership.user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {membership.user.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[9px] font-semibold text-muted-foreground">
                    {membership.accepted ? membership.role : "Pending"}
                  </span>
                  {canManage ? (
                    confirmingRemovalId === membership.userId ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          className="h-8 rounded-full border border-border px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                          disabled={removeMutation.isPending}
                          onClick={() => setConfirmingRemovalId(null)}
                          type="button"
                        >
                          Keep
                        </button>
                        <button
                          aria-label={`Confirm removal of ${membership.user.name}`}
                          className="h-8 rounded-full bg-destructive px-2.5 text-xs font-semibold text-white disabled:opacity-50"
                          disabled={removeMutation.isPending}
                          onClick={() => {
                            setRemovingUserId(membership.userId);
                            removeMutation.mutate(membership.userId);
                          }}
                          type="button"
                        >
                          {removingUserId === membership.userId
                            ? "Removing…"
                            : "Remove"}
                        </button>
                      </div>
                    ) : (
                      <button
                        aria-label={`Remove ${membership.user.name}`}
                        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        disabled={removeMutation.isPending}
                        onClick={() =>
                          setConfirmingRemovalId(membership.userId)
                        }
                        type="button"
                      >
                        <TrashIcon
                          aria-hidden
                          className="size-4"
                          weight="bold"
                        />
                      </button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {removeMutation.isError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {removeMutation.error.message}
            </p>
          ) : null}

          {membershipsQuery.hasNextPage ? (
            <button
              className="mx-auto mt-5 block h-10 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50"
              disabled={membershipsQuery.isFetchingNextPage}
              onClick={() => void membershipsQuery.fetchNextPage()}
              type="button"
            >
              {membershipsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
