import type { BoardConnectionManager } from "./connections";
import type { PublishedBoardEvent } from "./protocol";

type LocalBoardEventTarget = BoardConnectionManager & {
  publish: (event: PublishedBoardEvent) => void;
};

export function createLocalBoardEventDispatcher(target: LocalBoardEventTarget) {
  return {
    publish(event: PublishedBoardEvent) {
      target.publish(event);

      if (event.type === "member.removed") {
        target.disconnectUser({
          boardIds: [event.boardId],
          userId: event.userId,
        });
      }

      if (event.type === "board.deleted") {
        target.closeBoard(event.boardId);
      }
    },
  };
}
