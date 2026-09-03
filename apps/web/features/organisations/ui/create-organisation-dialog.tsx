"use client";

import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { CreateOrganisationForm } from "./create-organisation-form";

export function CreateOrganisationDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);

  function openDialog() {
    setFormKey((currentKey) => currentKey + 1);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleCreated() {
    closeDialog();
  }

  return (
    <>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-hard transition hover:-translate-y-0.5 hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={openDialog}
        type="button"
      >
        <PlusIcon aria-hidden className="size-4" weight="bold" />
        New organization
      </button>

      <dialog
        aria-labelledby="create-organization-title"
        className="m-auto w-[min(92vw,32rem)] rounded-3xl border border-border bg-surface-raised p-0 text-foreground shadow-panel backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px]"
        ref={dialogRef}
      >
        <div className="flex items-start justify-between border-b border-border px-6 py-5 sm:px-7">
          <div>
            <h2
              className="text-xl font-semibold tracking-[-0.03em]"
              id="create-organization-title"
            >
              Create organization
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a workspace for your team.
            </p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={closeDialog}
            type="button"
          >
            <XIcon aria-hidden className="size-4" weight="bold" />
          </button>
        </div>

        <div className="p-6 sm:p-7">
          <CreateOrganisationForm
            key={formKey}
            onCancel={closeDialog}
            onCreated={handleCreated}
          />
        </div>
      </dialog>
    </>
  );
}
