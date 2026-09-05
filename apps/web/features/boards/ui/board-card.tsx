import type { Board } from "@orbit/contracts/entities";
import { ArrowUpRightIcon, KanbanIcon } from "@phosphor-icons/react";
import Link from "next/link";

export function BoardCard({ board }: { board: Board }) {
  return (
    <Link
      className="group flex min-h-36 flex-col justify-between gap-6 rounded-xl border border-border bg-surface-raised p-4 transition-colors hover:border-ring hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      href={`/dashboard/boards/${board.id}`}
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <KanbanIcon aria-hidden className="size-5" weight="duotone" />
        <ArrowUpRightIcon
          aria-hidden
          className="size-4 opacity-50 group-hover:opacity-100"
        />
      </div>
      <h2 className="break-words text-base font-semibold tracking-tight">
        {board.title}
      </h2>
    </Link>
  );
}
