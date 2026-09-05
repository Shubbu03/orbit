"use client";

import type { BoardResponse } from "@orbit/contracts/entities";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { moveIssue } from "@/features/issues/api/issues";
import { moveSection } from "@/features/sections/api/sections";
import { boardKeys } from "../api/boards";
import {
  applyBoardMove,
  BoardMoveQueue,
  type BoardMove,
  type MoveQueueState,
} from "../model/board-moves";

export function useBoardMoves(boardId: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<MoveQueueState>({
    pending: [],
    error: null,
  });
  const [queue] = useState(
    () =>
      new BoardMoveQueue({
        persist: (move) =>
          move.type === "issue"
            ? moveIssue(move.issueId, {
                sectionId: move.sectionId,
                position: move.position,
              })
            : moveSection(move.sectionId, { position: move.position }),
        commit: (move) => {
          queryClient.setQueryData<BoardResponse>(
            boardKeys.detail(boardId),
            (current) =>
              current
                ? { board: applyBoardMove(current.board, move) }
                : current,
          );
        },
        changed: setState,
        settled: () => {
          void queryClient.invalidateQueries({
            queryKey: boardKeys.detail(boardId),
            refetchType: "none",
          });
        },
      }),
  );

  function enqueue(move: BoardMove) {
    void queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
    queue.enqueue(move);
  }

  return { ...state, enqueue, isSaving: state.pending.length > 0 };
}
