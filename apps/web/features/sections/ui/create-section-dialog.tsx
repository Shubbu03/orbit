"use client";

import {
  createSectionInputSchema,
  type CreateSectionInput,
} from "@orbit/contracts/entities";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { z } from "zod";

import { boardKeys } from "@/features/boards/api/boards";
import { OrbitApiError } from "@/lib/api/error";

import { createSection } from "../api/sections";

type FieldErrors = Partial<
  Record<keyof CreateSectionInput, string[] | undefined>
>;

export function CreateSectionDialog({ boardId }: { boardId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();
  const headingId = useId();
  const titleId = `${useId()}-section-title`;
  const titleErrorId = `${titleId}-error`;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const createMutation = useMutation({
    mutationFn: createSection,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
      dialogRef.current?.close();
    },
  });

  function openDialog() {
    createMutation.reset();
    setFieldErrors({});
    formRef.current?.reset();
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!createMutation.isPending) {
      dialogRef.current?.close();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsedInput = createSectionInputSchema.safeParse({
      boardId,
      title: formData.get("title"),
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
    <>
      <button
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-hard transition hover:-translate-y-0.5 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={openDialog}
        type="button"
      >
        <PlusIcon aria-hidden className="size-4" weight="bold" />
        New section
      </button>

      <dialog
        aria-labelledby={headingId}
        className="m-auto w-[min(92vw,30rem)] rounded-3xl border border-border bg-surface-raised p-0 text-foreground shadow-panel backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px]"
        onCancel={(event) => {
          if (createMutation.isPending) {
            event.preventDefault();
          }
        }}
        onClose={() => {
          createMutation.reset();
          setFieldErrors({});
          formRef.current?.reset();
        }}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5 sm:px-7">
          <div>
            <h2
              className="text-xl font-semibold tracking-[-0.03em]"
              id={headingId}
            >
              Create section
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the next stage to this board.
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
            disabled={createMutation.isPending}
            onClick={closeDialog}
            type="button"
          >
            <XIcon aria-hidden className="size-4" weight="bold" />
          </button>
        </div>

        <form
          className="grid gap-5 p-6 sm:p-7"
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <div>
            <label className="text-sm font-semibold" htmlFor={titleId}>
              Section name
            </label>
            <input
              aria-describedby={fieldErrors.title ? titleErrorId : undefined}
              aria-invalid={Boolean(fieldErrors.title)}
              autoFocus
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/20"
              id={titleId}
              maxLength={100}
              name="title"
              placeholder="In progress"
            />
            {fieldErrors.title?.[0] ? (
              <p className="mt-1.5 text-xs text-destructive" id={titleErrorId}>
                {fieldErrors.title[0]}
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

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-11 rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              disabled={createMutation.isPending}
              onClick={closeDialog}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
              disabled={createMutation.isPending}
              type="submit"
            >
              {createMutation.isPending ? "Creating…" : "Create section"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
