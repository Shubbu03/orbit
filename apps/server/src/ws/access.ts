import type { DatabaseConnection } from "@orbit/db";
import { boards, membership, user } from "@orbit/db/schema";
import { and, eq } from "drizzle-orm";

import type { PresenceUser } from "./protocol";

type GetBoardParticipantInput = {
  boardId: string;
  userId: string;
};

export function createBoardWebSocketAccess(database: DatabaseConnection) {
  return {
    getBoardParticipant: async ({
      boardId,
      userId,
    }: GetBoardParticipantInput): Promise<PresenceUser | null> => {
      const [participant] = await database.database
        .select({
          id: user.id,
          image: user.image,
          name: user.name,
        })
        .from(boards)
        .innerJoin(
          membership,
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, userId),
            eq(membership.accepted, true),
          ),
        )
        .innerJoin(user, eq(user.id, membership.userId))
        .where(eq(boards.id, boardId))
        .limit(1);

      return participant ?? null;
    },
  };
}

export type BoardWebSocketAccess = ReturnType<
  typeof createBoardWebSocketAccess
>;
