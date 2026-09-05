import type { BoardDetails } from "@orbit/contracts/entities";

export type BoardMove =
  | { type: "issue"; issueId: string; sectionId: string; position: number }
  | { type: "section"; sectionId: string; position: number };

export function applyBoardMove(
  board: BoardDetails,
  move: BoardMove,
): BoardDetails {
  if (move.type === "section") {
    const section = board.sections.find((item) => item.id === move.sectionId);
    if (!section) return board;
    const sections = board.sections.filter((item) => item.id !== section.id);
    sections.splice(Math.min(move.position, sections.length), 0, section);
    return {
      ...board,
      sections: sections.map((item, position) => ({ ...item, position })),
    };
  }

  const source = board.sections.find((section) =>
    section.issues.some((issue) => issue.id === move.issueId),
  );
  const issue = source?.issues.find((item) => item.id === move.issueId);
  if (
    !issue ||
    !board.sections.some((section) => section.id === move.sectionId)
  )
    return board;

  return {
    ...board,
    sections: board.sections.map((section) => {
      if (section.id !== source?.id && section.id !== move.sectionId)
        return section;
      const issues = section.issues.filter((item) => item.id !== issue.id);
      if (section.id === move.sectionId) {
        issues.splice(Math.min(move.position, issues.length), 0, {
          ...issue,
          sectionId: section.id,
        });
      }
      return {
        ...section,
        issues: issues.map((item, position) => ({ ...item, position })),
      };
    }),
  };
}

export type MoveQueueState = { pending: BoardMove[]; error: string | null };

// Keep requests in gesture order, while every gesture is visible immediately.
// A failed request removes only that move; later gestures are replayed on the
// confirmed board instead of rolling the whole board back to an old snapshot.
export class BoardMoveQueue {
  private state: MoveQueueState = { pending: [], error: null };
  private running = false;

  constructor(
    private readonly callbacks: {
      persist: (move: BoardMove) => Promise<unknown>;
      commit: (move: BoardMove) => void;
      changed: (state: MoveQueueState) => void;
      settled: () => void;
    },
  ) {}

  enqueue(move: BoardMove) {
    this.state = { pending: [...this.state.pending, move], error: null };
    this.callbacks.changed(this.state);
    void this.drain();
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    while (this.state.pending.length > 0) {
      const move = this.state.pending[0]!;
      try {
        await this.callbacks.persist(move);
        this.callbacks.commit(move);
      } catch (error) {
        this.state = {
          ...this.state,
          error:
            error instanceof Error
              ? error.message
              : "The move could not be saved. Try again.",
        };
      }
      this.state = { ...this.state, pending: this.state.pending.slice(1) };
      this.callbacks.changed(this.state);
    }
    this.running = false;
    this.callbacks.settled();
  }
}
