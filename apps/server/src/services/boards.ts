import type { DatabaseConnection } from "@orbit/db";
import { boards, membership } from "@orbit/db/schema";
import { and, desc, eq, exists } from "drizzle-orm";

export type CreateBoardInput = {
  organisationId: string;
  title: string;
  userId: string;
};

export type ListUserBoardsInput = {
  userId: string;
};

export type UpdateBoardInput = {
  boardId: string;
  title: string;
  userId: string;
};

export type DeleteBoardInput = {
  boardId: string;
  userId: string;
};

export function createBoardService(database: DatabaseConnection) {
  return {
    create: async (input: CreateBoardInput) => {
      return database.database.transaction(async (transaction) => {
        const [acceptedAdminMembership] = await transaction
          .select({ id: membership.id })
          .from(membership)
          .where(
            and(
              eq(membership.organisationId, input.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
              eq(membership.role, "admin"),
            ),
          )
          .limit(1)
          .for("update");

        if (!acceptedAdminMembership) {
          return null;
        }

        const [createdBoard] = await transaction
          .insert(boards)
          .values({
            id: crypto.randomUUID(),
            organisationId: input.organisationId,
            title: input.title,
          })
          .returning();

        if (!createdBoard) {
          throw new Error("Board insert did not return a row");
        }

        return createdBoard;
      });
    },

    listForUser: async (input: ListUserBoardsInput) => {
      return database.database
        .select({
          createdAt: boards.createdAt,
          id: boards.id,
          organisationId: boards.organisationId,
          role: membership.role,
          title: boards.title,
          updatedAt: boards.updatedAt,
        })
        .from(boards)
        .innerJoin(
          membership,
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
          ),
        )
        .orderBy(desc(boards.createdAt), desc(boards.id));
    },

    update: async (input: UpdateBoardInput) => {
      const acceptedAdminMembership = database.database
        .select({ id: membership.id })
        .from(membership)
        .where(
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
            eq(membership.role, "admin"),
          ),
        );

      const [updatedBoard] = await database.database
        .update(boards)
        .set({ title: input.title })
        .where(
          and(eq(boards.id, input.boardId), exists(acceptedAdminMembership)),
        )
        .returning();

      return updatedBoard ?? null;
    },

    deleteBoard: async (input: DeleteBoardInput) => {
      const acceptedAdminMembership = database.database
        .select({ id: membership.id })
        .from(membership)
        .where(
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
            eq(membership.role, "admin"),
          ),
        );

      const [deletedBoard] = await database.database
        .delete(boards)
        .where(
          and(eq(boards.id, input.boardId), exists(acceptedAdminMembership)),
        )
        .returning({ id: boards.id });

      return deletedBoard ?? null;
    },
  };
}

export type BoardService = ReturnType<typeof createBoardService>;
