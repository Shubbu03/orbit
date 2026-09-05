"use client";

import { updateSectionInputSchema } from "@orbit/contracts/entities";
import { DotsThreeIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { z } from "zod";

import { boardKeys } from "@/features/boards/api/boards";
import { OrbitApiError } from "@/lib/api/error";

import { deleteSection, updateSection } from "../api/sections";

export function SectionSettingsDialog({
  boardId,
  sectionId,
  title,
}: {
  boardId: string;
  sectionId: string;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const headingId = useId();
  const inputId = useId();
  const [titleError, setTitleError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (nextTitle: string) =>
      updateSection(sectionId, { title: nextTitle }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
      dialogRef.current?.close();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteSection(sectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: boardKeys.detail(boardId),
      });
      dialogRef.current?.close();
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateSectionInputSchema.safeParse({
      title: new FormData(event.currentTarget).get("title"),
    });

    if (!parsed.success) {
      setTitleError(
        z.flattenError(parsed.error).fieldErrors.title?.[0] ?? null,
      );
      return;
    }

    setTitleError(null);
    updateMutation.mutate(parsed.data.title, {
      onError: (error) => {
        if (error instanceof OrbitApiError) {
          setTitleError(error.fields?.title?.[0] ?? null);
        }
      },
    });
  }

  const pending = updateMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <button
        aria-label={`Settings for ${title}`}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <DotsThreeIcon aria-hidden className="size-5" weight="bold" />
      </button>

      <dialog
        aria-labelledby={headingId}
        className="m-auto w-[min(92vw,30rem)] rounded-xl border border-border bg-surface-raised p-0 text-foreground shadow-panel backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px]"
        onCancel={(event) => pending && event.preventDefault()}
        onClose={() => {
          setConfirmingDelete(false);
          setTitleError(null);
          updateMutation.reset();
          deleteMutation.reset();
        }}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold" id={headingId}>
              Section settings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rename this stage or remove it.
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            disabled={pending}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <XIcon aria-hidden className="size-4" weight="bold" />
          </button>
        </div>

        <form className="grid gap-4 p-6" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold" htmlFor={inputId}>
              Section name
            </label>
            <input
              aria-invalid={Boolean(titleError)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              defaultValue={title}
              disabled={pending}
              id={inputId}
              maxLength={100}
              name="title"
            />
            {titleError ? (
              <p className="mt-1.5 text-xs text-destructive" role="alert">
                {titleError}
              </p>
            ) : null}
          </div>
          {updateMutation.isError && !titleError ? (
            <p className="text-sm text-destructive" role="alert">
              {updateMutation.error.message}
            </p>
          ) : null}
          <button
            className="h-11 justify-self-end rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {updateMutation.isPending ? "Saving…" : "Save name"}
          </button>
        </form>

        <div className="border-t border-border p-6">
          <h3 className="text-sm font-semibold">Delete section</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Every issue and comment in this section will also be deleted.
          </p>
          {confirmingDelete ? (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold">Delete this section?</p>
              {deleteMutation.isError ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {deleteMutation.error.message}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="h-10 rounded-lg border border-border px-4 text-sm font-semibold"
                  disabled={pending}
                  onClick={() => setConfirmingDelete(false)}
                  type="button"
                >
                  Keep section
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-white disabled:opacity-60"
                  disabled={pending}
                  onClick={() => deleteMutation.mutate()}
                  type="button"
                >
                  <TrashIcon aria-hidden className="size-4" weight="bold" />
                  {deleteMutation.isPending ? "Deleting…" : "Delete section"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmingDelete(true)}
              type="button"
            >
              <TrashIcon aria-hidden className="size-4" weight="bold" />
              Delete section
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
