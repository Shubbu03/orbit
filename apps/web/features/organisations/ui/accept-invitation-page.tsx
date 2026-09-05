"use client";

import {
  CheckCircleIcon,
  UserPlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { acceptInvitation } from "../api/invitations";
import { organisationKeys } from "../api/organisations";

export function AcceptInvitationPage({
  organisationId,
}: {
  organisationId: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitation({ organisationId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });

  return (
    <div className="grid min-h-[calc(100svh-4rem)] place-items-center px-5 py-12 lg:min-h-[calc(100svh-5rem)]">
      <section className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-7 text-center shadow-panel sm:p-9">
        {acceptMutation.isSuccess ? (
          <CheckCircleIcon
            aria-hidden
            className="mx-auto size-12 text-secondary"
            weight="duotone"
          />
        ) : acceptMutation.isError ? (
          <WarningCircleIcon
            aria-hidden
            className="mx-auto size-12 text-destructive"
            weight="duotone"
          />
        ) : (
          <UserPlusIcon
            aria-hidden
            className="mx-auto size-12 text-secondary"
            weight="duotone"
          />
        )}

        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
          {acceptMutation.isSuccess
            ? "Invitation accepted"
            : acceptMutation.isError
              ? "Invitation could not be accepted"
              : "Join this organization"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {acceptMutation.isSuccess
            ? "You now have access to its boards and issues."
            : acceptMutation.isError
              ? acceptMutation.error.message
              : "Accept the invitation to add this workspace to your dashboard."}
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {acceptMutation.isSuccess ? (
            <button
              className="h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground"
              onClick={() =>
                router.replace(`/dashboard/organizations/${organisationId}`)
              }
              type="button"
            >
              View organization
            </button>
          ) : (
            <button
              className="h-11 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              disabled={acceptMutation.isPending}
              onClick={() => acceptMutation.mutate()}
              type="button"
            >
              {acceptMutation.isPending ? "Accepting…" : "Accept invitation"}
            </button>
          )}
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
