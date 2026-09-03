import { notFound } from "next/navigation";
import { z } from "zod";

import { BoardWorkspacePage } from "@/features/boards/ui/board-workspace-page";

export default async function BoardRoute({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const parsedBoardId = z.uuid().safeParse(boardId);

  if (!parsedBoardId.success) {
    notFound();
  }

  return <BoardWorkspacePage boardId={parsedBoardId.data} />;
}
