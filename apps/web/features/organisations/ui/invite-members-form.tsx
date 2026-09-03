"use client";

import { inviteMemberInputSchema } from "@orbit/contracts/entities";
import { CheckCircleIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";

import { OrbitApiError } from "@/lib/api/error";

import { inviteMember } from "../api/invitations";

export function InviteMembersForm({
  onComplete,
  organisationId,
}: {
  onComplete: () => void;
  organisationId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const inviteMutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: (_response, input) => {
      setInvitedEmails((current) => [...current, input.email]);
      setEmailError(null);
      formRef.current?.reset();
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsedInput = inviteMemberInputSchema.safeParse({
      email: formData.get("email"),
      organisationId,
    });

    if (!parsedInput.success) {
      setEmailError(
        z.flattenError(parsedInput.error).fieldErrors.email?.[0] ?? null,
      );
      return;
    }

    setEmailError(null);
    inviteMutation.mutate(parsedInput.data, {
      onError: (error) => {
        if (error instanceof OrbitApiError) {
          setEmailError(error.fields?.email?.[0] ?? error.message);
        }
      },
    });
  }

  return (
    <div className="grid gap-5">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="invite-email">
            Member email
          </label>
          <input
            aria-describedby={emailError ? "invite-email-error" : undefined}
            aria-invalid={Boolean(emailError)}
            autoComplete="email"
            autoFocus
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20"
            id="invite-email"
            name="email"
            placeholder="teammate@example.com"
            type="email"
          />
          {emailError ? (
            <p
              className="mt-1.5 text-xs text-destructive"
              id="invite-email-error"
              role="alert"
            >
              {emailError}
            </p>
          ) : null}
        </div>
        <button
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
          disabled={inviteMutation.isPending}
          type="submit"
        >
          <PaperPlaneTiltIcon aria-hidden className="size-4" weight="bold" />
          {inviteMutation.isPending ? "Inviting…" : "Invite"}
        </button>
      </form>

      {invitedEmails.length > 0 ? (
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Invitations added
          </p>
          <ul className="mt-3 grid gap-2">
            {invitedEmails.map((email) => (
              <li className="flex items-center gap-2 text-sm" key={email}>
                <CheckCircleIcon
                  aria-hidden
                  className="size-4 text-secondary"
                  weight="fill"
                />
                <span className="truncate">{email}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        className="justify-self-end rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
        disabled={inviteMutation.isPending}
        onClick={onComplete}
        type="button"
      >
        {invitedEmails.length > 0 ? "Finish" : "Skip for now"}
      </button>
    </div>
  );
}
