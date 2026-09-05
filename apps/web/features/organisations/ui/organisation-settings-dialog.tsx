"use client";

import { GearSixIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";

import { boardKeys } from "@/features/boards/api/boards";

import { deleteOrganisation, organisationKeys } from "../api/organisations";

export function OrganisationSettingsDialog({
  organisationId,
  organisationName,
  onDeleted,
}: {
  organisationId: string;
  organisationName: string;
  onDeleted: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queryClient = useQueryClient();
  const headingId = useId();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganisation(organisationId),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: organisationKeys.detail(organisationId),
      });
      void queryClient.invalidateQueries({ queryKey: boardKeys.allList });
      queryClient.removeQueries({ queryKey: boardKeys.list(organisationId) });
      void queryClient.invalidateQueries({ queryKey: organisationKeys.all });
      onDeleted();
    },
  });

  return (
    <>
      <button
        aria-label="Organization settings"
        className="grid size-11 place-items-center rounded-full border border-border bg-surface-raised text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <GearSixIcon aria-hidden className="size-5" weight="bold" />
      </button>

      <dialog
        aria-labelledby={headingId}
        className="m-auto w-[min(92vw,32rem)] rounded-xl border border-border bg-surface-raised p-0 text-foreground shadow-panel backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px]"
        onCancel={(event) => deleteMutation.isPending && event.preventDefault()}
        onClose={() => {
          setConfirmingDelete(false);
          deleteMutation.reset();
        }}
        ref={dialogRef}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold" id={headingId}>
              Organization settings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage {organisationName}.
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            disabled={deleteMutation.isPending}
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            <XIcon aria-hidden className="size-4" weight="bold" />
          </button>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-semibold">Delete organization</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This permanently deletes its boards, sections, issues, comments,
            invitations, and memberships.
          </p>
          {confirmingDelete ? (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold">
                Delete {organisationName}?
              </p>
              {deleteMutation.isError ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {deleteMutation.error.message}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="h-10 rounded-lg border border-border px-4 text-sm font-semibold"
                  disabled={deleteMutation.isPending}
                  onClick={() => setConfirmingDelete(false)}
                  type="button"
                >
                  Keep organization
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-destructive px-4 text-sm font-bold text-white disabled:opacity-60"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                  type="button"
                >
                  <TrashIcon aria-hidden className="size-4" weight="bold" />
                  {deleteMutation.isPending
                    ? "Deleting…"
                    : "Delete organization"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmingDelete(true)}
              type="button"
            >
              <TrashIcon aria-hidden className="size-4" weight="bold" />
              Delete organization
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
