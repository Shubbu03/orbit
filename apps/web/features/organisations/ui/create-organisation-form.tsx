"use client";

import {
  createOrganisationInputSchema,
  type CreateOrganisationInput,
  type OrganisationRecord,
} from "@orbit/contracts/entities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { z } from "zod";

import { OrbitApiError } from "@/lib/api/error";

import { createOrganisation, organisationKeys } from "../api/organisations";

type FieldErrors = Partial<
  Record<keyof CreateOrganisationInput, string[] | undefined>
>;

export function CreateOrganisationForm({
  onCancel,
  onCreated,
  submitLabel = "Create organization",
}: {
  onCancel?: () => void;
  onCreated: (organisation: OrganisationRecord) => void;
  submitLabel?: string;
}) {
  const queryClient = useQueryClient();
  const fieldId = useId();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const nameId = `${fieldId}-organization-name`;
  const nameErrorId = `${nameId}-error`;
  const descriptionId = `${fieldId}-organization-description`;
  const descriptionErrorId = `${descriptionId}-error`;

  const createMutation = useMutation({
    mutationFn: createOrganisation,
    onSuccess: (response) => {
      onCreated(response.organization);
      void queryClient.invalidateQueries({ queryKey: organisationKeys.all });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsedInput = createOrganisationInputSchema.safeParse({
      description: formData.get("description"),
      name: formData.get("name"),
    });

    if (!parsedInput.success) {
      setFieldErrors(z.flattenError(parsedInput.error).fieldErrors);
      return;
    }

    setFieldErrors({});
    createMutation.mutate(parsedInput.data, {
      onError: (error) => {
        if (error instanceof OrbitApiError && error.fields) {
          setFieldErrors(error.fields);
        }
      },
    });
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-semibold" htmlFor={nameId}>
          Name
        </label>
        <input
          aria-describedby={fieldErrors.name ? nameErrorId : undefined}
          aria-invalid={Boolean(fieldErrors.name)}
          autoComplete="organization"
          autoFocus
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20"
          id={nameId}
          maxLength={100}
          name="name"
          placeholder="Acme product team"
        />
        {fieldErrors.name?.[0] ? (
          <p className="mt-1.5 text-xs text-destructive" id={nameErrorId}>
            {fieldErrors.name[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className="text-sm font-semibold" htmlFor={descriptionId}>
          Description
        </label>
        <textarea
          aria-describedby={
            fieldErrors.description ? descriptionErrorId : undefined
          }
          aria-invalid={Boolean(fieldErrors.description)}
          className="mt-2 min-h-28 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20"
          id={descriptionId}
          maxLength={500}
          name="description"
          placeholder="What does this team work on?"
        />
        {fieldErrors.description?.[0] ? (
          <p
            className="mt-1.5 text-xs text-destructive"
            id={descriptionErrorId}
          >
            {fieldErrors.description[0]}
          </p>
        ) : null}
      </div>

      {createMutation.isError ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
          role="alert"
        >
          {createMutation.error.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <button
            className="h-11 rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            disabled={createMutation.isPending}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
        <button
          className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
          disabled={createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending ? "Creating…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
