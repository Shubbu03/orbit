import type { Board } from "@orbit/contracts/entities";
import { ArrowRightIcon, KanbanIcon } from "@phosphor-icons/react";
import Link from "next/link";

export function BoardCard({ board }: { board: Board }) {
  return (
    <Link
      className="group flex min-h-44 flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-hard transition hover:-translate-y-0.5 hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-6"
      href={`/dashboard/boards/${board.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <KanbanIcon aria-hidden className="size-5" weight="duotone" />
        </span>
        <span className="rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[9px] font-semibold text-muted-foreground">
          {board.role === "admin" ? "Admin" : "Member"}
        </span>
      </div>
      <h2 className="mt-6 text-xl font-semibold tracking-[-0.03em]">
        {board.title}
      </h2>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-muted-foreground transition group-hover:text-foreground">
        Open board
        <ArrowRightIcon
          aria-hidden
          className="size-4 transition group-hover:translate-x-0.5"
          weight="bold"
        />
      </span>
    </Link>
  );
}
