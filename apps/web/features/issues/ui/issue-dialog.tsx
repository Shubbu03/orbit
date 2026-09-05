"use client";

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { IssueDetailsPage } from "./issue-details-page";

export function IssueDialog({
  boardId,
  boardIsSaving,
  issueId,
  onClose,
}: {
  boardId: string;
  boardIsSaving: boolean;
  issueId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      aria-label="Card details"
      className="issue-dialog m-auto max-h-[92dvh] w-[min(96vw,64rem)] overflow-y-auto rounded-xl border border-border bg-surface-raised p-0 text-foreground shadow-panel backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
      ref={ref}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-raised px-4 py-2">
        <span className="text-sm font-semibold text-muted-foreground">
          Card details
        </span>
        <button
          aria-label="Close card"
          autoFocus
          className="grid size-10 place-items-center rounded-lg hover:bg-muted"
          onClick={onClose}
          type="button"
        >
          <XIcon aria-hidden className="size-5" />
        </button>
      </div>
      <IssueDetailsPage
        boardId={boardId}
        boardIsSaving={boardIsSaving}
        issueId={issueId}
        onClose={onClose}
      />
    </dialog>
  );
}
