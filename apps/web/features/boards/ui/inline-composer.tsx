"use client";

import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";

export function InlineComposer({
  label,
  placeholder,
  maxLength,
  onCreate,
  className = "",
}: {
  label: string;
  placeholder: string;
  maxLength: number;
  onCreate: (title: string) => Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  function close() {
    if (pending) return;
    setOpen(false);
    setTitle("");
    setError(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !title.trim()) return;
    setPending(true);
    setError(null);
    try {
      await onCreate(title.trim());
      setTitle("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save. Try again.",
      );
    } finally {
      setPending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <div className={className}>
      {open ? (
        <form
          className="grid gap-2 rounded-xl bg-surface p-2"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <label className="sr-only" htmlFor={id}>
            {placeholder}
          </label>
          <textarea
            autoFocus
            className="min-h-20 w-full resize-none rounded-lg border border-ring bg-surface-raised px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
            disabled={pending}
            id={id}
            maxLength={maxLength}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
              }
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={placeholder}
            ref={inputRef}
            value={title}
          />
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-1">
            <button
              className="h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              disabled={pending || !title.trim()}
              type="submit"
            >
              {pending ? "Adding…" : label}
            </button>
            <button
              aria-label="Cancel"
              className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              disabled={pending}
              onClick={close}
              type="button"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </form>
      ) : (
        <button
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setOpen(true)}
          ref={triggerRef}
          type="button"
        >
          <PlusIcon aria-hidden className="size-4" />
          {label}
        </button>
      )}
    </div>
  );
}
